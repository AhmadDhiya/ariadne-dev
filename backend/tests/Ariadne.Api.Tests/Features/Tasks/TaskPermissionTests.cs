using System.Net;
using Ariadne.Api.Domain;
using Ariadne.Api.Features.Tasks;
using Ariadne.Api.Tests.Infrastructure;

namespace Ariadne.Api.Tests.Features.Tasks;

/// <summary>
/// Izin task selain yang sudah dicakup matriks (PermissionMatrixTests): menghapus, keadaan setelah perubahan,
/// dan jalur samping seperti keanggotaan yang berubah. Aturan: hanya Pengelola dan Anggota yang mengubah task.
/// </summary>
public sealed class TaskPermissionTests(FakeTodayWorldFixture fx) : IClassFixture<FakeTodayWorldFixture>
{
    private TestApp App => fx.App;

    private World W => fx.World;

    private static int Status(HttpResponseMessage response) => (int)response.StatusCode;

    [Fact]
    public async Task Who_may_delete_a_task()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var outsider = await App.ClientAsync(W.Outsider);
        var supervisor = await App.ClientAsync(W.Supervisor);
        var otherManager = await App.ClientAsync(W.OtherManager);

        // Tamu dilarang (403), orang luar tidak boleh tahu task ada (404); tidak ada yang terhapus
        var target = await TaskKit.NewTaskAsync(site.Manager, site.Root);
        Assert.Equal(403, Status(await site.Guest.DeleteApiAsync($"/api/tasks/{target.Id}")));
        Assert.Equal(404, Status(await outsider.DeleteApiAsync($"/api/tasks/{target.Id}")));
        Assert.Equal(404, Status(await supervisor.DeleteApiAsync($"/api/tasks/{target.Id}")));
        Assert.Equal(404, Status(await otherManager.DeleteApiAsync($"/api/tasks/{target.Id}")));
        Assert.Equal(HttpStatusCode.OK, (await site.Member.GetApiAsync($"/api/tasks/{target.Id}")).StatusCode);

        // Anggota dan Pengelola boleh
        Assert.Equal(204, Status(await site.Member.DeleteApiAsync($"/api/tasks/{target.Id}")));
        var second = await TaskKit.NewTaskAsync(site.Member, site.Root);
        Assert.Equal(204, Status(await site.Manager.DeleteApiAsync($"/api/tasks/{second.Id}")));
    }

    [Fact]
    public async Task An_admin_who_is_not_a_member_can_see_the_task_but_not_change_it()
    {
        var admin = await App.ClientAsync(W.Admin);
        var alpha = W.ProjectAlpha;

        var list = await TaskKit.ListAsync(admin, alpha);

        Assert.False(list.CanEdit);
        Assert.Contains(list.Tasks, t => t.Id == W.TaskAlpha);
        Assert.Equal(403, Status(await admin.DeleteApiAsync($"/api/tasks/{W.TaskAlpha}")));
        Assert.Equal(403, Status(await admin.PutApiAsync($"/api/tasks/{W.TaskAlpha}/status", new { status = "Done" })));
    }

    [Fact]
    public async Task The_admin_who_created_a_project_can_work_on_its_tasks()
    {
        var site = await TaskKit.NewSiteAsync(App, W);

        var list = await TaskKit.ListAsync(site.Manager, site.Root);
        var created = await site.Manager.PostApiAsync($"/api/projects/{site.Root}/tasks", new { title = "Dari admin pembuat" });

        Assert.True(list.CanEdit);
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
    }

    [Fact]
    public async Task Guests_see_tasks_but_the_editing_flag_is_off_and_every_change_is_refused()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "Terlihat tamu" });

        var list = await TaskKit.ListAsync(site.Guest, site.Root);

        Assert.False(list.CanEdit);
        Assert.Equal(task.Id, list.Tasks.Single().Id);
        Assert.Equal(403, Status(await site.Guest.PostApiAsync($"/api/projects/{site.Root}/tasks", new { title = "X" })));
        Assert.Equal(403, Status(await site.Guest.PostApiAsync($"/api/tasks/{task.Id}/subtasks", new { title = "X" })));
        Assert.Equal(403, Status(await site.Guest.PatchApiAsync($"/api/tasks/{task.Id}", new { title = "Dibajak" })));
        Assert.Equal(403, Status(await site.Guest.PutApiAsync($"/api/tasks/{task.Id}/status", new { status = "Done" })));
        Assert.Equal(403, Status(await site.Guest.PutApiAsync($"/api/tasks/{task.Id}/dates", new { startDate = "2026-09-28" })));
        Assert.Equal(403, Status(await site.Guest.PutApiAsync($"/api/tasks/{task.Id}/assignees", new { userIds = new[] { W.Member.Id } })));
        var unchanged = (await TaskKit.ListAsync(site.Manager, site.Root)).Tasks.Single();
        Assert.Equal("Terlihat tamu", unchanged.Title);
        Assert.Equal(WorkStatus.NotStarted, unchanged.Status);
    }

    [Fact]
    public async Task A_task_id_from_another_project_gives_404_not_403()
    {
        var mine = await TaskKit.NewSiteAsync(App, W);
        var theirs = await TaskKit.NewSiteAsync(App, W);
        var foreign = await TaskKit.NewTaskAsync(theirs.Manager, theirs.Root);
        var otherManager = await App.ClientAsync(W.OtherManager);

        // OtherManager tidak ada di proyek "theirs": keberadaan task tidak boleh bocor lewat perbedaan 403/404
        Assert.Equal(404, Status(await otherManager.PatchApiAsync($"/api/tasks/{foreign.Id}", new { title = "X" })));
        Assert.Equal(404, Status(await otherManager.PutApiAsync($"/api/tasks/{foreign.Id}/status", new { status = "Done" })));
        Assert.Equal(404, Status(await otherManager.GetApiAsync($"/api/tasks/{foreign.Key}")));
        Assert.Equal(404, Status(await otherManager.GetApiAsync($"/api/projects/{mine.Root}/tasks")));
    }

    [Fact]
    public async Task Removing_someone_from_the_project_takes_them_off_every_task()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "X", assigneeIds = new[] { W.Member.Id, W.Admin.Id } });

        var removed = await site.Manager.DeleteApiAsync($"/api/projects/{site.Root}/members/{W.Member.Id}");
        var after = (await TaskKit.ListAsync(site.Manager, site.Root)).Tasks.Single(t => t.Id == task.Id);

        Assert.Equal(HttpStatusCode.NoContent, removed.StatusCode);
        Assert.Equal([W.Admin.Id], after.Assignees.Select(a => a.Id));
        Assert.Equal(404, Status(await site.Member.GetApiAsync($"/api/tasks/{task.Id}"))); // dan tidak melihatnya lagi
    }

    [Fact]
    public async Task Making_someone_a_guest_takes_them_off_tasks_they_were_assigned()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "X", assigneeIds = new[] { W.Member.Id } });

        var changed = await site.Manager.PatchApiAsync($"/api/projects/{site.Root}/members/{W.Member.Id}", new { role = "Tamu" });
        var after = (await TaskKit.ListAsync(site.Manager, site.Root)).Tasks.Single(t => t.Id == task.Id);

        Assert.Equal(HttpStatusCode.NoContent, changed.StatusCode);
        Assert.Empty(after.Assignees); // Tamu tidak boleh jadi PIC
    }
}
