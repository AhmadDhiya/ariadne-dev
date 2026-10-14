namespace Ariadne.Api.Infrastructure.Clock;

/// <summary>
/// Satu-satunya sumber waktu aplikasi. Jangan memakai DateTime.Now / DateTime.UtcNow langsung
/// (pedoman E2): "hari ini" selalu dihitung dalam zona Asia/Jakarta.
/// </summary>
public interface IClock
{
    DateTimeOffset UtcNow { get; }

    /// <summary>Tanggal hari ini menurut Asia/Jakarta.</summary>
    DateOnly Today { get; }

    TimeZoneInfo TimeZone { get; }
}

internal sealed class AriadneClock(TimeProvider time, DateOnly? fakeToday) : IClock
{
    public static readonly TimeZoneInfo Jakarta = TimeZoneInfo.FindSystemTimeZoneById("Asia/Jakarta");

    public TimeZoneInfo TimeZone => Jakarta;

    public DateTimeOffset UtcNow
    {
        get
        {
            var now = time.GetUtcNow();
            if (fakeToday is not { } fake)
            {
                return now;
            }

            // Tanggal dikunci, jam tetap berjalan, supaya jam "09.12" di aktivitas tetap masuk akal.
            var local = TimeZoneInfo.ConvertTime(now, Jakarta);
            var shifted = new DateTimeOffset(fake.ToDateTime(TimeOnly.FromTimeSpan(local.TimeOfDay)), local.Offset);
            return shifted.ToUniversalTime();
        }
    }

    public DateOnly Today => DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(UtcNow, Jakarta).DateTime);
}
