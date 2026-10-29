using System.Net;
using Ariadne.Api.Domain;
using Ariadne.Api.Features.Tasks;
using Ariadne.Api.Infrastructure.Data;
using Ariadne.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Ariadne.Api.Tests.Features.Tasks;

public sealed class TaskCrudTests(FakeTodayWorldFixture fx) : IClassFixture<FakeTodayWorldFixture>
{
    private TestApp App => fx.App;

    private World W => fx.World;

    // ---------- membuat ----------

    [Fact]
    public async Task A_new_task_gets_the_next_number_and_a_readable_key()
    {
        var site = await TaskKit.NewSiteAsync(App, W);

        var first = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "  Pasang server  ", priority = "High" });
        var second = await TaskKit.NewTaskAsync(site.Member, site.Child);

        Assert.Equal($"{site.Code}-1", first.Key);
        Assert.Equal($"{site.Code}-2", second.Key);
        Assert.Equal("Pasang server", first.Title); // dirapikan
        Assert.Equal(Priority.High, first.Priority);
        Assert.Equal(WorkStatus.NotStarted, first.Status); // bawaan
        Assert.Equal(Priority.Medium, second.Priority); // bawaan
        Assert.Equal(site.Child, second.ProjectId);
    }

    [Fact]
    public async Task Numbers_never_repeat_even_when_many_people_create_tasks_at_once()
    {
        var site = await TaskKit.NewSiteAsync(App, W);

        var created = await Task.WhenAll(Enumerable.Range(0, 20).Select(i =>
            TaskKit.NewTaskAsync(i % 2 == 0 ? site.Manager : site.Member, i % 4 == 0 ? site.Child : site.Root)));

        Assert.Equal(20, created.Select(t => t.Number).Distinct().Count());
        Assert.Equal(Enumerable.Range(1, 20), created.Select(t => t.Number).Order());
    }

    [Fact]
    public async Task Numbers_are_per_project_not_global()
    {
        var one = await TaskKit.NewSiteAsync(App, W);
        var other = await TaskKit.NewSiteAsync(App, W);

        await TaskKit.NewTaskAsync(one.Manager, one.Root);
        var task = await TaskKit.NewTaskAsync(other.Manager, other.Root);

        Assert.Equal(1, task.Number);
    }

    [Fact]
    public async Task A_task_needs_a_title_and_the_title_has_a_limit()
    {
        var site = await TaskKit.NewSiteAsync(App, W);

        var empty = await TaskKit.ErrorsAsync(await site.Manager.PostApiAsync($"/api/projects/{site.Root}/tasks", new { title = "   " }));
        var tooLong = await TaskKit.ErrorsAsync(await site.Manager.PostApiAsync($"/api/projects/{site.Root}/tasks", new { title = new string('x', 201) }));

        Assert.Contains("title", empty.Keys);
        Assert.Contains("title", tooLong.Keys);
    }

    [Fact]
    public async Task Unknown_status_and_priority_names_are_rejected_including_numbers()
    {
        var site = await TaskKit.NewSiteAsync(App, W);

        foreach (var bad in new[] { "0", "done", "Selesai" })
        {
            var status = await TaskKit.ErrorsAsync(await site.Manager.PostApiAsync($"/api/projects/{site.Root}/tasks", new { title = "X", status = bad }));
            var priority = await TaskKit.ErrorsAsync(await site.Manager.PostApiAsync($"/api/projects/{site.Root}/tasks", new { title = "X", priority = bad }));
            Assert.Contains("status", status.Keys);
            Assert.Contains("priority", priority.Keys);
        }
    }

    [Fact]
    public async Task Dates_must_be_in_order_and_sensible()
    {
        var site = await TaskKit.NewSiteAsync(App, W);

        var reversed = await TaskKit.ErrorsAsync(await site.Manager.PostApiAsync($"/api/projects/{site.Root}/tasks", new { title = "X", startDate = "2026-10-02", dueDate = "2026-10-01" }));
        var absurd = await TaskKit.ErrorsAsync(await site.Manager.PostApiAsync($"/api/projects/{site.Root}/tasks", new { title = "X", startDate = "0001-01-01" }));

        Assert.Contains("dueDate", reversed.Keys);
        Assert.Contains("startDate", absurd.Keys);
    }

    [Fact]
    public async Task Duration_and_lateness_are_computed_by_the_server()
    {
        var site = await TaskKit.NewSiteAsync(App, W);

        var late = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "Telat", status = "OnProgress", startDate = "2026-09-21", dueDate = "2026-09-25" });
        var fine = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "Aman", status = "OnProgress", startDate = "2026-09-28", dueDate = "2026-10-02" });
        var undated = await TaskKit.NewTaskAsync(site.Manager, site.Root);

        Assert.True(late.IsOverdue);
        Assert.Equal(3, late.LateDays); // Jumat 25 → Senin 28
        Assert.Equal(5, late.DurationDays);
        Assert.False(fine.IsOverdue);
        Assert.Equal(5, fine.DurationDays);
        Assert.Null(undated.DurationDays);
        Assert.False(undated.IsOverdue);
    }

    // ---------- PIC ----------

    [Fact]
    public async Task Assignees_must_be_active_project_members_but_never_guests()
    {
        var site = await TaskKit.NewSiteAsync(App, W);

        var guest = await TaskKit.ErrorsAsync(await site.Manager.PostApiAsync($"/api/projects/{site.Root}/tasks", new { title = "X", assigneeIds = new[] { W.Guest.Id } }));
        var stranger = await TaskKit.ErrorsAsync(await site.Manager.PostApiAsync($"/api/projects/{site.Root}/tasks", new { title = "X", assigneeIds = new[] { W.Outsider.Id } }));
        var ghost = await TaskKit.ErrorsAsync(await site.Manager.PostApiAsync($"/api/projects/{site.Root}/tasks", new { title = "X", assigneeIds = new[] { Guid.NewGuid() } }));

        Assert.Contains("assigneeIds", guest.Keys);
        Assert.Contains("assigneeIds", stranger.Keys);
        Assert.Contains("assigneeIds", ghost.Keys);
    }

    [Fact]
    public async Task Several_people_can_be_assigned_and_the_set_can_be_replaced()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "X", assigneeIds = new[] { W.Member.Id, W.Admin.Id } });
        Assert.Equal(2, task.Assignees.Count);

        var replaced = await site.Member.PutApiAsync($"/api/tasks/{task.Id}/assignees", new { userIds = new[] { W.Admin.Id } });
        var row = await replaced.ReadAsync<TaskRow>();
        Assert.Equal([W.Admin.Id], row.Assignees.Select(a => a.Id));

        var cleared = await (await site.Member.PutApiAsync($"/api/tasks/{task.Id}/assignees", new { userIds = Array.Empty<Guid>() })).ReadAsync<TaskRow>();
        Assert.Empty(cleared.Assignees);
    }

    [Fact]
    public async Task At_most_ten_assignees()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var response = await site.Manager.PostApiAsync($"/api/projects/{site.Root}/tasks", new { title = "X", assigneeIds = Enumerable.Range(0, 11).Select(_ => Guid.NewGuid()) });

        Assert.Contains("assigneeIds", (await TaskKit.ErrorsAsync(response)).Keys);
    }

    // ---------- label ----------

    [Fact]
    public async Task Labels_are_created_on_use_and_reused_regardless_of_letter_case()
    {
        var site = await TaskKit.NewSiteAsync(App, W);

        var first = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "A", labels = new[] { "UAT", "Infra" } });
        var second = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "B", labels = new[] { "uat", "  INFRA  ", "API" } });

        Assert.Equal(["Infra", "UAT"], first.Labels);
        Assert.Equal(["API", "Infra", "UAT"], second.Labels); // label lama dipakai ulang dengan penulisan pertamanya
        var all = await (await site.Member.GetApiAsync($"/api/projects/{site.Root}/labels")).ReadAsync<List<LabelItem>>();
        Assert.Equal(["API", "Infra", "UAT"], all.Select(l => l.Name));
    }

    [Fact]
    public async Task Labels_can_be_replaced_and_cleared_and_have_limits()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "A", labels = new[] { "UAT", "API" } });

        var changed = await (await site.Member.PatchApiAsync($"/api/tasks/{task.Id}", new { labels = new[] { "API", "Baru" } })).ReadAsync<TaskRow>();
        Assert.Equal(["API", "Baru"], changed.Labels);

        var cleared = await (await site.Member.PatchApiAsync($"/api/tasks/{task.Id}", new { labels = Array.Empty<string>() })).ReadAsync<TaskRow>();
        Assert.Empty(cleared.Labels);

        var tooMany = await TaskKit.ErrorsAsync(await site.Member.PatchApiAsync($"/api/tasks/{task.Id}", new { labels = Enumerable.Range(0, 11).Select(i => $"L{i}") }));
        var tooLong = await TaskKit.ErrorsAsync(await site.Member.PatchApiAsync($"/api/tasks/{task.Id}", new { labels = new[] { new string('x', 41) } }));
        Assert.Contains("labels", tooMany.Keys);
        Assert.Contains("labels", tooLong.Keys);
    }

    [Fact]
    public async Task Labels_do_not_leak_between_projects()
    {
        var one = await TaskKit.NewSiteAsync(App, W);
        var other = await TaskKit.NewSiteAsync(App, W);
        await TaskKit.NewTaskAsync(one.Manager, one.Root, new { title = "A", labels = new[] { "Rahasia" } });

        var labels = await (await other.Manager.GetApiAsync($"/api/projects/{other.Root}/labels")).ReadAsync<List<LabelItem>>();

        Assert.Empty(labels);
    }

    // ---------- ubah ----------

    [Fact]
    public async Task Title_description_and_priority_can_be_changed_and_cleared()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "Lama", description = "Isi lama" });

        var changed = await (await site.Member.PatchApiAsync($"/api/tasks/{task.Id}", new { title = "Baru", description = "Isi baru", priority = "Critical" })).ReadAsync<TaskRow>();
        var detail = await (await site.Member.GetApiAsync($"/api/tasks/{task.Id}")).ReadAsync<TaskDetail>();
        Assert.Equal("Baru", changed.Title);
        Assert.Equal(Priority.Critical, changed.Priority);
        Assert.Equal("Isi baru", detail.Description);

        await site.Member.PatchApiAsync($"/api/tasks/{task.Id}", new { description = "" });
        Assert.Null((await (await site.Member.GetApiAsync($"/api/tasks/{task.Id}")).ReadAsync<TaskDetail>()).Description);

        var blankTitle = await TaskKit.ErrorsAsync(await site.Member.PatchApiAsync($"/api/tasks/{task.Id}", new { title = " " }));
        Assert.Contains("title", blankTitle.Keys);
    }

    [Fact]
    public async Task A_task_can_move_to_a_sub_project_of_the_same_root_only()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var elsewhere = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);
        var sub = await (await site.Manager.PostApiAsync($"/api/tasks/{task.Id}/subtasks", new { title = "Anak" })).ReadAsync<TaskRow>();

        var moved = await (await site.Member.PatchApiAsync($"/api/tasks/{task.Id}", new { projectId = site.Child })).ReadAsync<TaskRow>();
        var listed = await TaskKit.ListAsync(site.Member, site.Root);
        var foreign = await TaskKit.ErrorsAsync(await site.Member.PatchApiAsync($"/api/tasks/{task.Id}", new { projectId = elsewhere.Root }));
        var childAlone = await TaskKit.ErrorsAsync(await site.Member.PatchApiAsync($"/api/tasks/{sub.Id}", new { projectId = site.Root }));

        Assert.Equal(site.Child, moved.ProjectId);
        Assert.Equal(site.Child, listed.Tasks.Single(t => t.Id == sub.Id).ProjectId); // sub-task ikut pindah
        Assert.Contains("projectId", foreign.Keys);
        Assert.Contains("projectId", childAlone.Keys);
    }

    [Fact]
    public async Task Dates_can_be_set_and_cleared()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);

        var set = await (await site.Member.PutApiAsync($"/api/tasks/{task.Id}/dates", new { startDate = "2026-09-28", dueDate = "2026-10-02" })).ReadAsync<TaskRow>();
        Assert.Equal(5, set.DurationDays);

        var cleared = await (await site.Member.PutApiAsync($"/api/tasks/{task.Id}/dates", new { })).ReadAsync<TaskRow>();
        Assert.Null(cleared.StartDate);
        Assert.Null(cleared.DueDate);

        var reversed = await TaskKit.ErrorsAsync(await site.Member.PutApiAsync($"/api/tasks/{task.Id}/dates", new { startDate = "2026-10-02", dueDate = "2026-10-01" }));
        Assert.Contains("dueDate", reversed.Keys);
    }

    // ---------- sub-task ----------

    [Fact]
    public async Task Subtasks_follow_their_parent_and_cannot_have_subtasks_themselves()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var parent = await TaskKit.NewTaskAsync(site.Manager, site.Child, new { title = "Induk" });
        var other = await TaskKit.NewTaskAsync(site.Manager, site.Child, new { title = "Lain" });
        var first = await (await site.Member.PostApiAsync($"/api/tasks/{parent.Id}/subtasks", new { title = "Anak 1", status = "Done" })).ReadAsync<TaskRow>();
        var second = await (await site.Member.PostApiAsync($"/api/tasks/{parent.Id}/subtasks", new { title = "Anak 2" })).ReadAsync<TaskRow>();

        var nested = await TaskKit.ErrorsAsync(await site.Member.PostApiAsync($"/api/tasks/{first.Id}/subtasks", new { title = "Cucu" }));
        var list = await TaskKit.ListAsync(site.Member, site.Root);

        Assert.Contains("parentTaskId", nested.Keys);
        Assert.Equal(parent.Id, first.ParentTaskId);
        Assert.Equal(parent.ProjectId, first.ProjectId);
        Assert.Equal([parent.Id, first.Id, second.Id, other.Id], list.Tasks.Select(t => t.Id)); // anak langsung di bawah induknya
        var shown = list.Tasks.Single(t => t.Id == parent.Id);
        Assert.Equal(2, shown.SubtaskCount);
        Assert.Equal(1, shown.SubtaskDoneCount);
    }

    [Fact]
    public async Task Progress_counts_top_level_tasks_only_and_includes_sub_projects()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "A", status = "Done" });
        await TaskKit.NewTaskAsync(site.Manager, site.Child, new { title = "B", status = "Done" });
        var open = await TaskKit.NewTaskAsync(site.Manager, site.Child, new { title = "C" });
        await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "D" });
        await site.Manager.PostApiAsync($"/api/tasks/{open.Id}/subtasks", new { title = "Anak selesai", status = "Done" }); // tidak dihitung

        var root = await TaskKit.ListAsync(site.Member, site.Root);
        var child = await TaskKit.ListAsync(site.Member, site.Child);

        Assert.Equal(new TaskProgress(2, 4, 50), root.Progress);
        Assert.Equal(new TaskProgress(1, 2, 50), child.Progress); // hanya sub-proyek ini dan turunannya
    }

    // ---------- hapus ----------

    [Fact]
    public async Task Deleting_hides_the_task_and_its_subtasks_but_keeps_the_data()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var parent = await TaskKit.NewTaskAsync(site.Manager, site.Root);
        var child = await (await site.Manager.PostApiAsync($"/api/tasks/{parent.Id}/subtasks", new { title = "Anak" })).ReadAsync<TaskRow>();
        var kept = await TaskKit.NewTaskAsync(site.Manager, site.Root);

        var deleted = await site.Member.DeleteApiAsync($"/api/tasks/{parent.Id}");

        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        Assert.Equal([kept.Id], (await TaskKit.ListAsync(site.Member, site.Root)).Tasks.Select(t => t.Id));
        Assert.Equal(HttpStatusCode.NotFound, (await site.Member.GetApiAsync($"/api/tasks/{parent.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await site.Member.GetApiAsync($"/api/tasks/{child.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await site.Member.DeleteApiAsync($"/api/tasks/{parent.Id}")).StatusCode);

        await using var scope = App.Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(2, await db.Tasks.IgnoreQueryFilters().CountAsync(t => t.Id == parent.Id || t.Id == child.Id, TestContext.Current.CancellationToken)); // tetap ada di database
    }

    [Fact]
    public async Task Deleted_tasks_do_not_count_towards_progress_or_numbers_reused()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var done = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "A", status = "Done" });
        await site.Manager.DeleteApiAsync($"/api/tasks/{done.Id}");

        var next = await TaskKit.NewTaskAsync(site.Manager, site.Root);

        Assert.Equal(new TaskProgress(0, 1, 0), (await TaskKit.ListAsync(site.Manager, site.Root)).Progress);
        Assert.Equal(2, next.Number); // nomor yang sudah dipakai tidak dipakai lagi
    }

    // ---------- baca per kunci ----------

    [Fact]
    public async Task A_task_can_be_opened_by_id_or_by_its_readable_key()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "Cari aku" });

        var byId = await (await site.Guest.GetApiAsync($"/api/tasks/{task.Id}")).ReadAsync<TaskDetail>();
        var byKey = await (await site.Guest.GetApiAsync($"/api/tasks/{task.Key}")).ReadAsync<TaskDetail>();
        var lower = await (await site.Guest.GetApiAsync($"/api/tasks/{task.Key.ToLowerInvariant()}")).ReadAsync<TaskDetail>();

        Assert.Equal(task.Id, byId.Task.Id);
        Assert.Equal(task.Id, byKey.Task.Id);
        Assert.Equal(task.Id, lower.Task.Id);
        Assert.False(byKey.CanEdit); // Tamu hanya melihat
        Assert.Equal(HttpStatusCode.NotFound, (await site.Guest.GetApiAsync($"/api/tasks/{site.Code}-999")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await site.Guest.GetApiAsync("/api/tasks/bukan-kunci")).StatusCode);
    }
}
