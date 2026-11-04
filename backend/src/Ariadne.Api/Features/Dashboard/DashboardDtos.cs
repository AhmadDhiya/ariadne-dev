using Ariadne.Api.Domain;
using Ariadne.Api.Features.Milestones;
using Ariadne.Api.Features.Tasks;

namespace Ariadne.Api.Features.Dashboard;

public sealed record PriorityCount(Priority Priority, int Count);

public sealed record StatusCount(WorkStatus Status, int Count);

/// <summary>
/// Empat kartu ringkasan (docs/domain.md): semua angka dihitung di server dari task milik pengguna yang belum Done.
/// </summary>
public sealed record DashboardSummary(
    int Late,
    IReadOnlyList<PriorityCount> LateByPriority,
    int DueThisWeek,
    DateOnly WeekEnd,
    int InProgress,
    int InProgressProjects,
    int Held,
    IReadOnlyList<StatusCount> HeldByStatus);

/// <summary>Task di daftar "Hari Ini" beserta jalur proyeknya ("Sentul / SLMS / Temuan UAT &amp; API").</summary>
public sealed record DashboardTask(TaskRow Task, IReadOnlyList<string> Path);

public sealed record DashboardGroup(TodayGroup Kind, IReadOnlyList<DashboardTask> Tasks);

/// <summary>
/// Satu butir "Perlu perhatian". Kind: Mention, Assigned, DueTomorrow, Overdue. Teks kalimatnya disusun di layar;
/// di sini hanya data. (Fase 9 menggantikan sumbernya dengan tabel notifikasi.)
/// </summary>
public sealed record AttentionItem(
    string Kind,
    string TaskKey,
    string TaskTitle,
    string? ActorName,
    string? Detail,
    DateTimeOffset? At,
    DateOnly? StartDate,
    DateOnly? DueDate,
    int LateDays);

public sealed record ProjectOption(Guid Id, string Name, string Code);

public sealed record DashboardResponse(
    DateOnly Today,
    string DayPart,
    DashboardSummary Summary,
    string? Card,
    IReadOnlyList<DashboardGroup> Groups,
    IReadOnlyList<AttentionItem> Attention,
    IReadOnlyList<ProjectOption> EditableProjects,
    TaskPerson? Viewing);

public sealed record TimelineTask(
    Guid Id,
    string Key,
    string Title,
    WorkStatus Status,
    Priority Priority,
    DateOnly? StartDate,
    DateOnly? DueDate,
    bool IsOverdue,
    IReadOnlyList<string> Path);

public sealed record TimelineGroup(Guid ProjectId, string Name, string Code, IReadOnlyList<TimelineTask> Tasks, IReadOnlyList<MilestoneItem> Milestones);

/// <summary>Timeline pribadi: rentang tanggal sesuai zoom, task per proyek, dan beban kerja (task aktif) per hari.</summary>
public sealed record TimelineResponse(
    string Zoom,
    DateOnly Start,
    int DayCount,
    DateOnly Today,
    IReadOnlyList<TimelineGroup> Groups,
    IReadOnlyList<int> Workload);
