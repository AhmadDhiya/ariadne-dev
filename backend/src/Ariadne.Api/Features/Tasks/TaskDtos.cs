using Ariadne.Api.Domain;

namespace Ariadne.Api.Features.Tasks;

public sealed record TaskPerson(Guid Id, string Name);

/// <summary>Satu baris tabel task. Semua angka turunan (terlambat, durasi) dihitung di server.</summary>
public sealed record TaskRow(
    Guid Id,
    string Key,
    int Number,
    Guid ProjectId,
    Guid? ParentTaskId,
    string Title,
    WorkStatus Status,
    Priority Priority,
    IReadOnlyList<TaskPerson> Assignees,
    DateOnly? StartDate,
    DateOnly? DueDate,
    int? DurationDays,
    bool IsOverdue,
    int LateDays,
    string? HoldReason,
    string? WaitingOn,
    bool WaitingOnIsPerson,
    DateTimeOffset? HeldSince,
    IReadOnlyList<string> Labels,
    int SubtaskCount,
    int SubtaskDoneCount);

public sealed record TaskProgress(int Done, int Total, int Percent);

public sealed record TaskList(Guid ProjectId, bool CanEdit, TaskProgress Progress, IReadOnlyList<TaskRow> Tasks);

public sealed record TaskDetail(TaskRow Task, string? Description, bool CanEdit);

public sealed record LabelItem(Guid Id, string Name);

public sealed record CreateTaskRequest(
    string? Title,
    string? Description,
    string? Status,
    string? Priority,
    DateOnly? StartDate,
    DateOnly? DueDate,
    IReadOnlyList<Guid>? AssigneeIds,
    IReadOnlyList<string>? Labels,
    string? HoldReason,
    Guid? WaitingOnUserId,
    string? WaitingOnText);

/// <summary>Kolom yang null = tidak diubah. Keterangan "" = dikosongkan.</summary>
public sealed record UpdateTaskRequest(
    string? Title,
    string? Description,
    string? Priority,
    Guid? ProjectId,
    IReadOnlyList<string>? Labels);

public sealed record SetStatusRequest(string? Status, string? HoldReason, Guid? WaitingOnUserId, string? WaitingOnText);

public sealed record SetDatesRequest(DateOnly? StartDate, DateOnly? DueDate);

public sealed record SetAssigneesRequest(IReadOnlyList<Guid>? UserIds);
