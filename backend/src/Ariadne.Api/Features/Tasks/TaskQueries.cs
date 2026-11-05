using Ariadne.Api.Domain;
using Ariadne.Api.Infrastructure.Data;
using Ariadne.Api.Infrastructure.Web;
using Microsoft.EntityFrameworkCore;

namespace Ariadne.Api.Features.Tasks;

/// <summary>Menyusun TaskRow dari entitas: satu tempat untuk semua angka turunan (pedoman E6).</summary>
internal static class TaskQueries
{
    /// <summary>Memuat task beserta PIC dan labelnya, untuk dibaca (tanpa pelacakan perubahan).</summary>
    public static IQueryable<ProjectTask> WithDetails(this IQueryable<ProjectTask> query) =>
        query.AsNoTracking()
            .Include(t => t.Assignees).ThenInclude(a => a.User)
            .Include(t => t.Labels).ThenInclude(l => l.Label)
            .AsSplitQuery();

    /// <summary>Mengubah task menjadi baris tabel, urut seperti tampilan: task, lalu sub-task-nya langsung di bawahnya.</summary>
    public static async Task<List<TaskRow>> BuildRowsAsync(
        AppDbContext db,
        IReadOnlyCollection<ProjectTask> tasks,
        IReadOnlyDictionary<Guid, string> rootCodes,
        DateOnly today,
        CancellationToken ct)
    {
        if (tasks.Count == 0)
        {
            return [];
        }

        var waitingIds = tasks.Where(t => t.WaitingOnUserId is not null).Select(t => t.WaitingOnUserId!.Value).Distinct().ToList();
        var waitingNames = waitingIds.Count == 0
            ? []
            : await db.Users.AsNoTracking().Where(u => waitingIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.DisplayName, ct);

        // Hitungan sub-task selalu dari semua sub-task, bukan hanya yang lolos filter ("1/3")
        var parentIds = tasks.Where(t => t.ParentTaskId is null).Select(t => t.Id).ToList();
        var subtaskCounts = (await db.Tasks.AsNoTracking()
                .Where(t => t.ParentTaskId != null && parentIds.Contains(t.ParentTaskId.Value))
                .GroupBy(t => t.ParentTaskId!.Value)
                .Select(g => new { Parent = g.Key, Total = g.Count(), Done = g.Count(t => t.Status == WorkStatus.Done) })
                .ToListAsync(ct))
            .ToDictionary(x => x.Parent);

        // Update terbaru tiap task (hanya jenis Update; Internal tidak pernah ikut, jadi aman untuk Tamu).
        // Nomor urut (Seq) dipakai, bukan waktu, supaya dua entri di detik yang sama tidak membingungkan.
        var taskIds = tasks.Select(t => t.Id).ToList();
        var lastUpdates = (await db.Activities.AsNoTracking()
                .Where(a => taskIds.Contains(a.TaskId) && a.Kind == ActivityKind.Update)
                .Where(a => a.Seq == db.Activities.Where(b => b.TaskId == a.TaskId && b.Kind == ActivityKind.Update).Max(b => b.Seq))
                .Select(a => new TaskUpdateRow(a.TaskId, a.Body!.Length > 200 ? a.Body.Substring(0, 200) : a.Body, a.Author!.DisplayName, a.CreatedAt))
                .ToListAsync(ct))
            .ToDictionary(x => x.TaskId);

        TaskRow Row(ProjectTask t)
        {
            subtaskCounts.TryGetValue(t.Id, out var counts);
            lastUpdates.TryGetValue(t.Id, out var update);
            return new TaskRow(
                t.Id,
                $"{rootCodes[t.RootProjectId]}-{t.Number}",
                t.Number,
                t.ProjectId,
                t.ParentTaskId,
                t.Title,
                t.Status,
                t.Priority,
                [.. t.Assignees.Select(a => new TaskPerson(a.UserId, a.User!.DisplayName)).OrderBy(p => p.Name, StringComparer.Ordinal)],
                t.StartDate,
                t.DueDate,
                TaskRules.WorkingDays(t.StartDate, t.DueDate),
                TaskRules.IsOverdue(t.DueDate, t.Status, today),
                TaskRules.LateDays(t.DueDate, t.Status, today),
                t.HoldReason,
                t.WaitingOnUserId is { } waitingId && waitingNames.TryGetValue(waitingId, out var name) ? name : t.WaitingOnText,
                t.WaitingOnUserId is not null,
                t.WaitingOnUserId,
                t.HeldSince,
                [.. t.Labels.Select(l => l.Label!.Name).Order(StringComparer.OrdinalIgnoreCase)],
                counts?.Total ?? 0,
                counts?.Done ?? 0,
                update is null ? null : new TaskUpdate(update.Text ?? "", update.AuthorName, update.CreatedAt));
        }

        var byParent = tasks.Where(t => t.ParentTaskId is not null).ToLookup(t => t.ParentTaskId!.Value);
        var ids = tasks.Select(t => t.Id).ToHashSet();
        var ordered = new List<TaskRow>(tasks.Count);

        // Sub-task yang induknya tidak ikut tetap ditampilkan sebagai baris sendiri
        foreach (var top in tasks.Where(t => t.ParentTaskId is null || !ids.Contains(t.ParentTaskId.Value)).OrderBy(t => t.SortOrder).ThenBy(t => t.Number))
        {
            ordered.Add(Row(top));
            foreach (var child in byParent[top.Id].OrderBy(t => t.SortOrder).ThenBy(t => t.Number))
            {
                ordered.Add(Row(child));
            }
        }

        return ordered;
    }

    public static async Task<Dictionary<Guid, string>> RootCodesAsync(AppDbContext db, IEnumerable<Guid> rootIds, CancellationToken ct)
    {
        var ids = rootIds.Distinct().ToList();
        return await db.Projects.AsNoTracking()
            .Where(p => ids.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.Code ?? "", ct);
    }

    /// <summary>Satu task sebagai baris tabel (setelah diubah); 404 bila tidak ada.</summary>
    public static async Task<TaskRow> RowAsync(AppDbContext db, Guid taskId, DateOnly today, CancellationToken ct)
    {
        var task = await db.Tasks.WithDetails().SingleOrDefaultAsync(t => t.Id == taskId, ct) ?? throw new NotFoundException();
        var codes = await RootCodesAsync(db, [task.RootProjectId], ct);
        return (await BuildRowsAsync(db, [task], codes, today, ct))[0];
    }

    private sealed record TaskUpdateRow(Guid TaskId, string? Text, string AuthorName, DateTimeOffset CreatedAt);

    /// <summary>Nama proyek dari root sampai tempat task berada, mis. ["Sentul", "Dispatch"].</summary>
    public static async Task<List<string>> ProjectPathAsync(AppDbContext db, Guid projectId, CancellationToken ct)
    {
        var current = await db.Projects.AsNoTracking().Where(p => p.Id == projectId).Select(p => new { p.RootId }).SingleAsync(ct);
        var family = await db.Projects.AsNoTracking().Where(p => p.RootId == current.RootId).Select(p => new { p.Id, p.ParentId, p.Name }).ToListAsync(ct);
        var byId = family.ToDictionary(p => p.Id);
        var path = new List<string>();
        for (Guid? id = projectId; id is { } at && byId.TryGetValue(at, out var node); id = node.ParentId)
        {
            path.Insert(0, node.Name);
        }

        return path;
    }

    /// <summary>Jalur nama proyek (seperti ProjectPathAsync) untuk banyak proyek sekaligus, dengan satu query per root.</summary>
    public static async Task<Dictionary<Guid, List<string>>> ProjectPathsAsync(AppDbContext db, IEnumerable<Guid> rootIds, IEnumerable<Guid> projectIds, CancellationToken ct)
    {
        var roots = rootIds.Distinct().ToList();
        var family = await db.Projects.AsNoTracking().Where(p => roots.Contains(p.RootId)).Select(p => new { p.Id, p.ParentId, p.Name }).ToListAsync(ct);
        var byId = family.ToDictionary(p => p.Id);
        var result = new Dictionary<Guid, List<string>>();
        foreach (var projectId in projectIds.Distinct())
        {
            var path = new List<string>();
            for (Guid? id = projectId; id is { } at && byId.TryGetValue(at, out var node); id = node.ParentId)
            {
                path.Insert(0, node.Name);
            }

            result[projectId] = path;
        }

        return result;
    }

    /// <summary>Id proyek ini beserta semua sub-proyeknya yang belum diarsipkan.</summary>
    public static HashSet<Guid> Subtree(IEnumerable<(Guid Id, Guid? ParentId)> family, Guid projectId)
    {
        var list = family.ToList();
        var result = new HashSet<Guid> { projectId };
        bool grew;
        do
        {
            var before = result.Count;
            foreach (var (id, parentId) in list)
            {
                if (parentId is { } parent && result.Contains(parent))
                {
                    result.Add(id);
                }
            }

            grew = result.Count > before;
        }
        while (grew);

        return result;
    }
}
