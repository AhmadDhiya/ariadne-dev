using System.Net;
using Ariadne.Api.Features.Search;
using Ariadne.Api.Features.Tasks;
using Ariadne.Api.Tests.Features.Tasks;
using Ariadne.Api.Tests.Infrastructure;

namespace Ariadne.Api.Tests.Features.Search;

/// <summary>Pencarian global: hanya yang boleh dilihat pemanggil, tanpa bocoran lewat proyek, task, atau orang.</summary>
public sealed class SearchTests(WorldFixture fx) : IClassFixture<WorldFixture>
{
    private TestApp App => fx.App;

    private World W => fx.World;

    private static async Task<SearchResults> SearchAsync(HttpClient client, string q)
    {
        var response = await client.GetApiAsync($"/api/search?q={Uri.EscapeDataString(q)}");
        Assert.True(response.StatusCode == HttpStatusCode.OK, await response.TextAsync());
        return await response.ReadAsync<SearchResults>();
    }

    private static string Unique() => "zq" + Guid.NewGuid().ToString("N")[..8];

    [Fact]
    public async Task Members_find_tasks_and_projects_with_their_path_and_key()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var word = Unique();
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = $"Pipeline {word} staging" });
        var child = await site.Manager.PostApiAsync($"/api/projects/{site.Root}/children", new { name = $"Modul {word}" });
        Assert.Equal(HttpStatusCode.Created, child.StatusCode);

        var results = await SearchAsync(site.Member, word.ToUpperInvariant()); // tanpa membedakan huruf besar/kecil

        var found = Assert.Single(results.Tasks);
        Assert.Equal((task.Key, $"Pipeline {word} staging", $"Proyek {site.Code}"), (found.Key, found.Title, found.Path));
        Assert.Equal(site.Root, found.ProjectId);
        var project = Assert.Single(results.Projects);
        Assert.Equal($"Proyek {site.Code} / Modul {word}", project.Path);
    }

    [Fact]
    public async Task A_task_can_be_found_by_its_key_or_number()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "Tanpa kata kunci unik" });

        var byKey = await SearchAsync(site.Member, task.Key);
        var byLowerKey = await SearchAsync(site.Member, task.Key.ToLowerInvariant());

        Assert.Contains(byKey.Tasks, t => t.Id == task.Id);
        Assert.Contains(byLowerKey.Tasks, t => t.Id == task.Id);
        Assert.Empty((await SearchAsync(site.Member, $"{site.Code}-999999")).Tasks);
    }

    [Fact]
    public async Task Nothing_from_a_project_the_caller_cannot_see_is_ever_returned()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var word = Unique();
        await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = $"Rahasia {word}" });
        var outsider = await App.ClientAsync(W.Outsider);
        var otherManager = await App.ClientAsync(W.OtherManager);

        foreach (var client in new[] { outsider, otherManager })
        {
            var results = await SearchAsync(client, word);
            Assert.Empty(results.Tasks);
            Assert.Empty(results.Projects);
        }

        var projectByName = await SearchAsync(outsider, $"Proyek {site.Code}");
        Assert.Empty(projectByName.Projects);
        Assert.Single((await SearchAsync(site.Member, word)).Tasks);
    }

    [Fact]
    public async Task An_admin_finds_everything_and_archived_projects_are_hidden_from_all()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var word = Unique();
        await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = $"Arsip {word}" });
        var admin = await App.ClientAsync(W.Admin);

        // Admin yang bukan anggota proyek lain tetap melihat semuanya: World.ProjectAlpha
        Assert.NotEmpty((await SearchAsync(admin, "Task contoh")).Tasks);
        Assert.Single((await SearchAsync(site.Member, word)).Tasks);

        Assert.Equal(HttpStatusCode.NoContent, (await site.Manager.PostApiAsync($"/api/projects/{site.Root}/archive")).StatusCode);

        Assert.Empty((await SearchAsync(site.Member, word)).Tasks);
        Assert.Empty((await SearchAsync(admin, word)).Tasks);
        Assert.Empty((await SearchAsync(admin, $"Proyek {site.Code}")).Projects);
    }

    [Fact]
    public async Task People_are_found_only_among_those_sharing_a_project_and_carry_no_email()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var stranger = await App.CreateUserAsync($"Asing {Unique()}");
        var mate = await App.CreateUserAsync($"Rekan {Unique()}");
        Assert.Equal(HttpStatusCode.NoContent, (await site.Manager.PostApiAsync($"/api/projects/{site.Root}/members", new { userId = mate.Id, role = "Anggota" })).StatusCode);

        var asMember = await site.Member.GetApiAsync($"/api/search?q={Uri.EscapeDataString("Rekan")}");
        var body = await asMember.TextAsync();
        var results = await SearchAsync(site.Member, "Rekan");
        var strangers = await SearchAsync(site.Member, "Asing");

        var person = Assert.Single(results.People);
        Assert.Equal((mate.Id, site.Root), (person.Id, person.ProjectId));
        Assert.Empty(strangers.People);
        Assert.DoesNotContain("@", body, StringComparison.Ordinal);
        Assert.DoesNotContain(stranger.Email, body, StringComparison.Ordinal);
        // Orang di proyek lain tidak melihat rekan itu
        Assert.Empty((await SearchAsync(await App.ClientAsync(W.OtherManager), "Rekan")).People);
    }

    [Fact]
    public async Task A_guest_searches_tasks_and_projects_but_never_people()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var word = Unique();
        await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = $"Kabar {word}" });

        var results = await SearchAsync(site.Guest, word);
        var people = await SearchAsync(site.Guest, "Admin");

        Assert.Single(results.Tasks);
        Assert.Empty(people.People);
    }

    [Fact]
    public async Task Wildcards_are_literal_and_empty_or_oversized_queries_are_handled()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "Biasa saja" });

        Assert.Empty((await SearchAsync(site.Member, "%")).Tasks);
        Assert.Empty((await SearchAsync(site.Member, "_")).Tasks);
        Assert.Empty((await SearchAsync(site.Member, "   ")).Tasks);
        Assert.Equal(HttpStatusCode.BadRequest, (await site.Member.GetApiAsync($"/api/search?q={new string('x', 101)}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await site.Member.GetApiAsync("/api/search")).StatusCode);
    }
}
