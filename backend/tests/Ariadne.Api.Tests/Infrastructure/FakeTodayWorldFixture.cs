namespace Ariadne.Api.Tests.Infrastructure;

/// <summary>
/// Seperti WorldFixture, tetapi "hari ini" dikunci ke Senin 28 September 2026 (seperti mode demo), supaya aturan
/// berbasis tanggal (terlambat, minggu ini) bisa diuji dengan tanggal tetap.
/// </summary>
public sealed class FakeTodayWorldFixture(PostgresFixture postgres) : IAsyncLifetime
{
    /// <summary>Hari ini menurut aplikasi uji.</summary>
    public static readonly DateOnly Today = new(2026, 9, 28);

    public TestApp App { get; private set; } = null!;

    public World World => App.World!;

    public async ValueTask InitializeAsync() => App = await TestApp.CreateWithWorldAsync(
        postgres,
        new Dictionary<string, string?>
        {
            ["RateLimit:AuthPerMinute"] = "100000",
            ["Ariadne:FakeToday"] = "2026-09-28",
        });

    public async ValueTask DisposeAsync() => await App.DisposeAsync();
}
