using System.Net;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;

namespace Ariadne.Api.Infrastructure.Web;

internal static class RateLimiting
{
    public const string AuthPolicy = "auth";

    /// <summary>
    /// Batas percobaan per alamat IP untuk endpoint login dan lupa password (pedoman B10).
    /// Di belakang nginx, alamat asli diambil dari X-Forwarded-For, hanya bila permintaan datang dari
    /// jaringan privat (nginx di jaringan Docker); dari luar header itu diabaikan.
    /// </summary>
    public static IServiceCollection AddAriadneRateLimiting(this IServiceCollection services, IConfiguration config)
    {
        var perMinute = config.GetValue("RateLimit:AuthPerMinute", 20);

        services.Configure<ForwardedHeadersOptions>(options =>
        {
            options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
            options.KnownIPNetworks.Clear();
            options.KnownProxies.Clear();
            foreach (var network in new[] { "127.0.0.0/8", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16" })
            {
                options.KnownIPNetworks.Add(System.Net.IPNetwork.Parse(network));
            }

            options.ForwardLimit = 1;
        });

        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.AddPolicy(AuthPolicy, context => RateLimitPartition.GetFixedWindowLimiter(
                context.Connection.RemoteIpAddress?.ToString() ?? IPAddress.None.ToString(),
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = perMinute,
                    Window = TimeSpan.FromMinutes(1),
                    QueueLimit = 0,
                }));
        });
        return services;
    }
}
