using System.Net.Http.Json;
using Ariadne.Api.Tests.Infrastructure;
using Microsoft.AspNetCore.Http.Metadata;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace Ariadne.Api.Tests.Platform;

/// <summary>
/// Matriks izin (pedoman F4): setiap endpoint dicoba oleh setiap jenis pengguna dan hasilnya harus persis
/// seperti yang dirancang di docs/domain.md. Hasil dikelompokkan:
///   A = lolos pemeriksaan izin (bisa 2xx, atau 400/409 karena isi uji sengaja tidak lengkap),
///   U = 401 belum login, F = 403 dilarang, N = 404 (keberadaannya dirahasiakan).
/// Menambah endpoint baru TANPA baris di sini membuat test "Every_endpoint_is_in_the_matrix" gagal.
/// </summary>
public sealed class PermissionMatrixTests(WorldFixture fx) : IClassFixture<WorldFixture>
{
    // Urutan ini dipakai oleh string hasil di setiap baris
    private static readonly string[] Actors =
    [
        "Anonim", "Admin", "Supervisor", "SupervisorLain", "Anggota", "Pengelola", "Tamu", "OrangLuar", "PengelolaLain",
    ];

    private sealed record Row(string Name, HttpMethod Method, Func<World, string> Url, Func<World, object?> Body, string Expected);

    private static Row Get(string url, string expected, string? name = null) =>
        new(name ?? $"GET {url}", HttpMethod.Get, w => Fill(url, w), _ => null, expected);

    private static Row Req(HttpMethod method, string pattern, string expected, Func<World, object?>? body = null) =>
        new($"{method} {pattern}", method, w => Fill(pattern, w), body ?? (_ => null), expected);

    private static string Fill(string pattern, World w) => pattern
        .Replace("{teamA}", w.TeamA.ToString(), StringComparison.Ordinal)
        .Replace("{alpha}", w.ProjectAlpha.ToString(), StringComparison.Ordinal)
        .Replace("{task}", w.TaskAlpha.ToString(), StringComparison.Ordinal)
        .Replace("{activity}", w.ActivityAlpha.ToString(), StringComparison.Ordinal)
        .Replace("{milestone}", w.MilestoneAlpha.ToString(), StringComparison.Ordinal)
        .Replace("{member}", w.Member.Id.ToString(), StringComparison.Ordinal)
        .Replace("{outsider}", w.Outsider.Id.ToString(), StringComparison.Ordinal);

    //                                                              Anon Adm Sup SupL Ang  Pgl Tamu Luar PglL
    private static readonly Row[] Rows =
    [
        Get("/api/health",                                          "AAAAAAAAA"),
        Get("/api/auth/me",                                         "UAAAAAAAA"),
        Get("/api/users",                                           "UAFFFFFFF"),
        Req(HttpMethod.Post,  "/api/users",                         "UAFFFFFFF", _ => new { email = "bukan-email", displayName = "X" }),
        Req(HttpMethod.Patch, "/api/users/{outsider}",              "UAFFFFFFF", _ => new { }),
        Get("/api/users/lookup?q=x",                                "UAAAFAFFA"),
        Get("/api/teams",                                           "UAAAAAFAA"),
        Req(HttpMethod.Post,  "/api/teams",                         "UAFFFFFFF", _ => new { name = "" }),
        Get("/api/teams/{teamA}",                                   "UAANANFNN"),
        Req(HttpMethod.Patch, "/api/teams/{teamA}",                 "UAANFNNNN", _ => new { name = "   " }),
        Req(HttpMethod.Post,  "/api/teams/{teamA}/members",         "UAANFNNNN", w => new { userId = Guid.NewGuid(), role = "Anggota" }),
        Req(HttpMethod.Patch, "/api/teams/{teamA}/members/{member}", "UAANFNNNN", _ => new { role = "Anggota" }),
        Get("/api/projects/tree",                                   "UAAAAAAAA"),
        Get("/api/projects/{alpha}",                                "UANNAAANN"),
        Req(HttpMethod.Post,  "/api/projects",                      "UAFFFFFFF", _ => new { name = "", code = "" }),
        Req(HttpMethod.Post,  "/api/projects/{alpha}/children",     "UANNFAFNN", _ => new { name = "   " }),
        Req(HttpMethod.Patch, "/api/projects/{alpha}",              "UANNFAFNN", _ => new { }),
        Get("/api/projects/{alpha}/members",                        "UANNAAANN"),
        Req(HttpMethod.Post,  "/api/projects/{alpha}/members",      "UANNFAFNN", _ => new { userId = Guid.NewGuid(), role = "Anggota" }),
        Req(HttpMethod.Patch, "/api/projects/{alpha}/members/{member}", "UANNFAFNN", _ => new { role = "Anggota" }),
        Get("/api/projects/{alpha}/tasks",                          "UANNAAANN"),
        Req(HttpMethod.Post,  "/api/projects/{alpha}/tasks",        "UFNNAAFNN", _ => new { title = "   " }),
        Get("/api/projects/{alpha}/labels",                         "UANNAAANN"),
        Get("/api/tasks/{task}",                                    "UANNAAANN"),
        Req(HttpMethod.Patch, "/api/tasks/{task}",                  "UFNNAAFNN", _ => new { }),
        Req(HttpMethod.Put,   "/api/tasks/{task}/status",           "UFNNAAFNN", _ => new { status = "Bukan Status" }),
        Req(HttpMethod.Put,   "/api/tasks/{task}/dates",            "UFNNAAFNN", _ => new { startDate = "2030-01-02", dueDate = "2030-01-01" }),
        Req(HttpMethod.Put,   "/api/tasks/{task}/assignees",        "UFNNAAFNN", _ => new { userIds = new[] { Guid.NewGuid() } }),
        Req(HttpMethod.Post,  "/api/tasks/{task}/subtasks",         "UFNNAAFNN", _ => new { title = "   " }),
        Get("/api/tasks/{task}/activities",                         "UANNAAANN"),
        // Komentar biasa boleh ditulis Tamu; Update dan Internal tidak (diuji per jenis di ActivityTests)
        Req(HttpMethod.Post,  "/api/tasks/{task}/activities",       "UFNNAAANN", _ => new { kind = "Comment", body = "   " }),
        // Hanya penulis (Anggota) yang boleh mengubah; yang bisa melihat tetapi bukan penulis mendapat 403
        // Milestone: semua anggota melihat; hanya Pengelola dan Admin yang mengelola (Admin boleh walau bukan anggota)
        Get("/api/projects/{alpha}/milestones",                     "UANNAAANN"),
        Req(HttpMethod.Post,  "/api/projects/{alpha}/milestones",   "UANNFAFNN", _ => new { name = "   " }),
        Req(HttpMethod.Patch, "/api/milestones/{milestone}",        "UANNFAFNN", _ => new { }),
        Get("/api/projects/{alpha}/gantt",                          "UANNAAANN"),
        // Dashboard dan pencarian milik pengguna yang login sendiri: hasilnya hanya yang boleh ia lihat (diuji di DashboardTests dan SearchTests)
        Get("/api/dashboard",                                       "UAAAAAAAA"),
        Get("/api/dashboard/timeline",                              "UAAAAAAAA"),
        Get("/api/search?q=alpha",                                  "UAAAAAAAA"),
        Req(HttpMethod.Patch, "/api/tasks/{task}/activities/{activity}", "UFNNAFFNN", _ => new { body = "   " }),
    ];

    public static IEnumerable<object[]> Cases()
    {
        for (var r = 0; r < Rows.Length; r++)
        {
            for (var a = 0; a < Actors.Length; a++)
            {
                yield return [Rows[r].Name, Actors[a]];
            }
        }
    }

    private TestUser? UserFor(string actor) => actor switch
    {
        "Anonim" => null,
        "Admin" => fx.World.Admin,
        "Supervisor" => fx.World.Supervisor,
        "SupervisorLain" => fx.World.OtherSupervisor,
        "Anggota" => fx.World.Member,
        "Pengelola" => fx.World.Manager,
        "Tamu" => fx.World.Guest,
        "OrangLuar" => fx.World.Outsider,
        "PengelolaLain" => fx.World.OtherManager,
        _ => throw new ArgumentOutOfRangeException(nameof(actor)),
    };

    private static char Classify(int status) => status switch
    {
        401 => 'U',
        403 => 'F',
        404 => 'N',
        >= 500 => 'E', // kesalahan server tidak pernah boleh lolos sebagai "izin benar"
        _ => 'A',
    };

    [Theory]
    [MemberData(nameof(Cases))]
    public async Task Each_endpoint_gives_each_kind_of_user_exactly_the_designed_answer(string rowName, string actor)
    {
        var row = Rows.Single(r => r.Name == rowName);
        var expected = row.Expected[Array.IndexOf(Actors, actor)];
        var user = UserFor(actor);
        var client = user is null ? fx.App.Anonymous() : await fx.App.ClientAsync(user);

        using var request = new HttpRequestMessage(row.Method, new Uri(row.Url(fx.World), UriKind.Relative));
        var body = row.Body(fx.World);
        if (body is not null)
        {
            request.Content = JsonContent.Create(body, options: HttpExtensions.Json);
        }

        var response = await client.SendAsync(request, TestContext.Current.CancellationToken);

        Assert.True(
            Classify((int)response.StatusCode) == expected,
            $"{rowName} sebagai {actor}: diharapkan {expected}, dapat {(int)response.StatusCode} ({Classify((int)response.StatusCode)})");
    }

    [Fact]
    public void Every_row_has_one_answer_per_kind_of_user()
    {
        foreach (var row in Rows)
        {
            Assert.True(row.Expected.Length == Actors.Length, $"{row.Name}: harus {Actors.Length} huruf hasil, ada {row.Expected.Length}");
        }

        Assert.Equal(Rows.Length, Rows.Select(r => r.Name).Distinct().Count());
    }

    [Fact]
    public void Every_endpoint_is_in_the_matrix()
    {
        // Endpoint yang sengaja tidak dimasukkan (berbahaya diulang berkali-kali, atau sudah diuji rinci di tempat lain)
        string[] covered = [.. Rows.Select(r => r.Name)];
        string[] exempt =
        [
            "POST /api/auth/login", "POST /api/auth/logout", "POST /api/auth/forgot-password", "POST /api/auth/reset-password",
            "PATCH /api/me", "POST /api/me/change-password", // diuji di LoginTests
            "DELETE /api/teams/{id}/members/{userId}", // merusak data; diuji di TeamTests
            "POST /api/projects/{id}/archive", // merusak data; diuji di ProjectTests
            "DELETE /api/projects/{id}/members/{userId}", // merusak data; diuji di ProjectMemberTests
            "DELETE /api/tasks/{id}", // merusak data; diuji di TaskTests (semua peran)
            "DELETE /api/tasks/{id}/activities/{activityId}", // merusak data; diuji di ActivityTests (semua peran)
            "DELETE /api/milestones/{id}", // merusak data; diuji di MilestoneTests (semua peran)
        ];

        var routes = fx.App.Factory.Services.GetRequiredService<EndpointDataSource>().Endpoints
            .OfType<RouteEndpoint>()
            .SelectMany(e => (e.Metadata.GetMetadata<IHttpMethodMetadata>()?.HttpMethods ?? ["*"])
                .Select(method => $"{method} {e.RoutePattern.RawText}"))
            .Where(route => route.Contains("/api/", StringComparison.Ordinal))
            .Select(route => route.Replace(":guid", "", StringComparison.Ordinal).TrimEnd('/'))
            .ToList();

        var missing = routes.Where(route => !exempt.Contains(route) && !covered.Any(c => SameEndpoint(c, route))).ToList();
        Assert.True(missing.Count == 0, "Endpoint belum ada di matriks izin: " + string.Join(", ", missing));
    }

    /// <summary>Membandingkan "GET /api/teams/{teamA}" dengan pola rute "GET /api/teams/{id}".</summary>
    private static bool SameEndpoint(string rowName, string route)
    {
        var a = rowName.Split(' ', 2);
        var b = route.Split(' ', 2);
        if (a[0] != b[0])
        {
            return false;
        }

        static string[] Segments(string path) => path.Split('?')[0].Trim('/').Split('/');
        var x = Segments(a[1]);
        var y = Segments(b[1]);
        return x.Length == y.Length
            && x.Zip(y).All(pair => pair.First == pair.Second || (pair.First.StartsWith('{') && pair.Second.StartsWith('{')));
    }
}
