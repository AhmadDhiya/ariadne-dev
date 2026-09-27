using System.Net;
using System.Net.Http.Json;
using Ariadne.Api.Features.Health;
using Ariadne.Api.Tests.Infrastructure;

namespace Ariadne.Api.Tests.Features.Health;

public sealed class HealthTests(PostgresFixture postgres)
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Health_is_ok_when_database_is_reachable()
    {
        await using var factory = new ApiFactory(postgres.NewDatabase());
        using var client = factory.CreateClient();

        var response = await client.GetAsync(new Uri("/api/health", UriKind.Relative), Ct);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(new HealthResponse("ok", "ok"), await response.Content.ReadFromJsonAsync<HealthResponse>(Ct));
    }

    [Fact]
    public async Task Health_is_503_without_error_details_when_database_is_unreachable()
    {
        // Port 1 tidak pernah dipakai Postgres: koneksi pasti gagal.
        var unreachable = "Host=127.0.0.1;Port=1;Database=tidak_ada;Username=uji;Timeout=2";
        await using var factory = new ApiFactory(unreachable, settings: new Dictionary<string, string?>
        {
            ["Database:MigrateOnStartup"] = "false",
        });
        using var client = factory.CreateClient();

        var response = await client.GetAsync(new Uri("/api/health", UriKind.Relative), Ct);
        var body = await response.Content.ReadAsStringAsync(Ct);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal(new HealthResponse("degraded", "unreachable"), await response.Content.ReadFromJsonAsync<HealthResponse>(Ct));
        Assert.DoesNotContain("Npgsql", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("127.0.0.1", body, StringComparison.Ordinal);
    }
}
