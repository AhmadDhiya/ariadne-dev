using System.Net;
using Ariadne.Api.Domain;
using Ariadne.Api.Features.Tasks;
using Ariadne.Api.Tests.Infrastructure;

namespace Ariadne.Api.Tests.Features.Tasks;

/// <summary>Filter dan pencarian tabel task. "Hari ini" dikunci ke Senin 28 September 2026.</summary>
public sealed class TaskListTests(FakeTodayWorldFixture fx) : IClassFixture<FakeTodayWorldFixture>
{
    private TestApp App => fx.App;

    private World W => fx.World;

    private sealed record Data(TaskKit.Site Site, TaskRow Late, TaskRow Soon, TaskRow Later, TaskRow Blocked, TaskRow Done, TaskRow Routine, TaskRow InChild);

    /// <summary>Satu proyek dengan task yang berbeda-beda sifatnya, dibuat sekali per test.</summary>
    private async Task<Data> BuildAsync()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var member = W.Member.Id;
        var admin = W.Admin.Id;

        var late = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "Perbaikan absensi", priority = "High", status = "Fixing", startDate = "2026-09-21", dueDate = "2026-09-25", assigneeIds = new[] { member }, labels = new[] { "UAT" } });
        var soon = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "Dokumentasi API", priority = "Medium", status = "OnProgress", startDate = "2026-09-24", dueDate = "2026-09-30", assigneeIds = new[] { admin }, labels = new[] { "Dokumentasi" } });
        var later = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "Skenario uji", priority = "Low", status = "NotStarted", startDate = "2026-10-05", dueDate = "2026-10-09", assigneeIds = new[] { member, admin } });
        var blocked = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "Pipeline GitLab", priority = "Critical", status = "Blocked", holdReason = "Firewall", dueDate = "2026-09-25", assigneeIds = new[] { admin }, labels = new[] { "DevOps" } });
        var done = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "Pengisian server", priority = "High", status = "Done", dueDate = "2026-09-18", assigneeIds = new[] { member } });
        var routine = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "Pantau log harian", priority = "Low", status = "Rutin", dueDate = "2026-09-01", assigneeIds = new[] { admin } });
        var inChild = await TaskKit.NewTaskAsync(site.Manager, site.Child, new { title = "Endpoint rekap", priority = "High", status = "OnProgress", dueDate = "2026-10-01", assigneeIds = new[] { member }, labels = new[] { "API" } });
        return new Data(site, late, soon, later, blocked, done, routine, inChild);
    }

    private static HashSet<Guid> Ids(TaskList list) => list.Tasks.Select(t => t.Id).ToHashSet();

    [Fact]
    public async Task Without_filters_the_root_lists_every_task_including_sub_projects_and_the_sub_project_only_its_own()
    {
        var d = await BuildAsync();

        var root = await TaskKit.ListAsync(d.Site.Member, d.Site.Root);
        var child = await TaskKit.ListAsync(d.Site.Member, d.Site.Child);

        Assert.Equal(7, root.Tasks.Count);
        Assert.Equal([d.InChild.Id], child.Tasks.Select(t => t.Id));
    }

    [Fact]
    public async Task Overdue_means_past_due_and_neither_done_nor_routine()
    {
        var d = await BuildAsync();

        var list = await TaskKit.ListAsync(d.Site.Member, d.Site.Root, "overdue=true");

        Assert.Equal(new HashSet<Guid> { d.Late.Id, d.Blocked.Id }, Ids(list));
        Assert.All(list.Tasks, t => Assert.True(t.IsOverdue));
    }

    [Fact]
    public async Task This_week_runs_from_today_to_friday_and_skips_done_tasks()
    {
        var d = await BuildAsync();

        var list = await TaskKit.ListAsync(d.Site.Member, d.Site.Root, "thisWeek=true");

        // Senin 28 Sep → Jumat 2 Okt: "Dokumentasi API" (30 Sep) dan "Endpoint rekap" (1 Okt)
        Assert.Equal(new HashSet<Guid> { d.Soon.Id, d.InChild.Id }, Ids(list));
    }

    [Fact]
    public async Task My_tasks_are_the_ones_assigned_to_me()
    {
        var d = await BuildAsync();

        var member = await TaskKit.ListAsync(d.Site.Member, d.Site.Root, "mine=true");
        var admin = await TaskKit.ListAsync(d.Site.Manager, d.Site.Root, "mine=true");

        Assert.Equal(new HashSet<Guid> { d.Late.Id, d.Later.Id, d.Done.Id, d.InChild.Id }, Ids(member));
        Assert.Equal(new HashSet<Guid> { d.Soon.Id, d.Later.Id, d.Blocked.Id, d.Routine.Id }, Ids(admin));
    }

    [Fact]
    public async Task Filters_by_assignee_status_priority_and_label_accept_several_values()
    {
        var d = await BuildAsync();

        var pic = await TaskKit.ListAsync(d.Site.Member, d.Site.Root, $"pic={W.Member.Id},{W.Admin.Id}");
        var status = await TaskKit.ListAsync(d.Site.Member, d.Site.Root, "status=Blocked,Done");
        var priority = await TaskKit.ListAsync(d.Site.Member, d.Site.Root, "priority=Critical,Low");
        var label = await TaskKit.ListAsync(d.Site.Member, d.Site.Root, "label=uat,DEVOPS");

        Assert.Equal(7, pic.Tasks.Count);
        Assert.Equal(new HashSet<Guid> { d.Blocked.Id, d.Done.Id }, Ids(status));
        Assert.Equal(new HashSet<Guid> { d.Blocked.Id, d.Later.Id, d.Routine.Id }, Ids(priority));
        Assert.Equal(new HashSet<Guid> { d.Late.Id, d.Blocked.Id }, Ids(label)); // huruf besar/kecil tidak berpengaruh
    }

    [Fact]
    public async Task Filters_combine_with_and()
    {
        var d = await BuildAsync();

        var list = await TaskKit.ListAsync(d.Site.Member, d.Site.Root, $"pic={W.Admin.Id}&overdue=true");

        Assert.Equal([d.Blocked.Id], list.Tasks.Select(t => t.Id));
    }

    [Fact]
    public async Task Search_finds_by_title_key_number_and_label_and_treats_wildcards_literally()
    {
        var d = await BuildAsync();

        var title = await TaskKit.ListAsync(d.Site.Member, d.Site.Root, "q=ABSENSI");
        var key = await TaskKit.ListAsync(d.Site.Member, d.Site.Root, $"q={d.Soon.Key}");
        var number = await TaskKit.ListAsync(d.Site.Member, d.Site.Root, $"q={d.Soon.Number}");
        var label = await TaskKit.ListAsync(d.Site.Member, d.Site.Root, "q=devops");
        var wildcard = await TaskKit.ListAsync(d.Site.Member, d.Site.Root, "q=%25"); // "%" harfiah
        var underscore = await TaskKit.ListAsync(d.Site.Member, d.Site.Root, "q=_");

        Assert.Equal([d.Late.Id], title.Tasks.Select(t => t.Id));
        Assert.Contains(d.Soon.Id, Ids(key));
        Assert.Contains(d.Soon.Id, Ids(number));
        Assert.Equal([d.Blocked.Id], label.Tasks.Select(t => t.Id));
        Assert.Empty(wildcard.Tasks);
        Assert.Empty(underscore.Tasks);
    }

    [Fact]
    public async Task Progress_ignores_the_filters()
    {
        var d = await BuildAsync();

        var filtered = await TaskKit.ListAsync(d.Site.Member, d.Site.Root, "status=Blocked");
        var all = await TaskKit.ListAsync(d.Site.Member, d.Site.Root);

        Assert.Equal(all.Progress, filtered.Progress);
        Assert.Equal(new TaskProgress(1, 7, 14), all.Progress);
    }

    [Fact]
    public async Task A_matching_subtask_brings_its_parent_along_for_context()
    {
        var d = await BuildAsync();
        var child = await (await d.Site.Member.PostApiAsync($"/api/tasks/{d.Late.Id}/subtasks", new { title = "Uji ulang", priority = "Critical" })).ReadAsync<TaskRow>();

        var list = await TaskKit.ListAsync(d.Site.Member, d.Site.Root, "priority=Critical&status=NotStarted");

        Assert.Equal([d.Late.Id, child.Id], list.Tasks.Select(t => t.Id));
    }

    [Fact]
    public async Task Bad_filter_values_are_rejected_not_ignored()
    {
        var d = await BuildAsync();

        foreach (var query in new[] { "status=Bogus", "status=0", "priority=urgent", "pic=bukan-guid", $"pic={new string('a', 5)}", "overdue=maybe", $"q={new string('x', 101)}" })
        {
            var response = await d.Site.Member.GetApiAsync($"/api/projects/{d.Site.Root}/tasks?{query}");
            Assert.True(response.StatusCode == HttpStatusCode.BadRequest, $"{query} → {(int)response.StatusCode}");
        }
    }

    [Fact]
    public async Task Archived_projects_hide_their_tasks_and_cannot_be_listed()
    {
        var d = await BuildAsync();
        await d.Site.Manager.PostApiAsync($"/api/projects/{d.Site.Child}/archive");

        var root = await TaskKit.ListAsync(d.Site.Member, d.Site.Root);

        Assert.DoesNotContain(d.InChild.Id, Ids(root));
        Assert.Equal(HttpStatusCode.NotFound, (await d.Site.Member.GetApiAsync($"/api/projects/{d.Site.Child}/tasks")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await d.Site.Manager.PostApiAsync($"/api/projects/{d.Site.Child}/tasks", new { title = "X" })).StatusCode);
    }

    [Fact]
    public async Task Tasks_in_a_project_are_never_listed_for_someone_outside_it()
    {
        var d = await BuildAsync();
        var outsider = await App.ClientAsync(W.Outsider);

        Assert.Equal(HttpStatusCode.NotFound, (await outsider.GetApiAsync($"/api/projects/{d.Site.Root}/tasks")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await outsider.GetApiAsync($"/api/tasks/{d.Late.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await outsider.GetApiAsync($"/api/tasks/{d.Late.Key}")).StatusCode); // kunci tidak membocorkan keberadaan
    }
}
