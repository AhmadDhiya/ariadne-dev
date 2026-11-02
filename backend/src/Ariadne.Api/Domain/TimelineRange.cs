namespace Ariadne.Api.Domain;

/// <summary>
/// Rentang tanggal grafik per zoom (Hari, Minggu, Bulan). Dashboard pribadi memakai rentang yang pas satu layar;
/// Gantt proyek memakai rentang lebar yang digulir ke samping.
/// </summary>
public static class TimelineRange
{
    /// <summary>Nama zoom yang dikenal: "day", "week", "month" (kosong = day).</summary>
    public static bool IsKnown(string? zoom) => zoom is null or "" or "day" or "week" or "month";

    /// <summary>
    /// Hari: 7 hari sebelum hari ini; Minggu: mulai Senin (satu pekan lalu, atau dua pekan lalu bila lebar); Bulan: tanggal 1
    /// bulan lalu. Jumlah hari: 21/70/210 (satu layar) atau 91/182/366 (lebar).
    /// </summary>
    public static (string Name, DateOnly Start, int Count) For(string? zoom, DateOnly today, bool wide)
    {
        switch (zoom)
        {
            case null or "" or "day":
                return ("day", today.AddDays(-7), wide ? 91 : 21);
            case "week":
                var back = today.AddDays(wide ? -14 : -7);
                return ("week", back.AddDays(-(((int)back.DayOfWeek + 6) % 7)), wide ? 182 : 70);
            case "month":
                var previous = today.AddMonths(-1);
                return ("month", new DateOnly(previous.Year, previous.Month, 1), wide ? 366 : 210);
            default:
                throw new ArgumentOutOfRangeException(nameof(zoom), zoom, "Zoom tidak dikenal.");
        }
    }
}
