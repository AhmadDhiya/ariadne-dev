using Ariadne.Api.Auth;
using Ariadne.Api.Domain;
using Ariadne.Api.Features.Auth;
using Ariadne.Api.Infrastructure.Clock;
using Ariadne.Api.Infrastructure.Data;
using Ariadne.Api.Infrastructure.Email;
using Ariadne.Api.Infrastructure.Web;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Ariadne.Api.Features.Users;

internal static class UserEndpoints
{
    public static IEndpointRouteBuilder MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var users = app.MapGroup("/api/users");
        users.MapGet("", List);
        users.MapPost("", Create);
        users.MapPatch("/{id:guid}", Update);
        users.MapGet("/lookup", Lookup);
        return app;
    }

    private static async Task<IResult> List(HttpContext http, AccessService accessService, AppDbContext db, CancellationToken ct)
    {
        (await accessService.CurrentAsync(http.User, ct)).EnsureAdmin();

        var users = await db.Users.AsNoTracking().OrderBy(u => u.DisplayName).ToListAsync(ct);
        var teamsByUser = (await db.TeamMembers.AsNoTracking()
                .Select(m => new { m.UserId, m.Team!.Name })
                .ToListAsync(ct))
            .GroupBy(m => m.UserId)
            .ToDictionary(g => g.Key, g => (IReadOnlyList<string>)[.. g.Select(m => m.Name).Order(StringComparer.Ordinal)]);
        var projectRoles = (await db.ProjectMembers.AsNoTracking()
                .Select(m => new { m.UserId, m.Role })
                .ToListAsync(ct))
            .GroupBy(m => m.UserId)
            .ToDictionary(g => g.Key, g => g.Select(m => m.Role).ToList());

        var result = users.Select(u =>
        {
            var teams = teamsByUser.GetValueOrDefault(u.Id) ?? [];
            var roles = projectRoles.GetValueOrDefault(u.Id) ?? [];
            var isGuest = !u.IsAdmin && teams.Count == 0 && roles.Count > 0 && roles.All(r => r == ProjectRole.Tamu);
            return new UserSummary(u.Id, u.Email ?? "", u.DisplayName, u.IsAdmin, u.IsActive, isGuest, u.CreatedAt, teams);
        });
        return Results.Ok(result);
    }

    private static async Task<IResult> Create(
        CreateUserRequest request,
        HttpContext http,
        AccessService accessService,
        UserManager<AppUser> users,
        IClock clock,
        IEmailOutbox outbox,
        IConfiguration config,
        CancellationToken ct)
    {
        (await accessService.CurrentAsync(http.User, ct)).EnsureAdmin();

        var email = Validate.Email("email", request.Email);
        var name = Validate.Text("displayName", request.DisplayName, 100, "Nama");
        var user = new AppUser
        {
            Id = Guid.NewGuid(),
            UserName = email,
            Email = email,
            DisplayName = name,
            IsAdmin = request.IsAdmin,
            IsActive = true,
            CreatedAt = clock.UtcNow,
        };

        // Tanpa password: orangnya memilih sendiri lewat tautan di email (admin tidak pernah tahu passwordnya)
        (await users.CreateAsync(user)).ThrowIfFailed("email");

        var token = await users.GeneratePasswordResetTokenAsync(user);
        var baseUrl = config["App:BaseUrl"] ?? "http://localhost:18080";
        outbox.Enqueue(AuthEmails.Welcome(email, name, AuthEmails.ResetLink(baseUrl, email, token)));

        return Results.Created($"/api/users/{user.Id}", new UserSummary(user.Id, email, name, user.IsAdmin, true, false, user.CreatedAt, []));
    }

    private static async Task<IResult> Update(
        Guid id,
        UpdateUserRequest request,
        HttpContext http,
        AccessService accessService,
        UserManager<AppUser> users,
        AppDbContext db,
        CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        access.EnsureAdmin();
        var user = await users.FindByIdAsync(id.ToString()) ?? throw new NotFoundException();

        var losesAdmin = user.IsAdmin && request.IsAdmin == false;
        var deactivates = user.IsActive && request.IsActive == false;
        // Admin yang bertindak selalu ada, jadi selama tidak mengubah dirinya sendiri, sistem tidak bisa kehabisan admin
        if (id == access.UserId && (losesAdmin || deactivates))
        {
            throw new ValidationFailedException("userId", "Anda tidak bisa mencabut admin atau menonaktifkan akun Anda sendiri.");
        }

        if (request.DisplayName is not null)
        {
            user.DisplayName = Validate.Text("displayName", request.DisplayName, 100, "Nama");
        }

        if (request.IsAdmin is { } isAdmin)
        {
            user.IsAdmin = isAdmin;
        }

        if (request.IsActive is { } isActive)
        {
            user.IsActive = isActive;
        }

        (await users.UpdateAsync(user)).ThrowIfFailed("displayName");

        if (deactivates || losesAdmin)
        {
            // Sesi lama langsung tidak berlaku (hak admin dan status aktif dibaca ulang, cookie lama dicabut)
            await users.UpdateSecurityStampAsync(user);
        }

        return Results.NoContent();
    }

    private static async Task<IResult> Lookup(
        string? q,
        Guid? teamId,
        Guid? projectId,
        HttpContext http,
        AccessService accessService,
        AppDbContext db,
        CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        access.EnsureCanLookupUsers();

        var term = q?.Trim() ?? "";
        if (term.Length == 0)
        {
            return Results.Ok(Array.Empty<UserLookupItem>());
        }

        var pattern = $"%{EscapeLike(term)}%";
        var query = db.Users.AsNoTracking().Where(u =>
            u.IsActive && (EF.Functions.ILike(u.DisplayName, pattern, "\\") || EF.Functions.ILike(u.Email!, pattern, "\\")));

        if (teamId is { } excludeTeam)
        {
            query = query.Where(u => !db.TeamMembers.Any(m => m.TeamId == excludeTeam && m.UserId == u.Id));
        }

        if (projectId is { } excludeProject)
        {
            var rootId = await db.Projects.AsNoTracking().Where(p => p.Id == excludeProject).Select(p => (Guid?)p.RootId).SingleOrDefaultAsync(ct);
            if (rootId is { } root)
            {
                query = query.Where(u => !db.ProjectMembers.Any(m => m.ProjectId == root && m.UserId == u.Id));
            }
        }

        // Tamu murni bukan orang internal: tidak muncul di pencarian untuk tim maupun proyek internal
        var candidates = await query.OrderBy(u => u.DisplayName).Take(30).ToListAsync(ct);
        var ids = candidates.Select(c => c.Id).ToList();
        var teamsOf = (await db.TeamMembers.AsNoTracking()
                .Where(m => ids.Contains(m.UserId))
                .Select(m => new { m.UserId, m.Role, TeamName = m.Team!.Name })
                .ToListAsync(ct))
            .GroupBy(m => m.UserId)
            .ToDictionary(g => g.Key, g => g.OrderBy(m => m.TeamName, StringComparer.Ordinal).First());
        var guestRoles = (await db.ProjectMembers.AsNoTracking()
                .Where(m => ids.Contains(m.UserId))
                .Select(m => new { m.UserId, m.Role })
                .ToListAsync(ct))
            .GroupBy(m => m.UserId)
            .ToDictionary(g => g.Key, g => g.All(m => m.Role == ProjectRole.Tamu));

        var items = candidates
            .Where(u => u.IsAdmin || teamsOf.ContainsKey(u.Id) || !guestRoles.GetValueOrDefault(u.Id))
            .Take(8)
            .Select(u => new UserLookupItem(
                u.Id,
                u.DisplayName,
                u.Email ?? "",
                teamsOf.TryGetValue(u.Id, out var team) ? $"{team.Role} · {team.TeamName}" : null));
        return Results.Ok(items);
    }

    /// <summary>Karakter khusus LIKE dibuat harfiah supaya "%" atau "_" yang diketik pengguna tidak jadi pola.</summary>
    private static string EscapeLike(string value) =>
        value.Replace("\\", "\\\\", StringComparison.Ordinal).Replace("%", "\\%", StringComparison.Ordinal).Replace("_", "\\_", StringComparison.Ordinal);
}
