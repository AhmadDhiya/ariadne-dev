using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Ariadne.Api.Tests.Infrastructure;

internal static class HttpExtensions
{
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static Uri Rel(string url) => new(url, UriKind.Relative);

    public static Task<HttpResponseMessage> GetApiAsync(this HttpClient client, string url) => client.GetAsync(Rel(url), Ct);

    public static Task<HttpResponseMessage> PostApiAsync(this HttpClient client, string url, object? body = null) =>
        client.PostAsJsonAsync(Rel(url), body ?? new { }, Json, Ct);

    public static Task<HttpResponseMessage> PatchApiAsync(this HttpClient client, string url, object body) =>
        client.PatchAsJsonAsync(Rel(url), body, Json, Ct);

    public static Task<HttpResponseMessage> PutApiAsync(this HttpClient client, string url, object body) =>
        client.PutAsJsonAsync(Rel(url), body, Json, Ct);

    public static Task<HttpResponseMessage> DeleteApiAsync(this HttpClient client, string url) => client.DeleteAsync(Rel(url), Ct);

    public static async Task<T> ReadAsync<T>(this HttpResponseMessage response)
    {
        var value = await response.Content.ReadFromJsonAsync<T>(Json, Ct);
        return value ?? throw new InvalidOperationException("Respons kosong");
    }

    /// <summary>Isi respons sebagai teks, untuk pesan gagal yang jelas.</summary>
    public static Task<string> TextAsync(this HttpResponseMessage response) => response.Content.ReadAsStringAsync(Ct);
}
