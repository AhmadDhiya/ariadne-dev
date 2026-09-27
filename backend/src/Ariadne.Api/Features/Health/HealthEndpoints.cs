using Ariadne.Api.Infrastructure.Data;

namespace Ariadne.Api.Features.Health;

public sealed record HealthResponse(string Status, string Database);

internal static class HealthEndpoints
{
    public static IEndpointRouteBuilder MapHealthEndpoints(this IEndpointRouteBuilder app)
    {
        // Publik supaya Docker bisa memeriksa API hidup. Tidak membocorkan detail error database.
        app.MapGet("/api/health", async (AppDbContext db, CancellationToken ct) =>
            await db.Database.CanConnectAsync(ct)
                ? Results.Ok(new HealthResponse("ok", "ok"))
                : Results.Json(new HealthResponse("degraded", "unreachable"), statusCode: StatusCodes.Status503ServiceUnavailable))
            .AllowAnonymous();

        return app;
    }
}
