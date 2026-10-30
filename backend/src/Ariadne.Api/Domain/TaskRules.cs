namespace Ariadne.Api.Domain;

/// <summary>
/// Aturan turunan task (docs/domain.md): dihitung di satu tempat, tidak disimpan, dan diuji dengan test unit.
/// Frontend hanya menampilkan hasilnya (pedoman E6).
/// </summary>
public static class TaskRules
{
    /// <summary>Status tertahan: Blocked, OnHold, OnRequest. Alasannya wajib.</summary>
    public static bool IsHeld(WorkStatus status) => status is WorkStatus.Blocked or WorkStatus.OnHold or WorkStatus.OnRequest;

    /// <summary>Terlambat: tanggal selesai sudah lewat dan status bukan Done dan bukan Rutin.</summary>
    public static bool IsOverdue(DateOnly? dueDate, WorkStatus status, DateOnly today) =>
        dueDate is { } due && due < today && status is not (WorkStatus.Done or WorkStatus.Rutin);

    /// <summary>"Telat N hari" (hari kalender); 0 bila tidak terlambat.</summary>
    public static int LateDays(DateOnly? dueDate, WorkStatus status, DateOnly today) =>
        IsOverdue(dueDate, status, today) && dueDate is { } due ? today.DayNumber - due.DayNumber : 0;

    /// <summary>Durasi = jumlah hari kerja Senin–Jumat dari mulai sampai selesai, inklusif. Null bila salah satu tanggal kosong.</summary>
    public static int? WorkingDays(DateOnly? start, DateOnly? due)
    {
        if (start is not { } from || due is not { } to || to < from)
        {
            return null;
        }

        var count = 0;
        for (var day = from; day <= to; day = day.AddDays(1))
        {
            if (day.DayOfWeek is not (DayOfWeek.Saturday or DayOfWeek.Sunday))
            {
                count++;
            }
        }

        return count;
    }

    /// <summary>Jumat pekan ini; bila hari ini Sabtu atau Minggu, Jumat pekan depan (batas "Minggu ini").</summary>
    public static DateOnly EndOfWorkWeek(DateOnly today)
    {
        var daysToFriday = ((int)DayOfWeek.Friday - (int)today.DayOfWeek + 7) % 7;
        return today.AddDays(daysToFriday);
    }

    /// <summary>"Minggu ini": selesai antara hari ini dan Jumat pekan ini, dan belum selesai.</summary>
    public static bool IsDueThisWeek(DateOnly? dueDate, WorkStatus status, DateOnly today) =>
        dueDate is { } due && due >= today && due <= EndOfWorkWeek(today) && status is not WorkStatus.Done;

    /// <summary>Progres proyek: task Done dibagi semua task (tanpa sub-task), dalam persen bulat.</summary>
    public static int ProgressPercent(int done, int total) => total == 0 ? 0 : (int)Math.Round(done * 100.0 / total, MidpointRounding.AwayFromZero);

    /// <summary>
    /// Kelompok di daftar "Hari Ini" (docs/domain.md): Terlambat, lalu jatuh tempo hari ini, lalu sedang berjalan.
    /// Task Done tidak masuk. Task tanpa jadwal sama sekali tidak masuk; task tanpa tanggal mulai tetapi punya tenggat
    /// dianggap sudah berjalan sampai tenggatnya. "Mendatang" (mulai setelah hari ini) hanya tampil bila daftar disaring kartu.
    /// </summary>
    public static TodayGroup? TodayGroupOf(DateOnly? start, DateOnly? due, WorkStatus status, DateOnly today)
    {
        if (status == WorkStatus.Done)
        {
            return null;
        }

        if (IsOverdue(due, status, today))
        {
            return TodayGroup.Overdue;
        }

        if (due == today)
        {
            return TodayGroup.DueToday;
        }

        if (start is { } from)
        {
            return from <= today ? TodayGroup.InProgress : TodayGroup.Upcoming;
        }

        return due is null ? null : TodayGroup.InProgress;
    }

    /// <summary>
    /// Task aktif pada hari D: mulai ≤ D ≤ selesai dan status bukan Done (Rutin ikut). Bila hanya satu tanggal yang ada,
    /// task dihitung aktif pada hari itu saja; tanpa tanggal tidak dihitung.
    /// </summary>
    public static bool IsActiveOn(DateOnly? start, DateOnly? due, WorkStatus status, DateOnly day)
    {
        if (status == WorkStatus.Done)
        {
            return false;
        }

        var from = start ?? due;
        var to = due ?? start;
        return from is { } a && to is { } b && a <= day && day <= b;
    }

    /// <summary>Jumlah task aktif per hari untuk `days` hari berturut-turut mulai dari `from` (dasar heatmap beban kerja).</summary>
    public static int[] WorkloadPerDay(IReadOnlyCollection<(DateOnly? Start, DateOnly? Due, WorkStatus Status)> tasks, DateOnly from, int days)
    {
        var counts = new int[days];
        for (var i = 0; i < days; i++)
        {
            var day = from.AddDays(i);
            counts[i] = tasks.Count(t => IsActiveOn(t.Start, t.Due, t.Status, day));
        }

        return counts;
    }

    /// <summary>Sapaan menurut jam di Asia/Jakarta: pagi 04-10, siang 11-14, sore 15-17, selain itu malam.</summary>
    public static string DayPart(int hour) => hour switch
    {
        >= 4 and <= 10 => "pagi",
        >= 11 and <= 14 => "siang",
        >= 15 and <= 17 => "sore",
        _ => "malam",
    };
}

/// <summary>Kelompok task di daftar "Hari Ini".</summary>
public enum TodayGroup
{
    Overdue,
    DueToday,
    InProgress,
    Upcoming,
}
