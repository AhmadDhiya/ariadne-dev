using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;

namespace Ariadne.Api.Tests.Infrastructure;

/// <summary>Menjalankan API di dalam proses test, dengan environment dan pengaturan yang bisa dipilih.</summary>
public sealed class ApiFactory(
    string connectionString,
    string environment = "Development",
    IReadOnlyDictionary<string, string?>? settings = null,
    Action<IServiceCollection>? configureServices = null) : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(environment);
        builder.UseSetting("ConnectionStrings:Default", connectionString);
        builder.UseSetting("Database:MigrateOnStartup", "true");
        // Job notifikasi harian dijalankan langsung oleh test yang membutuhkannya, bukan oleh jadwal di latar belakang
        builder.UseSetting("Notifications:DailyJob", "false");
        foreach (var (key, value) in settings ?? new Dictionary<string, string?>())
        {
            builder.UseSetting(key, value);
        }

        if (configureServices is not null)
        {
            builder.ConfigureTestServices(configureServices);
        }
    }
}
