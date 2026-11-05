using System.Net;
using Ariadne.Api.Tests.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Infrastructure;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace Ariadne.Api.Tests.Platform;

public sealed class SecurityTests(PostgresFixture postgres)
{
    /// <summary>
    /// Daftar endpoint yang boleh diakses tanpa login. Menambah endpoint publik baru harus
    /// disengaja: tambahkan di sini dan jelaskan alasannya di review (pedoman B3).
    /// </summary>
    private static readonly string[] AnonymousAllowlist =
    [
        "GET /api/health",
        "POST /api/auth/forgot-password",
        "POST /api/auth/login",
        "POST /api/auth/reset-password",
        // Halaman terima undangan: orangnya belum punya akun (token di badan permintaan, dibatasi laju)
        "POST /api/invitations/accept",
        "POST /api/invitations/preview",
    ];

    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Every_endpoint_requires_login_by_default()
    {
        await using var factory = new ApiFactory(postgres.NewDatabase());

        var policyProvider = factory.Services.GetRequiredService<IAuthorizationPolicyProvider>();
        var fallback = await policyProvider.GetFallbackPolicyAsync();

        Assert.NotNull(fallback);
        Assert.Contains(fallback.Requirements, r => r is DenyAnonymousAuthorizationRequirement);
    }

    [Fact]
    public async Task Only_allowlisted_endpoints_are_public()
    {
        await using var factory = new ApiFactory(postgres.NewDatabase());

        var publicEndpoints = factory.Services.GetRequiredService<EndpointDataSource>().Endpoints
            .OfType<RouteEndpoint>()
            .Where(e => e.Metadata.GetMetadata<IAllowAnonymous>() is not null)
            .SelectMany(e => (e.Metadata.GetMetadata<IHttpMethodMetadata>()?.HttpMethods ?? ["*"])
                .Select(method => $"{method} {e.RoutePattern.RawText}"))
            .Order(StringComparer.Ordinal);

        Assert.Equal(AnonymousAllowlist.Order(StringComparer.Ordinal), publicEndpoints);
    }

    [Fact]
    public async Task Api_responses_carry_security_headers()
    {
        await using var factory = new ApiFactory(postgres.NewDatabase());
        using var client = factory.CreateClient();

        var response = await client.GetAsync(new Uri("/api/health", UriKind.Relative), Ct);

        Assert.Equal("nosniff", response.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.Equal("DENY", response.Headers.GetValues("X-Frame-Options").Single());
        Assert.Equal("no-referrer", response.Headers.GetValues("Referrer-Policy").Single());
        Assert.Contains("frame-ancestors 'none'", response.Headers.GetValues("Content-Security-Policy").Single(), StringComparison.Ordinal);
        Assert.True(response.Headers.CacheControl?.NoStore);
    }

    [Fact]
    public async Task Server_errors_in_production_do_not_leak_details()
    {
        await using var factory = new ApiFactory(
            postgres.NewDatabase(),
            environment: "Production",
            configureServices: services => services.AddSingleton<IStartupFilter, ThrowingEndpointFilter>());
        using var client = factory.CreateClient();

        var response = await client.GetAsync(new Uri(ThrowingEndpointFilter.Path, UriKind.Relative), Ct);
        var body = await response.Content.ReadAsStringAsync(Ct);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.DoesNotContain(ThrowingEndpointFilter.SecretMessage, body, StringComparison.Ordinal);
        Assert.DoesNotContain("InvalidOperationException", body, StringComparison.Ordinal);
        Assert.DoesNotContain(" at ", body, StringComparison.Ordinal);
    }
}
