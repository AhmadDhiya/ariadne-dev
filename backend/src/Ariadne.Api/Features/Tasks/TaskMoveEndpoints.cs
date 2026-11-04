using Ariadne.Api.Auth;
using Ariadne.Api.Domain;
using Ariadne.Api.Infrastructure.Clock;
using Ariadne.Api.Infrastructure.Data;
using Ariadne.Api.Infrastructure.Web;
using Microsoft.EntityFrameworkCore;

namespace Ariadne.Api.Features.Tasks;

/// <summary>Satu orang yang bisa menerima task, dengan beban hariannya di rentang task.</summary>
public sealed record MoveCandidate(Guid UserId, string Name, bool IsAssignee, IReadOnlyList<int> Counts, int Peak);

/// <summary>Rentang = tanggal mulai sampai selesai task (satu hari bila hanya satu tanggal). Beban tidak menghitung task ini sendiri.</summary>
public sealed record MoveCandidates(DateOnly Start, int DayCount, IReadOnlyList<TaskPerson> Assignees, IReadOnlyList<MoveCandidate> Candidates);

public sealed record MoveTaskRequest(Guid FromUserId, Guid ToUserId, bool Notify);

/// <summary>
/// Titik sambung notifikasi "task dipindahkan ke Anda". Notifikasi sungguhan baru dibuat di Fase 9; sampai itu
/// implementasinya tidak melakukan apa-apa, tetapi pilihan "kabari" dari dialog sudah sampai ke sini.
/// </summary>
public interface ITaskMoveNotifier
{
    Task NotifyAsync(Guid taskId, Guid fromUserId, Guid toUserId, Guid actorId, CancellationToken ct);
}

internal sealed class NoopTaskMoveNotifier : ITaskMoveNotifier
{
    public Task NotifyAsync(Guid taskId, Guid fromUserId, Guid toUserId, Guid actorId, CancellationToken ct) => Task.CompletedTask;
}

internal static class TaskMoveEndpoints
{
    private const int MaxRangeDays = 92;

    public static IEndpointRouteBuilder MapTaskMoveEndpoints(this IEndpointRouteBuilder app)
    {
        var tasks = app.MapGroup("/api/tasks");
        tasks.MapGet("/{id:guid}/move-candidates", Candidates);
        tasks.MapPost("/{id:guid}/move", Move);
        return app;
    }

    private static async Task<IResult> Candidates(Guid id, HttpContext http, AccessService accessService, AppDbContext db, IClock clock, CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var task = await db.Tasks.AsNoTracking().Include(t => t.Assignees).ThenInclude(a => a.User).SingleOrDefaultAsync(t => t.Id == id, ct)
            ?? throw new NotFoundException();
        await Supervision.EnsureCanSeeMoveCandidatesAsync(db, access, task.RootProjectId, task.Assignees.Select(a => a.UserId), ct);

        var (start, count) = Range(task, clock.Today);
        var members = await EligibleRecipientsAsync(db, access, task.RootProjectId, ct);
        var ids = members.Select(m => m.UserId).ToList();

        var others = await db.TaskAssignees.AsNoTracking()
            .Where(a => ids.Contains(a.UserId) && a.TaskId != id && a.Task!.Status != WorkStatus.Done && a.Task.Project!.ArchivedAt == null)
            .Select(a => new { a.UserId, a.Task!.StartDate, a.Task.DueDate, a.Task.Status })
            .ToListAsync(ct);
        var byUser = others.ToLookup(a => a.UserId);
        var assigneeIds = task.Assignees.Select(a => a.UserId).ToHashSet();

        var candidates = members
            .OrderBy(m => m.Name, StringComparer.Ordinal)
            .Select(m =>
            {
                var counts = TaskRules.WorkloadPerDay([.. byUser[m.UserId].Select(a => (a.StartDate, a.DueDate, a.Status))], start, count);
                return new MoveCandidate(m.UserId, m.Name, assigneeIds.Contains(m.UserId), counts, counts.Length == 0 ? 0 : counts.Max());
            })
            .ToList();

        var assignees = task.Assignees.Select(a => new TaskPerson(a.UserId, a.User!.DisplayName)).OrderBy(p => p.Name, StringComparer.Ordinal).ToList();
        return Results.Ok(new MoveCandidates(start, count, assignees, candidates));
    }

    private static async Task<IResult> Move(Guid id, MoveTaskRequest request, HttpContext http, AccessService accessService, AppDbContext db, IClock clock, ITaskMoveNotifier notifier, CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var task = await db.Tasks.Include(t => t.Assignees).SingleOrDefaultAsync(t => t.Id == id, ct) ?? throw new NotFoundException();
        await Supervision.EnsureCanMoveAsync(db, access, task.RootProjectId, request.FromUserId, ct);

        if (task.Assignees.All(a => a.UserId != request.FromUserId))
        {
            throw new ValidationFailedException("fromUserId", "Orang ini bukan PIC task ini.");
        }

        if (request.ToUserId == request.FromUserId)
        {
            throw new ValidationFailedException("toUserId", "Pilih orang lain sebagai penerima.");
        }

        var recipients = await EligibleRecipientsAsync(db, access, task.RootProjectId, ct);
        var to = recipients.SingleOrDefault(r => r.UserId == request.ToUserId)
            ?? throw new ValidationFailedException("toUserId", "Penerima harus anggota aktif proyek ini (bukan Tamu) dan anggota tim yang Anda pegang.");
        var fromName = await db.Users.AsNoTracking().Where(u => u.Id == request.FromUserId).Select(u => u.DisplayName).SingleAsync(ct);

        task.Assignees.RemoveAll(a => a.UserId == request.FromUserId);
        if (task.Assignees.All(a => a.UserId != to.UserId))
        {
            task.Assignees.Add(new TaskAssignee { TaskId = task.Id, UserId = to.UserId });
        }

        var now = clock.UtcNow;
        db.Activities.Add(ActivityLog.TaskMoved(task, access.UserId, fromName, to.Name, to.UserId, now));
        task.UpdatedAt = now;
        await db.SaveOrConflictAsync("Task tidak bisa dipindahkan karena bentrok. Coba lagi.", ct);

        if (request.Notify)
        {
            await notifier.NotifyAsync(task.Id, request.FromUserId, to.UserId, access.UserId, ct);
        }

        return Results.Ok(await TaskQueries.RowAsync(db, id, clock.Today, ct));
    }

    private sealed record Recipient(Guid UserId, string Name);

    /// <summary>
    /// Anggota aktif proyek task (Pengelola atau Anggota, bukan Tamu). Pengelola boleh memilih siapa saja dari situ;
    /// supervisor hanya yang juga anggota tim yang ia pegang (keputusan 8).
    /// </summary>
    private static async Task<List<Recipient>> EligibleRecipientsAsync(AppDbContext db, UserAccess access, Guid rootProjectId, CancellationToken ct)
    {
        var members = await db.ProjectMembers.AsNoTracking()
            .Where(m => m.ProjectId == rootProjectId && m.Role != ProjectRole.Tamu && m.User!.IsActive)
            .Select(m => new Recipient(m.UserId, m.User!.DisplayName))
            .ToListAsync(ct);
        if (access.RoleIn(rootProjectId) == ProjectRole.Pengelola)
        {
            return members;
        }

        var supervised = await Supervision.SupervisedUserIdsAsync(db, access, ct);
        return [.. members.Where(m => supervised.Contains(m.UserId))];
    }

    private static (DateOnly Start, int Count) Range(ProjectTask task, DateOnly today)
    {
        var from = task.StartDate ?? task.DueDate ?? today;
        var to = task.DueDate ?? task.StartDate ?? today;
        if (to < from)
        {
            to = from;
        }

        return (from, Math.Min(to.DayNumber - from.DayNumber + 1, MaxRangeDays));
    }
}
