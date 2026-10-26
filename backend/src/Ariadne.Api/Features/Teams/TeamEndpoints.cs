using Ariadne.Api.Auth;
using Ariadne.Api.Domain;
using Ariadne.Api.Infrastructure.Clock;
using Ariadne.Api.Infrastructure.Data;
using Ariadne.Api.Infrastructure.Web;
using Microsoft.EntityFrameworkCore;

namespace Ariadne.Api.Features.Teams;

internal static class TeamEndpoints
{
    public static IEndpointRouteBuilder MapTeamEndpoints(this IEndpointRouteBuilder app)
    {
        var teams = app.MapGroup("/api/teams");
        teams.MapGet("", List);
        teams.MapPost("", Create);
        teams.MapGet("/{id:guid}", Get);
        teams.MapPatch("/{id:guid}", Rename);
        teams.MapPost("/{id:guid}/members", AddMember);
        teams.MapPatch("/{id:guid}/members/{userId:guid}", ChangeMemberRole);
        teams.MapDelete("/{id:guid}/members/{userId:guid}", RemoveMember);
        return app;
    }

    private static async Task<IResult> List(HttpContext http, AccessService accessService, AppDbContext db, CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        access.EnsureNotGuestOnly();

        var teamsQuery = db.Teams.AsNoTracking();
        if (!access.IsAdmin)
        {
            var visible = access.Teams.Keys.ToList();
            teamsQuery = teamsQuery.Where(t => visible.Contains(t.Id));
        }

        // Urutan dibuat (tim utama biasanya dibuat lebih dulu), bukan abjad
        var teams = await teamsQuery.OrderBy(t => t.CreatedAt).ThenBy(t => t.Name).ToListAsync(ct);
        var ids = teams.Select(t => t.Id).ToList();
        var members = await db.TeamMembers.AsNoTracking()
            .Where(m => ids.Contains(m.TeamId))
            .Select(m => new { m.TeamId, m.Role, m.AddedAt, m.User!.DisplayName })
            .ToListAsync(ct);

        var result = teams.Select(team =>
        {
            var inTeam = members.Where(m => m.TeamId == team.Id).ToList();
            return new TeamSummary(
                team.Id,
                team.Name,
                inTeam.Count,
                [.. inTeam.Where(m => m.Role == TeamRole.Supervisor).Select(m => m.DisplayName).Order(StringComparer.Ordinal)],
                [.. OrderedNames(inTeam.Select(m => (m.Role, m.AddedAt, m.DisplayName)))]);
        });
        return Results.Ok(result);
    }

    private static async Task<IResult> Get(Guid id, HttpContext http, AccessService accessService, AppDbContext db, CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        access.EnsureNotGuestOnly();
        access.EnsureCanViewTeam(id);

        var team = await db.Teams.AsNoTracking().SingleOrDefaultAsync(t => t.Id == id, ct) ?? throw new NotFoundException();
        var members = await db.TeamMembers.AsNoTracking()
            .Where(m => m.TeamId == id)
            .Select(m => new { m.UserId, m.Role, m.AddedAt, m.User!.DisplayName, m.User.Email })
            .ToListAsync(ct);
        var memberIds = members.Select(m => m.UserId).ToList();

        var otherTeams = (await db.TeamMembers.AsNoTracking()
                .Where(m => memberIds.Contains(m.UserId) && m.TeamId != id)
                .Select(m => new { m.UserId, TeamName = m.Team!.Name })
                .ToListAsync(ct))
            .GroupBy(m => m.UserId)
            .ToDictionary(g => g.Key, g => (IReadOnlyList<string>)[.. g.Select(m => m.TeamName).Order(StringComparer.Ordinal)]);

        // Proyek tim = proyek tempat anggota tim bekerja, hanya yang boleh dilihat oleh yang bertanya
        var projectNames = await db.ProjectMembers.AsNoTracking()
            .Where(m => memberIds.Contains(m.UserId) && m.Project!.ArchivedAt == null)
            .Select(m => new { m.ProjectId, m.Project!.Name, m.Project.SortOrder })
            .Distinct()
            .ToListAsync(ct);
        var projects = projectNames
            .Where(p => access.CanViewProject(p.ProjectId))
            .OrderBy(p => p.SortOrder).ThenBy(p => p.Name, StringComparer.Ordinal)
            .Select(p => p.Name)
            .ToList();

        var items = members
            .OrderBy(m => m.Role).ThenBy(m => m.AddedAt).ThenBy(m => m.DisplayName, StringComparer.Ordinal)
            .Select(m => new TeamMemberItem(m.UserId, m.DisplayName, m.Email ?? "", m.Role, otherTeams.GetValueOrDefault(m.UserId) ?? []))
            .ToList();

        return Results.Ok(new TeamDetail(
            team.Id,
            team.Name,
            access.CanManageTeam(id),
            [.. items.Where(m => m.Role == TeamRole.Supervisor).Select(m => m.DisplayName)],
            projects,
            items));
    }

    private static async Task<IResult> Create(CreateTeamRequest request, HttpContext http, AccessService accessService, AppDbContext db, IClock clock, CancellationToken ct)
    {
        (await accessService.CurrentAsync(http.User, ct)).EnsureAdmin();
        var name = Validate.Text("name", request.Name, 100, "Nama tim");

        var team = new Team { Id = Guid.NewGuid(), Name = name, CreatedAt = clock.UtcNow };
        db.Teams.Add(team);
        await db.SaveOrConflictAsync("Nama tim sudah dipakai.", ct);
        return Results.Created($"/api/teams/{team.Id}", new TeamSummary(team.Id, team.Name, 0, [], []));
    }

    private static async Task<IResult> Rename(Guid id, UpdateTeamRequest request, HttpContext http, AccessService accessService, AppDbContext db, CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        access.EnsureCanManageTeam(id);
        var name = Validate.Text("name", request.Name, 100, "Nama tim");

        var team = await db.Teams.SingleOrDefaultAsync(t => t.Id == id, ct) ?? throw new NotFoundException();
        team.Name = name;
        await db.SaveOrConflictAsync("Nama tim sudah dipakai.", ct);
        return Results.NoContent();
    }

    private static async Task<IResult> AddMember(
        Guid id,
        AddTeamMemberRequest request,
        HttpContext http,
        AccessService accessService,
        AppDbContext db,
        IClock clock,
        CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        access.EnsureCanManageTeam(id);
        var role = Validate.Enum<TeamRole>("role", request.Role, "Peran");

        var user = await db.Users.AsNoTracking().SingleOrDefaultAsync(u => u.Id == request.UserId && u.IsActive, ct)
            ?? throw new ValidationFailedException("userId", "Pengguna tidak ditemukan.");
        if (await IsGuestOnlyAsync(user.Id, user.IsAdmin, db, ct))
        {
            throw new ValidationFailedException("userId", "Tamu dari klien tidak bisa masuk tim internal.");
        }

        db.TeamMembers.Add(new TeamMember { TeamId = id, UserId = user.Id, Role = role, AddedAt = clock.UtcNow });
        await db.SaveOrConflictAsync("Orang ini sudah menjadi anggota tim.", ct);
        return Results.NoContent();
    }

    private static async Task<IResult> ChangeMemberRole(
        Guid id,
        Guid userId,
        UpdateTeamMemberRequest request,
        HttpContext http,
        AccessService accessService,
        AppDbContext db,
        CancellationToken ct)
    {
        (await accessService.CurrentAsync(http.User, ct)).EnsureCanManageTeam(id);
        var role = Validate.Enum<TeamRole>("role", request.Role, "Peran");

        var member = await db.TeamMembers.SingleOrDefaultAsync(m => m.TeamId == id && m.UserId == userId, ct) ?? throw new NotFoundException();
        member.Role = role;
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private static async Task<IResult> RemoveMember(Guid id, Guid userId, HttpContext http, AccessService accessService, AppDbContext db, CancellationToken ct)
    {
        (await accessService.CurrentAsync(http.User, ct)).EnsureCanManageTeam(id);

        var member = await db.TeamMembers.SingleOrDefaultAsync(m => m.TeamId == id && m.UserId == userId, ct) ?? throw new NotFoundException();
        db.TeamMembers.Remove(member);
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    /// <summary>Supervisor lebih dulu, lalu urutan ditambahkan, lalu abjad (urutan avatar di daftar tim).</summary>
    private static IEnumerable<string> OrderedNames(IEnumerable<(TeamRole Role, DateTimeOffset AddedAt, string Name)> members) =>
        members.OrderBy(m => m.Role).ThenBy(m => m.AddedAt).ThenBy(m => m.Name, StringComparer.Ordinal).Select(m => m.Name);

    private static async Task<bool> IsGuestOnlyAsync(Guid userId, bool isAdmin, AppDbContext db, CancellationToken ct)
    {
        if (isAdmin || await db.TeamMembers.AnyAsync(m => m.UserId == userId, ct))
        {
            return false;
        }

        var roles = await db.ProjectMembers.AsNoTracking().Where(m => m.UserId == userId).Select(m => m.Role).ToListAsync(ct);
        return roles.Count > 0 && roles.All(r => r == ProjectRole.Tamu);
    }
}
