using Ariadne.Api.Auth;
using Ariadne.Api.Domain;
using Ariadne.Api.Features.Milestones;
using Ariadne.Api.Infrastructure.Clock;
using Ariadne.Api.Infrastructure.Data;
using Ariadne.Api.Infrastructure.Web;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Ariadne.Api.Features.Gantt;

/// <summary>Beban kerja satu orang di proyek ini: jumlah task aktif per hari, mulai dari Start.</summary>
public sealed record GanttPerson(Guid UserId, string Name, IReadOnlyList<int> Counts);

/// <summary>
/// Yang dibutuhkan Gantt proyek di luar daftar task (yang datang dari endpoint task): rentang tanggal sesuai zoom,
/// milestone dalam rentang, dan beban kerja per orang.
/// </summary>
public sealed record GanttResponse(
    string Zoom,
    DateOnly Start,
    int DayCount,
    DateOnly Today,
    IReadOnlyList<MilestoneItem> Milestones,
    IReadOnlyList<GanttPerson> Workload);

internal static class GanttEndpoints
{
    public static IEndpointRouteBuilder MapGanttEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/projects/{id:guid}/gantt", Get);
        return app;
    }

    private static async Task<IResult> Get(Guid id, [FromQuery] string? zoom, HttpContext http, AccessService accessService, AppDbContext db, IClock clock, CancellationToken ct)
    {
        if (!TimelineRange.IsKnown(zoom))
        {
            throw new ValidationFailedException("zoom", "Zoom tidak dikenal (day, week, month).");
        }

        var access = await accessService.CurrentAsync(http.User, ct);
        var project = await db.Projects.AsNoTracking().SingleOrDefaultAsync(p => p.Id == id && p.ArchivedAt == null, ct) ?? throw new NotFoundException();
        access.EnsureCanViewProject(project.RootId);

        var today = clock.Today;
        var (name, start, count) = TimelineRange.For(zoom, today, wide: true);
        var end = start.AddDays(count - 1);
        var subtree = await MilestoneEndpoints.SubtreeAsync(db, project, ct);

        var milestones = await db.Milestones.AsNoTracking()
            .Where(m => subtree.Contains(m.ProjectId) && m.Date >= start && m.Date <= end)
            .OrderBy(m => m.Date)
            .ThenBy(m => m.Name)
            .ToListAsync(ct);

        // Beban kerja: task aktif milik tiap anggota (tanpa Tamu) di proyek ini dan sub-proyeknya. Tidak ikut tersaring filter tampilan.
        var people = await db.ProjectMembers.AsNoTracking()
            .Where(m => m.ProjectId == project.RootId && m.Role != ProjectRole.Tamu && m.User!.IsActive)
            .Select(m => new { m.UserId, m.User!.DisplayName })
            .ToListAsync(ct);
        var assigned = await db.TaskAssignees.AsNoTracking()
            .Where(a => subtree.Contains(a.Task!.ProjectId) && a.Task.Status != WorkStatus.Done)
            .Select(a => new { a.UserId, a.Task!.StartDate, a.Task.DueDate, a.Task.Status })
            .ToListAsync(ct);
        var byUser = assigned.ToLookup(a => a.UserId);

        var workload = people
            .OrderBy(p => p.DisplayName, StringComparer.Ordinal)
            .Select(p => new GanttPerson(
                p.UserId,
                p.DisplayName,
                TaskRules.WorkloadPerDay([.. byUser[p.UserId].Select(a => (a.StartDate, a.DueDate, a.Status))], start, count)))
            .ToList();

        return Results.Ok(new GanttResponse(name, start, count, today, await MilestoneEndpoints.ItemsAsync(db, milestones, ct), workload));
    }
}
