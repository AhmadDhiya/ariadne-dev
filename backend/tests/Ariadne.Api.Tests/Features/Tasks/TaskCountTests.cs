using Ariadne.Api.Features.Projects;
using Ariadne.Api.Features.Teams;
using Ariadne.Api.Tests.Infrastructure;

namespace Ariadne.Api.Tests.Features.Tasks;

/// <summary>Angka task di sidebar (pohon proyek) dan kolom "Task aktif" di halaman Tim.</summary>
public sealed class TaskCountTests(FakeTodayWorldFixture fx) : IClassFixture<FakeTodayWorldFixture>
{
    private TestApp App => fx.App;

    private World W => fx.World;

    private static async Task<List<ProjectNode>> TreeAsync(HttpClient client) =>
        await (await client.GetApiAsync("/api/projects/tree")).ReadAsync<List<ProjectNode>>();

    [Fact]
    public async Task The_sidebar_counts_open_top_level_tasks_for_a_project_and_all_its_sub_projects()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "A" });
        await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "Selesai", status = "Done" }); // tidak dihitung
        var inChild = await TaskKit.NewTaskAsync(site.Manager, site.Child, new { title = "B" });
        await TaskKit.NewTaskAsync(site.Manager, site.Child, new { title = "C" });
        await site.Manager.PostApiAsync($"/api/tasks/{inChild.Id}/subtasks", new { title = "Anak" }); // sub-task tidak dihitung
        var removed = await TaskKit.NewTaskAsync(site.Manager, site.Child, new { title = "Dihapus" });
        await site.Manager.DeleteApiAsync($"/api/tasks/{removed.Id}"); // dihapus tidak dihitung

        var tree = await TreeAsync(site.Member);

        Assert.Equal(3, tree.Single(p => p.Id == site.Root).TaskCount); // A + B + C
        Assert.Equal(2, tree.Single(p => p.Id == site.Child).TaskCount); // B + C
    }

    [Fact]
    public async Task Counts_drop_when_a_task_is_finished()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);
        Assert.Equal(1, (await TreeAsync(site.Member)).Single(p => p.Id == site.Root).TaskCount);

        await site.Member.PutApiAsync($"/api/tasks/{task.Id}/status", new { status = "Done" });

        Assert.Equal(0, (await TreeAsync(site.Member)).Single(p => p.Id == site.Root).TaskCount);
    }

    [Fact]
    public async Task Active_tasks_in_the_team_page_count_unfinished_tasks_assigned_to_each_member()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var before = await ActiveAsync(site.Member, W.Member.Id);
        await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "A", assigneeIds = new[] { W.Member.Id } });
        await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "B", assigneeIds = new[] { W.Member.Id }, status = "Rutin" }); // Rutin dihitung
        await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "C", assigneeIds = new[] { W.Member.Id }, status = "Done" }); // selesai tidak

        var after = await ActiveAsync(site.Member, W.Member.Id);

        Assert.Equal(before + 2, after);
    }

    [Fact]
    public async Task Active_task_counts_hide_projects_the_viewer_cannot_see_except_from_the_teams_own_managers()
    {
        // Supervisor (anggota Tim A) memegang task di proyek yang Anggota (juga Tim A) bukan anggotanya
        var admin = await App.ClientAsync(W.Admin);
        var code = "T" + Guid.NewGuid().ToString("N")[..5].ToUpperInvariant();
        var root = (await (await admin.PostApiAsync("/api/projects", new { name = $"Rahasia {code}", code })).ReadAsync<ProjectNode>()).Id;
        await admin.PostApiAsync($"/api/projects/{root}/members", new { userId = W.Supervisor.Id, role = "Anggota" });
        await TaskKit.NewTaskAsync(admin, root, new { title = "Rahasia", assigneeIds = new[] { W.Supervisor.Id } });

        var seenByMember = await ActiveAsync(await App.ClientAsync(W.Member), W.Supervisor.Id);
        var seenBySupervisor = await ActiveAsync(await App.ClientAsync(W.Supervisor), W.Supervisor.Id);
        var seenByAdmin = await ActiveAsync(admin, W.Supervisor.Id);

        Assert.Equal(seenByMember + 1, seenBySupervisor); // yang mengelola tim melihat semua
        Assert.Equal(seenBySupervisor, seenByAdmin);
    }

    private async Task<int> ActiveAsync(HttpClient client, Guid userId)
    {
        var team = await (await client.GetApiAsync($"/api/teams/{W.TeamA}")).ReadAsync<TeamDetail>();
        return team.Members.Single(m => m.UserId == userId).ActiveTasks;
    }
}
