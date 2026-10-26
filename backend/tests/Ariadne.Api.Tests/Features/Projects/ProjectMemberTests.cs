using System.Net;
using Ariadne.Api.Domain;
using Ariadne.Api.Features.Projects;
using Ariadne.Api.Tests.Infrastructure;

namespace Ariadne.Api.Tests.Features.Projects;

public sealed class ProjectMemberTests(WorldFixture fx) : IClassFixture<WorldFixture>
{
    private TestApp App => fx.App;

    private World W => fx.World;

    /// <summary>Proyek sendiri dengan satu Pengelola, supaya tes yang mengubah anggota tidak saling mengganggu.</summary>
    private async Task<(ProjectNode Root, TestUser Manager)> NewProjectAsync()
    {
        var admin = await App.ClientAsync(W.Admin);
        var root = await (await admin.PostApiAsync("/api/projects", new { name = $"Anggota {Guid.NewGuid():N}", code = "M" + Guid.NewGuid().ToString("N")[..5].ToUpperInvariant() })).ReadAsync<ProjectNode>();
        var manager = await App.CreateUserAsync("Pengelola Tes");
        Assert.Equal(HttpStatusCode.NoContent, (await admin.PostApiAsync($"/api/projects/{root.Id}/members", new { userId = manager.Id, role = "Pengelola" })).StatusCode);
        return (root, manager);
    }

    [Fact]
    public async Task Members_are_listed_by_role_with_the_status_and_date()
    {
        var manager = await App.ClientAsync(W.Manager);

        // Lewat sub-proyek mana pun, hasilnya anggota proyek root
        var members = await (await manager.GetApiAsync($"/api/projects/{W.ProjectAlphaGrandchild}/members")).ReadAsync<List<ProjectMemberItem>>();

        Assert.Equal([ProjectRole.Pengelola, ProjectRole.Anggota, ProjectRole.Tamu], members.Select(m => m.Role));
        Assert.All(members, m => Assert.Equal("Aktif", m.Status));
        Assert.Equal(W.Manager.Email, members[0].Email);
        Assert.True(members[2].IsGuest);
        Assert.False(members[0].IsGuest);
    }

    [Fact]
    public async Task Guests_see_the_member_list_but_never_other_peoples_email_addresses()
    {
        var guest = await App.ClientAsync(W.Guest);

        var response = await guest.GetApiAsync($"/api/projects/{W.ProjectAlpha}/members");
        var members = await response.ReadAsync<List<ProjectMemberItem>>();

        Assert.Equal(3, members.Count);
        Assert.All(members, m => Assert.Null(m.Email));
        Assert.DoesNotContain("@uji.example", await response.TextAsync(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task Members_list_is_404_for_people_outside_the_project()
    {
        foreach (var user in new[] { W.Outsider, W.OtherManager, W.Supervisor })
        {
            var client = await App.ClientAsync(user);
            Assert.Equal(HttpStatusCode.NotFound, (await client.GetApiAsync($"/api/projects/{W.ProjectAlpha}/members")).StatusCode);
        }
    }

    [Fact]
    public async Task Managers_and_admins_manage_members_but_ordinary_members_and_guests_cannot()
    {
        var (root, manager) = await NewProjectAsync();
        var admin = await App.ClientAsync(W.Admin);
        var person = await App.CreateUserAsync("Anggota Tambahan");
        var member = await App.CreateUserAsync("Anggota Biasa");
        var guest = await App.CreateUserAsync("Tamu Biasa");
        await admin.PostApiAsync($"/api/projects/{root.Id}/members", new { userId = member.Id, role = "Anggota" });
        await admin.PostApiAsync($"/api/projects/{root.Id}/members", new { userId = guest.Id, role = "Tamu" });

        // Pengelola
        var managerClient = await App.LoginAsync(manager);
        Assert.Equal(HttpStatusCode.NoContent, (await managerClient.PostApiAsync($"/api/projects/{root.Id}/members", new { userId = person.Id, role = "Anggota" })).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await managerClient.PatchApiAsync($"/api/projects/{root.Id}/members/{person.Id}", new { role = "Pengelola" })).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await managerClient.DeleteApiAsync($"/api/projects/{root.Id}/members/{person.Id}")).StatusCode);

        // Anggota biasa dan Tamu
        foreach (var other in new[] { member, guest })
        {
            var client = await App.LoginAsync(other);
            Assert.Equal(HttpStatusCode.Forbidden, (await client.PostApiAsync($"/api/projects/{root.Id}/members", new { userId = person.Id, role = "Anggota" })).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await client.PatchApiAsync($"/api/projects/{root.Id}/members/{member.Id}", new { role = "Pengelola" })).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await client.DeleteApiAsync($"/api/projects/{root.Id}/members/{manager.Id}")).StatusCode);
        }
    }

    [Fact]
    public async Task A_member_cannot_promote_themselves()
    {
        var (root, _) = await NewProjectAsync();
        var admin = await App.ClientAsync(W.Admin);
        var sneaky = await App.CreateUserAsync("Licik");
        await admin.PostApiAsync($"/api/projects/{root.Id}/members", new { userId = sneaky.Id, role = "Anggota" });
        var client = await App.LoginAsync(sneaky);

        var response = await client.PatchApiAsync($"/api/projects/{root.Id}/members/{sneaky.Id}", new { role = "Pengelola" });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task A_manager_of_another_project_cannot_touch_this_one()
    {
        var (root, _) = await NewProjectAsync();
        var other = await App.ClientAsync(W.OtherManager);

        Assert.Equal(HttpStatusCode.NotFound, (await other.PostApiAsync($"/api/projects/{root.Id}/members", new { userId = W.Outsider.Id, role = "Anggota" })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.GetApiAsync($"/api/projects/{root.Id}/members")).StatusCode);
    }

    [Fact]
    public async Task Adding_members_checks_user_role_and_duplicates()
    {
        var (root, manager) = await NewProjectAsync();
        var client = await App.LoginAsync(manager);
        var person = await App.CreateUserAsync("Baru");
        var inactive = await App.CreateUserAsync("Mati", isActive: false);

        Assert.Equal(HttpStatusCode.NoContent, (await client.PostApiAsync($"/api/projects/{root.Id}/members", new { userId = person.Id, role = "Anggota" })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostApiAsync($"/api/projects/{root.Id}/members", new { userId = person.Id, role = "Tamu" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostApiAsync($"/api/projects/{root.Id}/members", new { userId = W.Outsider.Id, role = "Raja" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostApiAsync($"/api/projects/{root.Id}/members", new { userId = Guid.NewGuid(), role = "Anggota" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostApiAsync($"/api/projects/{root.Id}/members", new { userId = inactive.Id, role = "Anggota" })).StatusCode);
    }

    [Fact]
    public async Task Changes_in_membership_apply_immediately_to_what_a_person_can_see()
    {
        var (root, _) = await NewProjectAsync();
        var admin = await App.ClientAsync(W.Admin);
        var person = await App.CreateUserAsync("Datang Pergi");
        var client = await App.LoginAsync(person);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetApiAsync($"/api/projects/{root.Id}")).StatusCode);

        await admin.PostApiAsync($"/api/projects/{root.Id}/members", new { userId = person.Id, role = "Tamu" });
        Assert.Equal(HttpStatusCode.OK, (await client.GetApiAsync($"/api/projects/{root.Id}")).StatusCode);
        Assert.Contains(await (await client.GetApiAsync("/api/projects/tree")).ReadAsync<List<ProjectNode>>(), p => p.Id == root.Id);

        await admin.DeleteApiAsync($"/api/projects/{root.Id}/members/{person.Id}");
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetApiAsync($"/api/projects/{root.Id}")).StatusCode);
        Assert.DoesNotContain(await (await client.GetApiAsync("/api/projects/tree")).ReadAsync<List<ProjectNode>>(), p => p.Id == root.Id);
    }

    [Fact]
    public async Task Removing_or_changing_someone_who_is_not_a_member_is_404()
    {
        var (root, manager) = await NewProjectAsync();
        var client = await App.LoginAsync(manager);

        Assert.Equal(HttpStatusCode.NotFound, (await client.DeleteApiAsync($"/api/projects/{root.Id}/members/{W.Outsider.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PatchApiAsync($"/api/projects/{root.Id}/members/{W.Outsider.Id}", new { role = "Anggota" })).StatusCode);
    }
}
