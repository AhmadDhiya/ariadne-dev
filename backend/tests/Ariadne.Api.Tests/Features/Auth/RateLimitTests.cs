using System.Net;
using Ariadne.Api.Tests.Infrastructure;

namespace Ariadne.Api.Tests.Features.Auth;

public sealed class RateLimitTests(PostgresFixture postgres)
{
    [Fact]
    public async Task Login_and_forgot_password_are_limited_per_address()
    {
        await using var app = new TestApp(postgres.NewDatabase(), new Dictionary<string, string?> { ["RateLimit:AuthPerMinute"] = "3" });
        using var client = app.Anonymous();

        var statuses = new List<HttpStatusCode>();
        for (var i = 0; i < 5; i++)
        {
            statuses.Add((await client.PostApiAsync("/api/auth/login", new { email = "siapa@uji.example", password = "salah-" + i })).StatusCode);
        }

        Assert.Equal([HttpStatusCode.Unauthorized, HttpStatusCode.Unauthorized, HttpStatusCode.Unauthorized, HttpStatusCode.TooManyRequests, HttpStatusCode.TooManyRequests], statuses);
        // Batasnya dibagi antara login dan lupa password, jadi penyerang tidak bisa ganti-ganti endpoint
        Assert.Equal(HttpStatusCode.TooManyRequests, (await client.PostApiAsync("/api/auth/forgot-password", new { email = "siapa@uji.example" })).StatusCode);
    }
}
