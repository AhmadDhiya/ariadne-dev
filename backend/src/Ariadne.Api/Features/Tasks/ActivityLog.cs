using Ariadne.Api.Domain;

namespace Ariadne.Api.Features.Tasks;

/// <summary>
/// Menyusun entri Log otomatis (docs/domain.md, "Log otomatis"). Entri hanya ditambahkan ke konteks; penyimpanannya
/// ikut dalam SaveChanges yang sama dengan perubahan task, jadi log dan perubahan selalu berhasil atau gagal bersama.
/// </summary>
internal static class ActivityLog
{
    public static Activity Create(ProjectTask task, Guid authorId, LogKind kind, DateTimeOffset now, ActivityData? data = null) =>
        Create(task.Id, task.RootProjectId, authorId, kind, now, data);

    public static Activity Create(Guid taskId, Guid rootProjectId, Guid authorId, LogKind kind, DateTimeOffset now, ActivityData? data = null) => new()
    {
        Id = Guid.NewGuid(),
        TaskId = taskId,
        RootProjectId = rootProjectId,
        AuthorId = authorId,
        Kind = ActivityKind.Log,
        LogKind = kind,
        Data = data,
        CreatedAt = now,
    };

    /// <summary>Task dibuat; PIC awalnya (bila ada) ikut tercatat di entri yang sama.</summary>
    public static Activity TaskCreated(ProjectTask task, Guid authorId, IReadOnlyList<string> assignees, IReadOnlyList<Guid> assigneeIds, DateTimeOffset now) =>
        Create(task, authorId, LogKind.TaskCreated, now, assignees.Count == 0 ? null : new ActivityData { Added = assignees, AddedIds = assigneeIds });

    public static Activity StatusChanged(ProjectTask task, Guid authorId, WorkStatus from, DateTimeOffset now) =>
        Create(task, authorId, LogKind.StatusChanged, now, new ActivityData { From = from.ToString(), To = task.Status.ToString(), Reason = task.HoldReason });

    public static Activity DatesChanged(ProjectTask task, Guid authorId, DateOnly? fromStart, DateOnly? fromDue, DateTimeOffset now) =>
        Create(task, authorId, LogKind.DatesChanged, now, new ActivityData
        {
            FromStart = Iso(fromStart),
            FromDue = Iso(fromDue),
            ToStart = Iso(task.StartDate),
            ToDue = Iso(task.DueDate),
        });

    public static Activity AssigneesChanged(
        ProjectTask task,
        Guid authorId,
        IReadOnlyList<string> added,
        IReadOnlyList<string> removed,
        IReadOnlyList<Guid> addedIds,
        DateTimeOffset now) =>
        Create(task, authorId, LogKind.AssigneesChanged, now, new ActivityData { Added = added, Removed = removed, AddedIds = addedIds });

    /// <summary>Task dipindahkan dari PIC lama (Removed) ke PIC baru (Added); id penerima disimpan untuk "ditugaskan ke saya".</summary>
    public static Activity TaskMoved(ProjectTask task, Guid authorId, string fromName, string toName, Guid toId, DateTimeOffset now) =>
        Create(task, authorId, LogKind.TaskMoved, now, new ActivityData { Removed = [fromName], Added = [toName], AddedIds = [toId] });

    private static string? Iso(DateOnly? date) => date?.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
}
