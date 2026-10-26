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
}
