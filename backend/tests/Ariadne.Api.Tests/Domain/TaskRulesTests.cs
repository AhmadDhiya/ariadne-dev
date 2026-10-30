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

    private static DateOnly D(string iso) => DateOnly.Parse(iso, System.Globalization.CultureInfo.InvariantCulture);

    [Theory]
    [InlineData("2026-09-21", "2026-09-25", WorkStatus.Blocked, TodayGroup.Overdue)] // SEN-115
    [InlineData("2026-09-23", "2026-09-26", WorkStatus.Fixing, TodayGroup.Overdue)] // SEN-121
    [InlineData("2026-09-21", "2026-09-28", WorkStatus.OnProgress, TodayGroup.DueToday)] // SEN-112
    [InlineData("2026-09-24", "2026-09-30", WorkStatus.OnProgress, TodayGroup.InProgress)]
    [InlineData("2026-09-22", "2026-09-30", WorkStatus.OnRequest, TodayGroup.InProgress)] // tertahan tetap "sedang berjalan"
    [InlineData("2026-09-28", "2026-10-02", WorkStatus.NotStarted, TodayGroup.InProgress)] // mulai hari ini
    [InlineData("2026-10-05", "2026-10-09", WorkStatus.NotStarted, TodayGroup.Upcoming)]
    [InlineData("2026-09-14", "2026-09-18", WorkStatus.Done, null)] // selesai tidak masuk
    [InlineData("2026-09-14", "2026-09-18", WorkStatus.Rutin, TodayGroup.InProgress)] // rutin tidak pernah terlambat
    [InlineData(null, "2026-10-02", WorkStatus.OnProgress, TodayGroup.InProgress)] // tanpa mulai tetapi punya tenggat
    [InlineData("2026-10-05", null, WorkStatus.NotStarted, TodayGroup.Upcoming)]
    [InlineData("2026-09-20", null, WorkStatus.OnProgress, TodayGroup.InProgress)]
    [InlineData(null, null, WorkStatus.OnProgress, null)] // tanpa jadwal tidak masuk
    public void Today_list_groups_follow_the_domain_rules(string? start, string? due, WorkStatus status, TodayGroup? expected) =>
        Assert.Equal(expected, TaskRules.TodayGroupOf(start is null ? null : D(start), due is null ? null : D(due), status, Monday));

    [Theory]
    [InlineData("2026-09-24", "2026-09-30", WorkStatus.OnProgress, "2026-09-24", true)] // batas awal ikut
    [InlineData("2026-09-24", "2026-09-30", WorkStatus.OnProgress, "2026-09-30", true)] // batas akhir ikut
    [InlineData("2026-09-24", "2026-09-30", WorkStatus.OnProgress, "2026-09-23", false)]
    [InlineData("2026-09-24", "2026-09-30", WorkStatus.OnProgress, "2026-10-01", false)]
    [InlineData("2026-09-24", "2026-09-30", WorkStatus.Done, "2026-09-26", false)] // selesai tidak dihitung
    [InlineData("2026-09-24", "2026-09-30", WorkStatus.Rutin, "2026-09-26", true)] // rutin ikut dihitung
    [InlineData("2026-09-24", "2026-09-30", WorkStatus.Blocked, "2026-09-26", true)] // tertahan ikut dihitung
    [InlineData(null, "2026-09-30", WorkStatus.OnProgress, "2026-09-30", true)] // satu tanggal: hanya hari itu
    [InlineData(null, "2026-09-30", WorkStatus.OnProgress, "2026-09-29", false)]
    [InlineData("2026-09-24", null, WorkStatus.OnProgress, "2026-09-24", true)]
    [InlineData(null, null, WorkStatus.OnProgress, "2026-09-24", false)]
    public void A_task_is_active_from_start_through_due_unless_done(string? start, string? due, WorkStatus status, string day, bool active) =>
        Assert.Equal(active, TaskRules.IsActiveOn(start is null ? null : D(start), due is null ? null : D(due), status, D(day)));

    [Fact]
    public void Workload_counts_active_tasks_per_day_across_the_whole_range()
    {
        (DateOnly? Start, DateOnly? Due, WorkStatus Status)[] tasks =
        [
            (D("2026-09-27"), D("2026-09-29"), WorkStatus.OnProgress),
            (D("2026-09-28"), D("2026-09-28"), WorkStatus.Fixing),
            (D("2026-09-28"), D("2026-09-30"), WorkStatus.Done),
            (null, D("2026-09-30"), WorkStatus.Blocked),
        ];

        var counts = TaskRules.WorkloadPerDay(tasks, D("2026-09-26"), 6);

        Assert.Equal([0, 1, 2, 1, 1, 0], counts); // 26 sampai 1 Okt; Done tidak dihitung
    }

    [Theory]
    [InlineData(3, "malam")]
    [InlineData(4, "pagi")]
    [InlineData(10, "pagi")]
    [InlineData(11, "siang")]
    [InlineData(14, "siang")]
    [InlineData(15, "sore")]
    [InlineData(17, "sore")]
    [InlineData(18, "malam")]
    [InlineData(23, "malam")]
    [InlineData(0, "malam")]
    public void The_greeting_follows_the_hour_in_jakarta(int hour, string part) => Assert.Equal(part, TaskRules.DayPart(hour));
}
