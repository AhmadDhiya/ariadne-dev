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
    /// bulan lalu. Jumlah hari: 21/70 (10 pekan utuh) atau 91/182 (26 pekan utuh); Bulan selalu bulan kalender utuh, 7 atau
    /// 12 bulan (jumlah harinya mengikuti panjang bulan, termasuk tahun kabisat).
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
                var first = new DateOnly(previous.Year, previous.Month, 1);
                return ("month", first, first.AddMonths(wide ? 12 : 7).DayNumber - first.DayNumber);
            default:
                throw new ArgumentOutOfRangeException(nameof(zoom), zoom, "Zoom tidak dikenal.");
        }
    }

    /// <summary>
    /// Kolom grafik: tiap hari (Hari), tiap pekan Senin–Minggu (Minggu), atau tiap bulan kalender (Bulan), dipotong sesuai
    /// rentang. Sama persis dengan kolom di layar (frontend lib/gantt, timeScale), jadi angka beban per kolom sejajar.
    /// </summary>
    public static List<(DateOnly From, int Days)> Columns(string zoom, DateOnly start, int count)
    {
        var columns = new List<(DateOnly From, int Days)>();
        var end = start.AddDays(count); // eksklusif
        for (var from = start; from < end;)
        {
            var next = zoom switch
            {
                "week" => from.AddDays(7 - (((int)from.DayOfWeek + 6) % 7)),
                "month" => new DateOnly(from.Year, from.Month, 1).AddMonths(1),
                _ => from.AddDays(1),
            };
            if (next > end)
            {
                next = end;
            }

            columns.Add((from, next.DayNumber - from.DayNumber));
            from = next;
        }

        return columns;
    }
}
