namespace Ariadne.Api.Infrastructure.Web;

internal static class WebSetup
{
    /// <summary>
    /// Error selalu dikembalikan sebagai ProblemDetails. Di luar Development tidak ada detail teknis
    /// (stack trace, pesan exception) yang sampai ke pengguna (pedoman A4).
    /// </summary>
    public static WebApplication UseAriadneErrorHandling(this WebApplication app)
    {
        if (!app.Environment.IsDevelopment())
        {
            app.UseExceptionHandler();
            app.UseHsts();
        }

        app.UseStatusCodePages();
        return app;
    }

    /// <summary>Header keamanan untuk semua respons API (pedoman I3). Header halaman frontend diatur di nginx.</summary>
    public static WebApplication UseSecurityHeaders(this WebApplication app)
    {
        app.Use(async (context, next) =>
        {
            var headers = context.Response.Headers;
            headers.XContentTypeOptions = "nosniff";
            headers.XFrameOptions = "DENY";
            headers.ContentSecurityPolicy = "default-src 'none'; frame-ancestors 'none'";
            headers["Referrer-Policy"] = "no-referrer";
            headers["Cross-Origin-Opener-Policy"] = "same-origin";
            headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
            // Data API bisa berisi data pribadi: jangan disimpan cache browser/proxy.
            headers.CacheControl = "no-store";
            await next(context);
        });
        return app;
    }
}
