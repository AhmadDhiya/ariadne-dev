using Ariadne.Api.Infrastructure.Clock;
using Ariadne.Api.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace Ariadne.Api.Tests.Platform;

public sealed class ClockTests(PostgresFixture postgres)
{
    // Tanggal yang pasti bukan "hari ini" sungguhan, supaya test tidak bisa lulus karena kebetulan.
    private static readonly DateOnly FakeDate = new(2000, 1, 3);

    private sealed class FixedTimeProvider(DateTimeOffset utcNow) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => utcNow;
    }

    private static AriadneClock ClockAt(string utc, DateOnly? fakeToday = null) =>
        new(new FixedTimeProvider(DateTimeOffset.Parse(utc, System.Globalization.CultureInfo.InvariantCulture)), fakeToday);

    [Theory]
    [InlineData("2026-09-27T16:59:00Z", "2026-09-27")] // 23.59 WIB: masih tanggal 27
    [InlineData("2026-09-27T17:00:00Z", "2026-09-28")] // 00.00 WIB: sudah tanggal 28
    [InlineData("2026-09-28T02:12:00Z", "2026-09-28")] // 09.12 WIB
    public void Today_follows_Jakarta_midnight_not_UTC(string utcNow, string expectedToday)
    {
        Assert.Equal(DateOnly.Parse(expectedToday, System.Globalization.CultureInfo.InvariantCulture), ClockAt(utcNow).Today);
    }

    [Fact]
    public void Fake_today_locks_the_date_but_keeps_the_time_of_day()
    {
        var clock = ClockAt("2026-01-05T02:12:00Z", fakeToday: new DateOnly(2026, 9, 28)); // 09.12 WIB

        Assert.Equal(new DateOnly(2026, 9, 28), clock.Today);
        Assert.Equal(new DateTimeOffset(2026, 9, 28, 2, 12, 0, TimeSpan.Zero), clock.UtcNow);
    }

    [Fact]
    public async Task Fake_today_applies_in_development()
    {
        await using var factory = new ApiFactory(postgres.NewDatabase(), "Development", FakeTodaySetting());

        Assert.Equal(FakeDate, factory.Services.GetRequiredService<IClock>().Today);
    }

    [Fact]
    public async Task Fake_today_is_ignored_in_production()
    {
        await using var factory = new ApiFactory(postgres.NewDatabase(), "Production", FakeTodaySetting());

        Assert.NotEqual(FakeDate, factory.Services.GetRequiredService<IClock>().Today);
    }

    private static Dictionary<string, string?> FakeTodaySetting() => new()
    {
        [ClockSetup.FakeTodayKey] = FakeDate.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture),
    };
}
