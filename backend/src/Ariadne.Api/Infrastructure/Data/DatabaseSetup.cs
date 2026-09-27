using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Ariadne.Api.Infrastructure.Data;

internal static class DatabaseSetup
{
    public static IServiceCollection AddAriadneDatabase(this IServiceCollection services, IConfiguration config)
    {
        // Connection string (berisi password) hanya dari environment / user-secrets, tidak pernah dari file di repo (pedoman A1).
        var connectionString = config.GetConnectionString("Default")
            ?? throw new InvalidOperationException("ConnectionStrings:Default belum diisi. Lihat README bagian \"Konfigurasi\".");

        services.AddDbContext<AppDbContext>(options => Configure(options, connectionString));
        services.AddDataProtection()
            .SetApplicationName("Ariadne")
            .PersistKeysToDbContext<AppDbContext>();
        return services;
    }

    public static async Task MigrateDatabaseIfConfiguredAsync(this WebApplication app)
    {
        if (!app.Configuration.GetValue<bool>("Database:MigrateOnStartup"))
        {
            return;
        }

        await using var scope = app.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();
    }

    internal static void Configure(DbContextOptionsBuilder options, string connectionString) =>
        options.UseNpgsql(connectionString).UseSnakeCaseNamingConvention();
}

/// <summary>
/// Dipakai hanya oleh "dotnet ef migrations add": membuat file migrasi tidak butuh koneksi database,
/// jadi connection string di sini sengaja tanpa password.
/// </summary>
internal sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>();
        DatabaseSetup.Configure(options, "Host=localhost;Database=ariadne_design");
        return new AppDbContext(options.Options);
    }
}
