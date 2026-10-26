using Ariadne.Api.Domain;

namespace Ariadne.Api.Tests.Domain;

public sealed class TaskRulesTests
{
    private static readonly DateOnly Monday = new(2026, 9, 28);

    [Theory]
    [InlineData(WorkStatus.Blocked, true)]
    [InlineData(WorkStatus.OnHold, true)]
    [InlineData(WorkStatus.OnRequest, true)]
    [InlineData(WorkStatus.NotStarted, false)]
    [InlineData(WorkStatus.OnProgress, false)]
    [InlineData(WorkStatus.Fixing, false)]
    [InlineData(WorkStatus.Done, false)]
    [InlineData(WorkStatus.Rutin, false)]
    public void Only_blocked_on_hold_and_on_request_are_held(WorkStatus status, bool held) =>
        Assert.Equal(held, TaskRules.IsHeld(status));

    [Theory]
    [InlineData("2026-09-27", WorkStatus.OnProgress, true)] // kemarin
    [InlineData("2026-09-28", WorkStatus.OnProgress, false)] // hari ini belum terlambat
    [InlineData("2026-09-29", WorkStatus.Blocked, false)]
    [InlineData("2026-09-25", WorkStatus.Done, false)] // sudah selesai
    [InlineData("2026-09-25", WorkStatus.Rutin, false)] // rutin tidak pernah terlambat
    [InlineData("2026-09-25", WorkStatus.Blocked, true)] // tertahan tetap bisa terlambat (SEN-115)
    public void Overdue_means_past_due_and_not_done_or_routine(string due, WorkStatus status, bool overdue) =>
        Assert.Equal(overdue, TaskRules.IsOverdue(DateOnly.Parse(due, System.Globalization.CultureInfo.InvariantCulture), status, Monday));

    [Fact]
    public void A_task_without_a_due_date_is_never_overdue() =>
        Assert.False(TaskRules.IsOverdue(null, WorkStatus.OnProgress, Monday));

    [Fact]
    public void Late_days_counts_calendar_days_and_is_zero_when_not_overdue()
    {
        Assert.Equal(3, TaskRules.LateDays(new DateOnly(2026, 9, 25), WorkStatus.Blocked, Monday)); // SEN-115: Jumat → Senin
        Assert.Equal(0, TaskRules.LateDays(new DateOnly(2026, 9, 25), WorkStatus.Done, Monday));
        Assert.Equal(0, TaskRules.LateDays(new DateOnly(2026, 9, 30), WorkStatus.OnProgress, Monday));
    }

    [Theory]
    [InlineData("2026-09-14", "2026-09-18", 5)] // SEN-101: satu pekan kerja
    [InlineData("2026-09-21", "2026-09-28", 6)] // SEN-112: melewati akhir pekan
    [InlineData("2026-09-22", "2026-09-30", 7)] // SEN-133
    [InlineData("2026-09-23", "2026-09-24", 2)] // SEN-123
    [InlineData("2026-09-26", "2026-09-27", 0)] // hanya Sabtu dan Minggu
    [InlineData("2026-09-28", "2026-09-28", 1)] // satu hari (inklusif)
    public void Duration_counts_working_days_inclusive(string start, string due, int expected) =>
        Assert.Equal(expected, TaskRules.WorkingDays(DateOnly.Parse(start, System.Globalization.CultureInfo.InvariantCulture), DateOnly.Parse(due, System.Globalization.CultureInfo.InvariantCulture)));

    [Fact]
    public void Duration_is_unknown_without_both_dates_or_when_reversed()
    {
        Assert.Null(TaskRules.WorkingDays(null, Monday));
        Assert.Null(TaskRules.WorkingDays(Monday, null));
        Assert.Null(TaskRules.WorkingDays(Monday, Monday.AddDays(-1)));
    }

    [Theory]
    [InlineData("2026-09-28", "2026-10-02")] // Senin → Jumat pekan ini
    [InlineData("2026-10-02", "2026-10-02")] // Jumat → hari itu juga
    [InlineData("2026-10-03", "2026-10-09")] // Sabtu → Jumat pekan depan
    [InlineData("2026-10-04", "2026-10-09")] // Minggu → Jumat pekan depan
    public void The_work_week_ends_on_friday(string today, string friday) =>
        Assert.Equal(DateOnly.Parse(friday, System.Globalization.CultureInfo.InvariantCulture), TaskRules.EndOfWorkWeek(DateOnly.Parse(today, System.Globalization.CultureInfo.InvariantCulture)));

    [Theory]
    [InlineData("2026-09-28", WorkStatus.OnProgress, true)] // hari ini
    [InlineData("2026-10-02", WorkStatus.OnProgress, true)] // Jumat
    [InlineData("2026-10-05", WorkStatus.OnProgress, false)] // Senin depan
    [InlineData("2026-09-27", WorkStatus.OnProgress, false)] // sudah lewat (itu "Terlambat")
    [InlineData("2026-09-30", WorkStatus.Done, false)]
    public void Due_this_week_runs_from_today_to_friday(string due, WorkStatus status, bool expected) =>
        Assert.Equal(expected, TaskRules.IsDueThisWeek(DateOnly.Parse(due, System.Globalization.CultureInfo.InvariantCulture), status, Monday));

    [Theory]
    [InlineData(41, 71, 58)] // angka di mockup 03
    [InlineData(0, 0, 0)]
    [InlineData(1, 3, 33)]
    [InlineData(2, 3, 67)]
    [InlineData(5, 5, 100)]
    public void Progress_is_the_rounded_share_of_done_tasks(int done, int total, int percent) =>
        Assert.Equal(percent, TaskRules.ProgressPercent(done, total));
}
