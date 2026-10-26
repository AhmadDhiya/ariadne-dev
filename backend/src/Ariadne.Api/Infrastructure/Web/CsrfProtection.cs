namespace Ariadne.Api.Infrastructure.Web;

/// <summary>
/// Perlindungan CSRF (pedoman B7). Cookie login sudah SameSite=Strict; lapisan kedua: semua permintaan yang
/// mengubah data wajib membawa header khusus. Situs lain tidak bisa menambahkan header khusus ke permintaan
/// lintas-origin tanpa izin CORS, dan API ini tidak pernah memberi izin CORS.
/// </summary>
internal static class CsrfProtection
{
    public const string HeaderName = "X-Requested-With";
    public const string HeaderValue = "ariadne";

    public static WebApplication UseCsrfProtection(this WebApplication app)
    {
        app.Use(async (context, next) =>
        {
            var method = context.Request.Method;
            var changesData = !HttpMethods.IsGet(method) && !HttpMethods.IsHead(method)
                && !HttpMethods.IsOptions(method) && !HttpMethods.IsTrace(method);

            if (changesData
                && context.Request.Path.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase)
                && context.Request.Headers[HeaderName] != HeaderValue)
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                await context.Response.WriteAsJsonAsync(new { title = "Permintaan ditolak." });
                return;
            }

            await next(context);
        });
        return app;
    }
}
