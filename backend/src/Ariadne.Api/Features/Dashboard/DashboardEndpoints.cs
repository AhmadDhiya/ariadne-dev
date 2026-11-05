using Ariadne.Api.Auth;
using Ariadne.Api.Domain;
using Ariadne.Api.Features.Milestones;
using Ariadne.Api.Features.Tasks;
using Ariadne.Api.Infrastructure.Clock;
using Ariadne.Api.Infrastructure.Data;
using Ariadne.Api.Infrastructure.Web;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Ariadne.Api.Features.Dashboard;

/// <summary>
/// Dashboard pribadi: semua yang ditampilkan adalah task yang pengguna ini menjadi PIC-nya di proyek yang masih
/// aktif. Dashboard orang lain hanya bisa dibuka lewat `userId` oleh supervisor tim orang itu (selain itu 404).
/// </summary>
internal static class DashboardEndpoints
{
    private const int MaxAttention = 8;
    private const int AttentionDays = 14;

    private static readonly string[] Cards = ["terlambat", "minggu", "dikerjakan", "tertahan"];

    public static IEndpointRouteBuilder MapDashboardEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/dashboard");
        group.MapGet("", Get);
        group.MapGet("/timeline", Timeline);
        return app;
    }

    private sealed record Mine(ProjectTask Task, IReadOnlyList<string> Path, int RootOrder);

    private static async Task<IResult> Get(
        [FromQuery] string? card,
        [FromQuery] Guid? userId,
        HttpContext http,
        AccessService accessService,
        AppDbContext db,
        IClock clock,
        CancellationToken ct)
    {
        if (card is not null && !Cards.Contains(card, StringComparer.Ordinal))
        {
            throw new ValidationFailedException("card", "Kartu tidak dikenal.");
        }

        var access = await accessService.CurrentAsync(http.User, ct);
        var (target, viewing) = await ResolveTargetAsync(db, access, userId, ct);
        var today = clock.Today;
        var mine = await LoadMineAsync(db, target, target == access.UserId ? null : access, ct);
        var codes = await TaskQueries.RootCodesAsync(db, mine.Select(m => m.Task.RootProjectId), ct);

        // Kartu dan daftar dihitung dari himpunan yang sama (task milik saya yang belum Done)
        var weekEnd = TaskRules.EndOfWorkWeek(today);
        var late = mine.Where(m => TaskRules.IsOverdue(m.Task.DueDate, m.Task.Status, today)).ToList();
        var dueThisWeek = mine.Count(m => TaskRules.IsDueThisWeek(m.Task.DueDate, m.Task.Status, today));
        var working = mine.Where(m => m.Task.Status is WorkStatus.OnProgress or WorkStatus.Fixing).ToList();
        var held = mine.Where(m => TaskRules.IsHeld(m.Task.Status)).ToList();
        var summary = new DashboardSummary(
            late.Count,
            [.. late.GroupBy(m => m.Task.Priority).OrderBy(g => g.Key).Select(g => new PriorityCount(g.Key, g.Count()))],
            dueThisWeek,
            weekEnd,
            working.Count,
            working.Select(m => m.Task.RootProjectId).Distinct().Count(),
            held.Count,
            [.. held.GroupBy(m => m.Task.Status).OrderBy(g => g.Key).Select(g => new StatusCount(g.Key, g.Count()))]);

        var shown = card switch
        {
            "terlambat" => late,
            "minggu" => [.. mine.Where(m => TaskRules.IsDueThisWeek(m.Task.DueDate, m.Task.Status, today))],
            "dikerjakan" => working,
            "tertahan" => held,
            _ => mine,
        };
        var groups = await BuildGroupsAsync(db, shown, codes, today, includeUpcoming: card is not null, ct);

        var attention = await BuildAttentionAsync(db, access, target, mine, codes, today, clock.UtcNow, ct);
        // Melihat dashboard orang lain: tidak ada tombol "Tambah task" (task baru milik dashboard sendiri)
        var editable = viewing is null ? await EditableProjectsAsync(db, access, ct) : [];
        return Results.Ok(new DashboardResponse(today, TaskRules.DayPart(Jakarta(clock).Hour), summary, card, groups, attention, editable, viewing));
    }

    /// <summary>
    /// Dashboard siapa yang dibuka: diri sendiri (tanpa userId), atau anggota tim yang saya pegang sebagai supervisor.
    /// Orang lain yang tidak boleh dilihat dijawab 404, sama seperti pengguna yang tidak ada.
    /// </summary>
    private static async Task<(Guid Target, TaskPerson? Viewing)> ResolveTargetAsync(AppDbContext db, UserAccess access, Guid? userId, CancellationToken ct)
    {
        if (userId is not { } id || id == access.UserId)
        {
            return (access.UserId, null);
        }

        await Supervision.EnsureCanViewMemberAsync(db, access, id, ct);
        var name = await db.Users.AsNoTracking().Where(u => u.Id == id).Select(u => u.DisplayName).SingleAsync(ct);
        return (id, new TaskPerson(id, name));
    }

    private static async Task<IResult> Timeline(
        [FromQuery] string? zoom,
        [FromQuery] Guid? userId,
        HttpContext http,
        AccessService accessService,
        AppDbContext db,
        IClock clock,
        CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var (target, _) = await ResolveTargetAsync(db, access, userId, ct);
        var today = clock.Today;
        if (!TimelineRange.IsKnown(zoom))
        {
            throw new ValidationFailedException("zoom", "Zoom tidak dikenal (day, week, month).");
        }

        var (name, start, count) = TimelineRange.For(zoom, today, wide: false);
        var end = start.AddDays(count - 1);
        var mine = await LoadMineAsync(db, target, target == access.UserId ? null : access, ct);

        var load = mine.Select(m => (m.Task.StartDate, m.Task.DueDate, m.Task.Status)).ToList();
        var workload = TaskRules.WorkloadPerDay(load, start, count);
        var columnWorkload = TaskRules.WorkloadPerColumn(load, name, start, count);

        var inRange = mine
            .Where(m => (m.Task.StartDate ?? m.Task.DueDate) is { } from && (m.Task.DueDate ?? m.Task.StartDate) is { } to && from <= end && to >= start)
            .ToList();
        var codes = await TaskQueries.RootCodesAsync(db, inRange.Select(m => m.Task.RootProjectId), ct);

        // Milestone proyek-proyek itu yang jatuh di rentang, ditampilkan di baris proyeknya
        var groupRoots = inRange.Select(m => m.Task.RootProjectId).Distinct().ToList();
        var milestoneRows = await db.Milestones.AsNoTracking()
            .Where(m => groupRoots.Contains(m.RootProjectId) && m.Date >= start && m.Date <= end)
            .Where(m => !db.Projects.Any(p => p.Id == m.ProjectId && p.ArchivedAt != null))
            .OrderBy(m => m.Date)
            .ThenBy(m => m.Name)
            .ToListAsync(ct);
        var milestoneItems = (await MilestoneEndpoints.ItemsAsync(db, milestoneRows, ct)).ToDictionary(i => i.Id);
        var milestonesByRoot = milestoneRows.ToLookup(m => m.RootProjectId, m => milestoneItems[m.Id]);
        // Urutan proyek sama dengan sidebar (urutan proyek, lalu nama)
        var groups = inRange
            .GroupBy(m => m.Task.RootProjectId)
            .OrderBy(g => g.First().RootOrder)
            .ThenBy(g => g.First().Path[0], StringComparer.Ordinal)
            .Select(g => new TimelineGroup(
                g.Key,
                g.First().Path[0],
                codes[g.Key],
                [.. g
                    .OrderBy(m => m.Task.StartDate ?? m.Task.DueDate)
                    .ThenBy(m => m.Task.Priority)
                    .ThenBy(m => m.Task.Number)
                    .Select(m => new TimelineTask(
                        m.Task.Id,
                        $"{codes[g.Key]}-{m.Task.Number}",
                        m.Task.Title,
                        m.Task.Status,
                        m.Task.Priority,
                        m.Task.StartDate,
                        m.Task.DueDate,
                        TaskRules.IsOverdue(m.Task.DueDate, m.Task.Status, today),
                        m.Path))
                ],
                [.. milestonesByRoot[g.Key]]))
            .ToList();

        return Results.Ok(new TimelineResponse(name, start, count, today, groups, workload, columnWorkload));
    }

    private static DateTime Jakarta(IClock clock) => TimeZoneInfo.ConvertTime(clock.UtcNow, clock.TimeZone).DateTime;

    /// <summary>Task yang `me` menjadi PIC-nya (bila `viewer` diisi: hanya yang boleh dilihat viewer), belum Done, di proyek yang belum diarsipkan, beserta jalur proyeknya.</summary>
    private static async Task<List<Mine>> LoadMineAsync(AppDbContext db, Guid me, UserAccess? viewer, CancellationToken ct)
    {
        var tasks = await db.Tasks.WithDetails()
            .Where(t => t.Assignees.Any(a => a.UserId == me) && t.Status != WorkStatus.Done && t.Project!.ArchivedAt == null)
            .ToListAsync(ct);

        // Supervisor yang membuka dashboard orang lain hanya melihat task dari proyek yang boleh ia lihat
        if (viewer is not null)
        {
            tasks = [.. tasks.Where(t => viewer.CanViewProject(t.RootProjectId))];
        }

        if (tasks.Count == 0)
        {
            return [];
        }

        var roots = tasks.Select(t => t.RootProjectId).Distinct().ToList();
        var family = (await db.Projects.AsNoTracking().Where(p => roots.Contains(p.RootId)).Select(p => new { p.Id, p.ParentId, p.Name, p.SortOrder }).ToListAsync(ct)).ToDictionary(p => p.Id);

        List<string> PathOf(Guid projectId)
        {
            var path = new List<string>();
            for (Guid? id = projectId; id is { } at && family.TryGetValue(at, out var node); id = node.ParentId)
            {
                path.Insert(0, node.Name);
            }

            return path;
        }

        return [.. tasks.Select(t => new Mine(t, PathOf(t.ProjectId), family.TryGetValue(t.RootProjectId, out var root) ? root.SortOrder : 0))];
    }

    private static async Task<List<DashboardGroup>> BuildGroupsAsync(
        AppDbContext db,
        IReadOnlyList<Mine> shown,
        IReadOnlyDictionary<Guid, string> codes,
        DateOnly today,
        bool includeUpcoming,
        CancellationToken ct)
    {
        var rows = (await TaskQueries.BuildRowsAsync(db, [.. shown.Select(m => m.Task)], codes, today, ct)).ToDictionary(r => r.Id);
        var groups = new List<DashboardGroup>();
        foreach (var kind in Enum.GetValues<TodayGroup>())
        {
            if (kind == TodayGroup.Upcoming && !includeUpcoming)
            {
                continue;
            }

            // Prioritas dulu, lalu tenggat terdekat, lalu kode dan nomor (urutan "prioritas" di domain.md)
            var tasks = shown
                .Where(m => TaskRules.TodayGroupOf(m.Task.StartDate, m.Task.DueDate, m.Task.Status, today) == kind)
                .OrderBy(m => m.Task.Priority)
                .ThenBy(m => m.Task.DueDate ?? DateOnly.MaxValue)
                .ThenBy(m => codes[m.Task.RootProjectId], StringComparer.Ordinal)
                .ThenBy(m => m.Task.Number)
                .Select(m => new DashboardTask(rows[m.Task.Id], m.Path))
                .ToList();
            if (tasks.Count > 0)
            {
                groups.Add(new DashboardGroup(kind, tasks));
            }
        }

        return groups;
    }

    private static async Task<List<AttentionItem>> BuildAttentionAsync(
        AppDbContext db,
        UserAccess access,
        Guid me,
        IReadOnlyList<Mine> mine,
        IReadOnlyDictionary<Guid, string> codes,
        DateOnly today,
        DateTimeOffset now,
        CancellationToken ct)
    {
        // `me` = pemilik dashboard; hak melihat kutipan tetap diperiksa terhadap `access` (yang sedang membuka).
        var since = now.AddDays(-AttentionDays);
        var events = new List<AttentionItem>();

        // Disebut orang lain. Hak melihat diperiksa lagi di sini: orang yang sudah dikeluarkan dari proyek, atau
        // kini hanya Tamu, tidak boleh lagi membaca kutipan (apalagi dari catatan Internal).
        var mentions = await db.Mentions.AsNoTracking()
            .Where(m => m.UserId == me && m.Activity!.AuthorId != me && m.Activity.CreatedAt >= since && m.Activity.Task!.Project!.ArchivedAt == null)
            .OrderByDescending(m => m.Activity!.Seq)
            .Take(20)
            .Select(m => new
            {
                m.Activity!.Body,
                m.Activity.Kind,
                Actor = m.Activity.Author!.DisplayName,
                m.Activity.CreatedAt,
                m.Activity.RootProjectId,
                m.Activity.Task!.Number,
                m.Activity.Task.Title,
            })
            .ToListAsync(ct);
        var mentionCodes = await TaskQueries.RootCodesAsync(db, mentions.Select(m => m.RootProjectId), ct);
        events.AddRange(mentions
            .Where(m => access.CanViewProject(m.RootProjectId) && (m.Kind != ActivityKind.Internal || access.CanSeeInternal(m.RootProjectId)))
            .Take(5)
            .Select(m => new AttentionItem("Mention", $"{mentionCodes[m.RootProjectId]}-{m.Number}", m.Title, m.Actor, Excerpt(m.Body), m.CreatedAt, null, null, 0)));

        // Ditugaskan orang lain (task baru atau PIC ditambahkan), dari catatan otomatis
        var myIds = mine.Select(m => m.Task.Id).ToList();
        var logs = await db.Activities.AsNoTracking()
            .Where(a => a.Kind == ActivityKind.Log
                && (a.LogKind == LogKind.AssigneesChanged || a.LogKind == LogKind.TaskCreated || a.LogKind == LogKind.TaskMoved)
                && a.AuthorId != me
                && a.CreatedAt >= since
                && myIds.Contains(a.TaskId))
            .OrderByDescending(a => a.Seq)
            .Take(30)
            .Select(a => new { a.TaskId, a.Data, Actor = a.Author!.DisplayName, a.CreatedAt })
            .ToListAsync(ct);
        var byId = mine.ToDictionary(m => m.Task.Id);
        events.AddRange(logs
            .Where(l => l.Data?.AddedIds?.Contains(me) == true)
            .Take(5)
            .Select(l =>
            {
                var task = byId[l.TaskId].Task;
                return new AttentionItem("Assigned", $"{codes[task.RootProjectId]}-{task.Number}", task.Title, l.Actor, null, l.CreatedAt, task.StartDate, task.DueDate, 0);
            }));

        var items = events.OrderByDescending(e => e.At).ToList();

        var derived = new List<AttentionItem>();
        derived.AddRange(mine
            .Where(m => m.Task.DueDate == today.AddDays(1) && m.Task.Status != WorkStatus.Done)
            .OrderBy(m => m.Task.Priority)
            .Select(m => new AttentionItem("DueTomorrow", $"{codes[m.Task.RootProjectId]}-{m.Task.Number}", m.Task.Title, null, null, null, m.Task.StartDate, m.Task.DueDate, 0)));
        derived.AddRange(mine
            .Where(m => TaskRules.IsOverdue(m.Task.DueDate, m.Task.Status, today))
            .OrderByDescending(m => TaskRules.LateDays(m.Task.DueDate, m.Task.Status, today))
            .ThenBy(m => m.Task.Priority)
            .Select(m => new AttentionItem("Overdue", $"{codes[m.Task.RootProjectId]}-{m.Task.Number}", m.Task.Title, null, null, null, m.Task.StartDate, m.Task.DueDate, TaskRules.LateDays(m.Task.DueDate, m.Task.Status, today))));

        return [.. items.Concat(derived).Take(MaxAttention)];
    }

    private static string Excerpt(string? body)
    {
        var text = (body ?? "").ReplaceLineEndings(" ").Trim();
        return text.Length > 120 ? text[..120] + "…" : text;
    }

    /// <summary>Proyek root tempat pengguna boleh membuat task (Pengelola atau Anggota), untuk tombol "Tambah task".</summary>
    private static async Task<List<ProjectOption>> EditableProjectsAsync(AppDbContext db, UserAccess access, CancellationToken ct)
    {
        var roots = access.Projects.Where(p => p.Value is ProjectRole.Pengelola or ProjectRole.Anggota).Select(p => p.Key).ToList();
        return await db.Projects.AsNoTracking()
            .Where(p => roots.Contains(p.Id) && p.ArchivedAt == null)
            .OrderBy(p => p.Name)
            .Select(p => new ProjectOption(p.Id, p.Name, p.Code!))
            .ToListAsync(ct);
    }
}
