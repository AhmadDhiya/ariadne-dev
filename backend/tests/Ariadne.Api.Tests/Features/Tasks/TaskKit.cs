using System.Net;
using Ariadne.Api.Features.Projects;
using Ariadne.Api.Features.Tasks;
using Ariadne.Api.Tests.Infrastructure;

namespace Ariadne.Api.Tests.Features.Tasks;

/// <summary>
/// Perlengkapan test task: setiap test membuat proyek barunya sendiri (Admin otomatis jadi Pengelolanya,
/// ditambah Anggota dan Tamu), jadi test tidak saling mengganggu walau memakai database yang sama.
/// </summary>
internal static class TaskKit
{
    public sealed record Site(Guid Root, Guid Child, string Code, HttpClient Manager, HttpClient Member, HttpClient Guest);

    public static async Task<Site> NewSiteAsync(TestApp app, World world)
    {
        var admin = await app.ClientAsync(world.Admin);
        var code = "T" + Guid.NewGuid().ToString("N")[..5].ToUpperInvariant();
        var created = await admin.PostApiAsync("/api/projects", new { name = $"Proyek {code}", code });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var root = (await created.ReadAsync<ProjectNode>()).Id;

        Assert.Equal(HttpStatusCode.NoContent, (await admin.PostApiAsync($"/api/projects/{root}/members", new { userId = world.Member.Id, role = "Anggota" })).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await admin.PostApiAsync($"/api/projects/{root}/members", new { userId = world.Guest.Id, role = "Tamu" })).StatusCode);

        var child = await admin.PostApiAsync($"/api/projects/{root}/children", new { name = "Modul" });
        Assert.Equal(HttpStatusCode.Created, child.StatusCode);

        return new Site(
            root,
            (await child.ReadAsync<ProjectNode>()).Id,
            code,
            admin,
            await app.ClientAsync(world.Member),
            await app.ClientAsync(world.Guest));
    }

    public static async Task<TaskRow> NewTaskAsync(HttpClient client, Guid projectId, object? body = null)
    {
        var response = await client.PostApiAsync($"/api/projects/{projectId}/tasks", body ?? new { title = $"Task {Guid.NewGuid():N}" });
        Assert.True(response.StatusCode == HttpStatusCode.Created, await response.TextAsync());
        return await response.ReadAsync<TaskRow>();
    }

    public static async Task<TaskList> ListAsync(HttpClient client, Guid projectId, string query = "")
    {
        var response = await client.GetApiAsync($"/api/projects/{projectId}/tasks{(query.Length > 0 ? "?" + query : "")}");
        Assert.True(response.StatusCode == HttpStatusCode.OK, await response.TextAsync());
        return await response.ReadAsync<TaskList>();
    }

    public static async Task<ActivityItem> AddActivityAsync(HttpClient client, Guid taskId, string kind, string body, params Guid[] mentions)
    {
        var response = await client.PostApiAsync($"/api/tasks/{taskId}/activities", new { kind, body, mentionUserIds = mentions });
        Assert.True(response.StatusCode == HttpStatusCode.Created, await response.TextAsync());
        return await response.ReadAsync<ActivityItem>();
    }

    public static async Task<ActivityPage> ActivitiesAsync(HttpClient client, Guid taskId, string query = "")
    {
        var response = await client.GetApiAsync($"/api/tasks/{taskId}/activities{(query.Length > 0 ? "?" + query : "")}");
        Assert.True(response.StatusCode == HttpStatusCode.OK, await response.TextAsync());
        return await response.ReadAsync<ActivityPage>();
    }

    public static async Task<IReadOnlyDictionary<string, string[]>> ErrorsAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        return (await response.ReadAsync<ProblemBody>()).Errors ?? [];
    }
}
