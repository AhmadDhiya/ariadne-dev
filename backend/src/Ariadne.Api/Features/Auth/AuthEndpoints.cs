using Ariadne.Api.Auth;
using Ariadne.Api.Domain;
using Ariadne.Api.Infrastructure.Clock;
using Ariadne.Api.Infrastructure.Data;
using Ariadne.Api.Infrastructure.Email;
using Ariadne.Api.Infrastructure.Web;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Ariadne.Api.Features.Auth;

internal static class AuthEndpoints
{
    // Pesan yang SAMA untuk semua kegagalan login, supaya tidak membocorkan email mana yang terdaftar (pedoman B9)
    private const string LoginFailed = "Email atau password salah.";

    private const string InvalidLink = "Tautan tidak valid atau sudah kedaluwarsa. Minta tautan baru lewat \"Lupa password?\".";

    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var auth = app.MapGroup("/api/auth");
        auth.MapPost("/login", Login).AllowAnonymous().RequireRateLimiting(RateLimiting.AuthPolicy);
        auth.MapPost("/forgot-password", ForgotPassword).AllowAnonymous().RequireRateLimiting(RateLimiting.AuthPolicy);
        auth.MapPost("/reset-password", ResetPassword).AllowAnonymous().RequireRateLimiting(RateLimiting.AuthPolicy);
        auth.MapPost("/logout", Logout);
        auth.MapGet("/me", GetMe);

        var me = app.MapGroup("/api/me");
        me.MapPatch("", UpdateMe);
        me.MapPost("/change-password", ChangePassword).RequireRateLimiting(RateLimiting.AuthPolicy);
        return app;
    }

    private static async Task<IResult> Login(
        LoginRequest request,
        UserManager<AppUser> users,
        SignInManager<AppUser> signIn,
        AccessService accessService,
        AppDbContext db,
        CancellationToken ct)
    {
        var email = request.Email?.Trim() ?? "";
        var password = request.Password ?? "";
        var user = email.Length > 0 ? await users.FindByEmailAsync(email) : null;

        if (user is not { IsActive: true })
        {
            // Hitung hash palsu supaya lamanya sama dengan login email yang terdaftar (timing, pedoman B9)
            _ = users.PasswordHasher.HashPassword(new AppUser(), password);
            return Results.Problem(title: LoginFailed, statusCode: StatusCodes.Status401Unauthorized);
        }

        // lockoutOnFailure: gagal berulang mengunci akun; saat terkunci, password benar pun ditolak
        var result = await signIn.PasswordSignInAsync(user, password, request.RememberMe, lockoutOnFailure: true);
        if (!result.Succeeded)
        {
            return Results.Problem(title: LoginFailed, statusCode: StatusCodes.Status401Unauthorized);
        }

        // Cookie baru belum terpasang di HttpContext.User pada permintaan ini, jadi hak dibaca dari pengguna yang baru login
        var access = await accessService.CurrentAsync(SignedInPrincipal(user), ct);
        return Results.Ok(await BuildMeAsync(user, access, db, ct));
    }

    private static async Task<IResult> Logout(SignInManager<AppUser> signIn)
    {
        await signIn.SignOutAsync();
        return Results.NoContent();
    }

    private static async Task<IResult> GetMe(
        HttpContext http,
        AccessService accessService,
        UserManager<AppUser> users,
        AppDbContext db,
        CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var user = await users.FindByIdAsync(access.UserId.ToString()) ?? throw new NotFoundException();
        return Results.Ok(await BuildMeAsync(user, access, db, ct));
    }

    private static async Task<IResult> ForgotPassword(
        ForgotPasswordRequest request,
        UserManager<AppUser> users,
        IEmailOutbox outbox,
        IConfiguration config)
    {
        var email = request.Email?.Trim() ?? "";
        var user = email.Length > 0 ? await users.FindByEmailAsync(email) : null;
        if (user is { IsActive: true })
        {
            var token = await users.GeneratePasswordResetTokenAsync(user);
            var link = AuthEmails.ResetLink(BaseUrl(config), user.Email!, token);
            outbox.Enqueue(AuthEmails.ResetPassword(user.Email!, user.DisplayName, link));
        }

        // Jawaban sama persis, ada atau tidaknya akun itu
        return Results.Accepted(value: new MessageResponse("Jika email itu terdaftar, tautan untuk mengatur ulang password sudah dikirim."));
    }

    private static async Task<IResult> ResetPassword(ResetPasswordRequest request, UserManager<AppUser> users)
    {
        var email = request.Email?.Trim() ?? "";
        var token = request.Token ?? "";
        var newPassword = request.NewPassword ?? "";
        var user = email.Length > 0 ? await users.FindByEmailAsync(email) : null;

        if (user is not { IsActive: true } || token.Length == 0)
        {
            _ = users.PasswordHasher.HashPassword(new AppUser(), newPassword);
            return Results.Problem(title: InvalidLink, statusCode: StatusCodes.Status400BadRequest);
        }

        var result = await users.ResetPasswordAsync(user, token, newPassword);
        if (!result.Succeeded)
        {
            if (result.Errors.Any(e => e.Code == "InvalidToken"))
            {
                return Results.Problem(title: InvalidLink, statusCode: StatusCodes.Status400BadRequest);
            }

            result.ThrowIfFailed("newPassword"); // aturan password tidak terpenuhi
        }

        // Membuktikan pemilik email: buka kunci akun dan hapus hitungan gagal login
        await users.SetLockoutEndDateAsync(user, null);
        await users.ResetAccessFailedCountAsync(user);
        return Results.NoContent();
    }

    private static async Task<IResult> UpdateMe(
        UpdateMeRequest request,
        HttpContext http,
        AccessService accessService,
        UserManager<AppUser> users,
        AppDbContext db,
        CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var user = await users.FindByIdAsync(access.UserId.ToString()) ?? throw new NotFoundException();

        if (request.DisplayName is not null)
        {
            user.DisplayName = Validate.Text("displayName", request.DisplayName, 100, "Nama");
        }

        if (request.Theme is not null)
        {
            user.Theme = request.Theme switch
            {
                "light" or "dark" => request.Theme,
                "system" => null,
                _ => throw new ValidationFailedException("theme", "Tema harus light, dark, atau system."),
            };
        }

        (await users.UpdateAsync(user)).ThrowIfFailed("displayName");
        return Results.Ok(await BuildMeAsync(user, access, db, ct));
    }

    private static async Task<IResult> ChangePassword(
        ChangePasswordRequest request,
        HttpContext http,
        AccessService accessService,
        UserManager<AppUser> users,
        SignInManager<AppUser> signIn,
        CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var user = await users.FindByIdAsync(access.UserId.ToString()) ?? throw new NotFoundException();

        var result = await users.ChangePasswordAsync(user, request.CurrentPassword ?? "", request.NewPassword ?? "");
        if (!result.Succeeded)
        {
            var field = result.Errors.Any(e => e.Code == "PasswordMismatch") ? "currentPassword" : "newPassword";
            result.ThrowIfFailed(field);
        }

        // Perangkat lain keluar otomatis (security stamp berubah); sesi ini tetap masuk
        await signIn.RefreshSignInAsync(user);
        return Results.NoContent();
    }

    internal static async Task<MeResponse> BuildMeAsync(AppUser user, UserAccess access, AppDbContext db, CancellationToken ct)
    {
        var teamNames = await db.Teams.AsNoTracking()
            .Where(t => access.Teams.Keys.Contains(t.Id))
            .OrderBy(t => t.CreatedAt).ThenBy(t => t.Name)
            .Select(t => new { t.Id, t.Name })
            .ToListAsync(ct);
        var teams = teamNames.Select(t => new TeamRef(t.Id, t.Name, access.Teams[t.Id])).ToList();

        return new MeResponse(
            user.Id,
            user.Email ?? "",
            user.DisplayName,
            access.IsAdmin,
            access.IsSupervisor,
            access.IsGuestOnly,
            user.Theme,
            teams);
    }

    /// <summary>Alamat dasar aplikasi untuk tautan di email (dari konfigurasi, bukan dari header permintaan).</summary>
    private static string BaseUrl(IConfiguration config) =>
        config["App:BaseUrl"] ?? "http://localhost:18080";

    private static System.Security.Claims.ClaimsPrincipal SignedInPrincipal(AppUser user) =>
        new(new System.Security.Claims.ClaimsIdentity(
            [new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.NameIdentifier, user.Id.ToString())],
            "login"));
}
