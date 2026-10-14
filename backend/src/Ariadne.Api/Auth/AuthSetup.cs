using Ariadne.Api.Domain;
using Ariadne.Api.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;

namespace Ariadne.Api.Auth;

internal static class AuthSetup
{
    public const string CookieName = "ariadne.auth";

    public static IServiceCollection AddAriadneAuth(this IServiceCollection services, IHostEnvironment env)
    {
        services.AddIdentityCore<AppUser>(options =>
            {
                options.User.RequireUniqueEmail = true;
                options.User.AllowedUserNameCharacters = ""; // nama pengguna = email, jadi semua karakter email boleh

                // Panjang lebih penting daripada aturan huruf/angka/simbol (rekomendasi NIST)
                options.Password.RequiredLength = 12;
                options.Password.RequireDigit = false;
                options.Password.RequireLowercase = false;
                options.Password.RequireUppercase = false;
                options.Password.RequireNonAlphanumeric = false;

                // Tahan tebakan password: 5 kali salah mengunci akun 15 menit (pedoman B10)
                options.Lockout.AllowedForNewUsers = true;
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
            })
            .AddEntityFrameworkStores<AppDbContext>()
            .AddSignInManager()
            .AddDefaultTokenProviders();

        // Token reset password dan "pilih password" berlaku 24 jam dan hanya sekali pakai
        // (setelah password berubah, security stamp berubah sehingga token lama tidak berlaku).
        services.Configure<DataProtectionTokenProviderOptions>(options => options.TokenLifespan = TimeSpan.FromHours(24));

        // Dengan interval nol, perubahan password, penonaktifan akun, dan "keluar dari semua perangkat"
        // berlaku pada permintaan berikutnya, bukan menunggu 30 menit.
        services.Configure<SecurityStampValidatorOptions>(options => options.ValidationInterval = TimeSpan.Zero);

        services.AddAuthentication(IdentityConstants.ApplicationScheme).AddIdentityCookies();

        services.ConfigureApplicationCookie(options =>
        {
            // Cookie tidak bisa dibaca JavaScript dan tidak dikirim dari situs lain (pedoman B7, H2).
            options.Cookie.Name = CookieName;
            options.Cookie.HttpOnly = true;
            options.Cookie.SameSite = SameSiteMode.Strict;
            options.Cookie.SecurePolicy = env.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
            options.ExpireTimeSpan = TimeSpan.FromDays(14); // berlaku bila "Ingat saya" dicentang
            options.SlidingExpiration = true;

            // Ini API untuk SPA: jawab 401/403, jangan redirect ke halaman login.
            options.Events.OnRedirectToLogin = context =>
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return Task.CompletedTask;
            };
            options.Events.OnRedirectToAccessDenied = context =>
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                return Task.CompletedTask;
            };
        });

        // Semua endpoint wajib login kecuali yang sengaja ditandai AllowAnonymous (pedoman B3).
        services.AddAuthorizationBuilder()
            .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());

        services.AddScoped<AccessService>();
        return services;
    }
}
