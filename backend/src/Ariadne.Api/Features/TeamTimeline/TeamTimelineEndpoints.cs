using Ariadne.Api.Auth;
using Ariadne.Api.Domain;
using Ariadne.Api.Infrastructure.Clock;
using Ariadne.Api.Infrastructure.Data;
using Ariadne.Api.Infrastructure.Web;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Ariadne.Api.Features.TeamTimeline;

public sealed record TeamOption(Guid Id, string Name, int MemberCount);

public sealed record ProjectFilterOption(Guid Id, string Name);

public sealed record TeamTask(
    Guid Id,
    string Key,
    string Title,
    WorkStatus Status,
    Priority Priority,
    DateOnly? StartDate,
    DateOnly? DueDate,
    bool IsOverdue,
    Guid RootProjectId,
    IReadOnlyList<string> ProjectPath);

/// <summary>Satu baris orang: beban kerja lintas proyek (tanpa filter) dan task-nya di rentang (sesudah filter).</summary>
public sealed record TeamPerson(Guid UserId, string Name, IReadOnlyList<int> Counts, IReadOnlyList<TeamTask> Tasks);

public sealed record TeamTimelineResponse(
    IReadOnlyList<TeamOption> Teams,
    Guid TeamId,
    string TeamName,
    string Zoom,
    DateOnly Start,
    int DayCount,
    DateOnly Today,
    IReadOnlyList<ProjectFilterOption> Projects,
    IReadOnlyList<TeamPerson> People);

/// <summary>
/// Timeline Tim untuk supervisor: satu baris per anggota tim, dengan task lintas proyek dan heatmap beban kerja.
/// Hanya supervisor tim itu yang boleh membukanya; task dari proyek yang tidak ia ikuti ikut tampil (keputusan 8).
/// </summary>
internal static class TeamTimelineEndpoints
{
    public static IEndpointRouteBuilder MapTeamTimelineEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/team-timeline", Get);
        return app;
    }

    private static async Task<IResult> Get(
        [FromQuery] Guid? teamId,
        [FromQuery] string? zoom,
        [FromQuery] Guid? project,
        [FromQuery] string? status,
        [FromQuery] string? priority,
        [FromQuery] bool? overdueOnly,
        HttpContext http,
        AccessService accessService,
        AppDbContext db,
        IClock clock,
        CancellationToken ct)
    {
        if (!TimelineRange.IsKnown(zoom))
        {
            throw new ValidationFailedException("zoom", "Zoom tidak dikenal (day, week, month).");
        }

        var statuses = ParseList(status, "status", v => Validate.Enum<WorkStatus>("status", v, "Status"));
        var priorities = ParseList(priority, "priority", v => Validate.Enum<Priority>("priority", v, "Prioritas"));

        var access = await accessService.CurrentAsync(http.User, ct);
        var supervised = await db.Teams.AsNoTracking()
            .Where(t => access.SupervisedTeamIds.Contains(t.Id))
            .OrderBy(t => t.Name)
            .Select(t => new TeamOption(t.Id, t.Name, t.Members.Count(m => m.Role == TeamRole.Anggota && m.User!.IsActive)))
            .ToListAsync(ct);

        // Bukan supervisor sama sekali = tidak ada yang bisa dibuka (403); tim tertentu yang bukan miliknya = 404/403 lewat aturan izin
        if (supervised.Count == 0 && teamId is null)
        {
            throw new ForbiddenException();
        }

        var chosen = teamId ?? supervised[0].Id;
        access.EnsureSupervisesTeam(chosen);
        var team = supervised.Single(t => t.Id == chosen);

        var today = clock.Today;
        var (zoomName, start, count) = TimelineRange.For(zoom, today, wide: true);
        var end = start.AddDays(count - 1);

        var members = await db.TeamMembers.AsNoTracking()
            .Where(m => m.TeamId == chosen && m.Role == TeamRole.Anggota && m.User!.IsActive)
            .Select(m => new { m.UserId, m.User!.DisplayName })
            .ToListAsync(ct);
        var memberIds = members.Select(m => m.UserId).ToList();

        var rows = await db.TaskAssignees.AsNoTracking()
            .Where(a => memberIds.Contains(a.UserId) && a.Task!.Status != WorkStatus.Done && a.Task.Project!.ArchivedAt == null)
            .Select(a => new
            {
                a.UserId,
                a.Task!.Id,
                a.Task.Number,
                a.Task.Title,
                a.Task.Status,
                a.Task.Priority,
                a.Task.StartDate,
                a.Task.DueDate,
                a.Task.ProjectId,
                a.Task.RootProjectId,
            })
            .ToListAsync(ct);

        var roots = rows.Select(r => r.RootProjectId).Distinct().ToList();
        var family = (await db.Projects.AsNoTracking().Where(p => roots.Contains(p.RootId)).Select(p => new { p.Id, p.ParentId, p.Name, p.Code }).ToListAsync(ct)).ToDictionary(p => p.Id);

        List<string> PathOf(Guid projectId)
        {
            var path = new List<string>();
            for (Guid? id = projectId; id is { } at && family.TryGetValue(at, out var node); id = node.ParentId)
            {
                path.Insert(0, node.Name);
            }

            return path;
        }

        var projectOptions = roots
            .Select(r => new ProjectFilterOption(r, family[r].Name))
            .OrderBy(p => p.Name, StringComparer.Ordinal)
            .ToList();

        var people = members
            .OrderBy(m => m.DisplayName, StringComparer.Ordinal)
            .Select(m =>
            {
                var mine = rows.Where(r => r.UserId == m.UserId).ToList();
                // Heatmap = seluruh pekerjaan orang itu (tidak ikut tersaring); daftar task = yang lolos filter dan ada di rentang
                var counts = TaskRules.WorkloadPerDay([.. mine.Select(r => (r.StartDate, r.DueDate, r.Status))], start, count);
                var shown = mine
                    .Where(r => (r.StartDate ?? r.DueDate) is { } from && (r.DueDate ?? r.StartDate) is { } to && from <= end && to >= start)
                    .Where(r => project is null || r.RootProjectId == project)
                    .Where(r => statuses.Count == 0 || statuses.Contains(r.Status))
                    .Where(r => priorities.Count == 0 || priorities.Contains(r.Priority))
                    .Where(r => overdueOnly != true || TaskRules.IsOverdue(r.DueDate, r.Status, today))
                    .OrderBy(r => r.StartDate ?? r.DueDate)
                    .ThenBy(r => r.Priority)
                    .ThenBy(r => r.Number)
                    .Select(r => new TeamTask(
                        r.Id,
                        $"{family[r.RootProjectId].Code}-{r.Number}",
                        r.Title,
                        r.Status,
                        r.Priority,
                        r.StartDate,
                        r.DueDate,
                        TaskRules.IsOverdue(r.DueDate, r.Status, today),
                        r.RootProjectId,
                        PathOf(r.ProjectId)))
                    .ToList();
                return new TeamPerson(m.UserId, m.DisplayName, counts, shown);
            })
            .ToList();

        return Results.Ok(new TeamTimelineResponse(supervised, chosen, team.Name, zoomName, start, count, today, projectOptions, people));
    }

    private static List<T> ParseList<T>(string? raw, string field, Func<string, T> parse)
    {
        var parts = (raw ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Distinct().ToList();
        if (parts.Count > 20)
        {
            throw new ValidationFailedException(field, "Terlalu banyak nilai filter.");
        }

        return [.. parts.Select(parse)];
    }
}
