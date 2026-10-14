using Ariadne.Api.Tests.Infrastructure;
using Npgsql;
using Testcontainers.PostgreSql;

[assembly: AssemblyFixture(typeof(PostgresFixture))]

namespace Ariadne.Api.Tests.Infrastructure;

/// <summary>
/// Satu container PostgreSQL untuk seluruh test. Setiap ApiFactory memakai database sendiri
/// supaya test tidak saling mengganggu.
/// </summary>
public sealed class PostgresFixture : IAsyncLifetime
{
    // Sama dengan image di docker-compose.yml supaya perilaku test = perilaku aplikasi.
    private const string Image = "postgres:17.11-alpine";

    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder(Image).Build();

    public ValueTask InitializeAsync() => new(_container.StartAsync());

    public ValueTask DisposeAsync() => _container.DisposeAsync();

    /// <summary>Connection string ke database baru yang masih kosong (dibuat oleh migrasi saat API start).</summary>
    public string NewDatabase()
    {
        var builder = new NpgsqlConnectionStringBuilder(_container.GetConnectionString())
        {
            Database = $"uji_{Guid.NewGuid():N}",
        };
        return builder.ConnectionString;
    }
}
