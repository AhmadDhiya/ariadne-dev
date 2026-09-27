using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace Ariadne.Api.Tests.Infrastructure;

/// <summary>
/// Khusus test: memasang endpoint yang selalu melempar exception, supaya kita bisa memastikan
/// pesan error internal tidak pernah sampai ke pengguna. Tidak ada di kode produksi.
/// </summary>
internal sealed class ThrowingEndpointFilter : IStartupFilter
{
    public const string Path = "/api/__uji/error";
    public const string SecretMessage = "rahasia-internal-jangan-bocor";

    public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next) => app =>
    {
        var endpoint = new Endpoint(
            _ => throw new InvalidOperationException(SecretMessage),
            new EndpointMetadataCollection(new AllowAnonymousAttribute()),
            "uji-error");

        // Endpoint dipilih lebih dulu; routing aplikasi melewatinya, lalu pipeline aplikasi
        // (termasuk penanganan error) berjalan seperti biasa.
        app.Use((context, nextMiddleware) =>
        {
            if (context.Request.Path == Path)
            {
                context.SetEndpoint(endpoint);
            }

            return nextMiddleware(context);
        });
        next(app);
    };
}
