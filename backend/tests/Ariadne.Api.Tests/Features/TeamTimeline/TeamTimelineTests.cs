using System.Net;
using Ariadne.Api.Domain;
using Ariadne.Api.Features.Dashboard;
using Ariadne.Api.Features.Tasks;
using Ariadne.Api.Features.TeamTimeline;
using Ariadne.Api.Infrastructure.Data;
using Ariadne.Api.Tests.Features.Tasks;
using Ariadne.Api.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace Ariadne.Api.Tests.Features.TeamTimeline;

/// <summary>
/// Timeline Tim (hari ini dikunci Senin 28 September 2026). Setiap test membuat anggota tim barunya sendiri supaya
/// angka beban kerjanya tidak tercampur dengan test lain yang memakai database yang sama.
/// </summary>
public sealed class TeamTimelineTests(FakeTodayWorldFixture fx) : IClassFixture<FakeTodayWorldFixture>
{
    private TestApp App => fx.App;

    private World W => fx.World;

    private HttpClient Supervisor => App.ClientAsync(W.Supervisor).GetAwaiter().GetResult();

    /// <summary>Anggota baru di Tim A (yang dipegang Supervisor).</summary>
    private async Task<TestUser> NewTeammateAsync(string name)
    {
        var user = await App.CreateUserAsync(name);
        await using var scope = App.Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.TeamMembers.Add(new TeamMember { TeamId = W.TeamA, UserId = user.Id, Role = TeamRole.Anggota, AddedAt = DateTimeOffset.UtcNow });
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return user;
    }

    private static async Task JoinAsync(TaskKit.Site site, TestUser user)
    {
        var response = await site.Manager.PostApiAsync($"/api/projects/{site.Root}/members", new { userId = user.Id, role = "Anggota" });
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    private static async Task<TeamTimelineResponse> TimelineAsync(HttpClient client, string query = "")
    {
        var response = await client.GetApiAsync($"/api/team-timeline{query}");
        Assert.True(response.StatusCode == HttpStatusCode.OK, await response.TextAsync());
        return await response.ReadAsync<TeamTimelineResponse>();
    }

    private static string Id(TestUser user) => user.Id.ToString();

    // ---------- Timeline Tim ----------

    [Fact]
    public async Task Supervisor_sees_team_members_with_tasks_and_workload_across_projects_they_have_not_joined()
    {
        var teammate = await NewTeammateAsync("Rama Uji");
        var one = await TaskKit.NewSiteAsync(App, W);
        var two = await TaskKit.NewSiteAsync(App, W);
        await JoinAsync(one, teammate);
        await JoinAsync(two, teammate);
        await TaskKit.NewTaskAsync(one.Manager, one.Root, new { title = "a", startDate = "2026-09-21", dueDate = "2026-09-25", assigneeIds = new[] { teammate.Id } });
        await TaskKit.NewTaskAsync(two.Manager, two.Root, new { title = "b", startDate = "2026-09-24", dueDate = "2026-09-28", assigneeIds = new[] { teammate.Id } });
        await TaskKit.NewTaskAsync(two.Manager, two.Root, new { title = "selesai", status = "Done", startDate = "2026-09-21", dueDate = "2026-09-30", assigneeIds = new[] { teammate.Id } });

        var timeline = await TimelineAsync(Supervisor);

        Assert.Equal(W.TeamA, timeline.TeamId);
        Assert.Equal(FakeTodayWorldFixture.Today, timeline.Today);
        Assert.Equal((new DateOnly(2026, 9, 21), 91), (timeline.Start, timeline.DayCount));
        var person = timeline.People.Single(p => p.UserId == teammate.Id);
        Assert.Equal([1, 1, 1, 2, 2, 1, 1, 1, 0], person.Counts.Take(9)); // task Done tidak dihitung
        Assert.Equal(["a", "b"], person.Tasks.Select(t => t.Title));
        Assert.StartsWith(one.Code + "-", person.Tasks[0].Key, StringComparison.Ordinal);
        Assert.DoesNotContain(timeline.People, p => p.UserId == W.Supervisor.Id); // supervisor bukan salah satu baris
        Assert.Contains(timeline.Projects, p => p.Id == one.Root);
        Assert.Contains(timeline.Teams, t => t.Id == W.TeamA);
    }

    [Fact]
    public async Task Filters_narrow_the_task_list_but_never_the_workload_heatmap()
    {
        var teammate = await NewTeammateAsync("Khalil Uji");
        var one = await TaskKit.NewSiteAsync(App, W);
        var two = await TaskKit.NewSiteAsync(App, W);
        await JoinAsync(one, teammate);
        await JoinAsync(two, teammate);
        await TaskKit.NewTaskAsync(one.Manager, one.Root, new { title = "telat", priority = "Critical", status = "OnProgress", startDate = "2026-09-21", dueDate = "2026-09-25", assigneeIds = new[] { teammate.Id } });
        await TaskKit.NewTaskAsync(two.Manager, two.Root, new { title = "aman", priority = "Low", status = "NotStarted", startDate = "2026-09-28", dueDate = "2026-10-02", assigneeIds = new[] { teammate.Id } });

        var all = (await TimelineAsync(Supervisor)).People.Single(p => p.UserId == teammate.Id);
        Assert.Equal(["telat", "aman"], all.Tasks.Select(t => t.Title));

        async Task<TeamPerson> Filtered(string query) => (await TimelineAsync(Supervisor, query)).People.Single(p => p.UserId == teammate.Id);

        var late = await Filtered("?overdueOnly=true");
        Assert.Equal(["telat"], late.Tasks.Select(t => t.Title));
        Assert.True(late.Tasks[0].IsOverdue);
        Assert.Equal(["telat"], (await Filtered("?priority=Critical")).Tasks.Select(t => t.Title));
        Assert.Equal(["aman"], (await Filtered("?status=NotStarted")).Tasks.Select(t => t.Title));
        Assert.Equal(["aman"], (await Filtered($"?project={two.Root}")).Tasks.Select(t => t.Title));
        Assert.Empty((await Filtered($"?project={Guid.NewGuid()}")).Tasks);
        Assert.Equal(all.Counts, late.Counts); // heatmap tetap utuh
    }

    [Fact]
    public async Task Only_tasks_that_overlap_the_range_are_listed()
    {
        var teammate = await NewTeammateAsync("Bintang Uji");
        var site = await TaskKit.NewSiteAsync(App, W);
        await JoinAsync(site, teammate);
        await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "jauh", startDate = "2028-01-03", dueDate = "2028-01-07", assigneeIds = new[] { teammate.Id } });
        await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "dekat", startDate = "2026-09-29", dueDate = "2026-09-30", assigneeIds = new[] { teammate.Id } });

        var person = (await TimelineAsync(Supervisor)).People.Single(p => p.UserId == teammate.Id);

        Assert.Equal(["dekat"], person.Tasks.Select(t => t.Title));
    }

    [Fact]
    public async Task Zoom_picks_the_wide_range_and_an_unknown_zoom_or_filter_is_rejected()
    {
        var week = await TimelineAsync(Supervisor, "?zoom=week");
        Assert.Equal(("week", new DateOnly(2026, 9, 14), 182), (week.Zoom, week.Start, week.DayCount));

        Assert.Contains("zoom", (await TaskKit.ErrorsAsync(await Supervisor.GetApiAsync("/api/team-timeline?zoom=tahun"))).Keys);
        Assert.Contains("status", (await TaskKit.ErrorsAsync(await Supervisor.GetApiAsync("/api/team-timeline?status=Bukan"))).Keys);
        Assert.Contains("priority", (await TaskKit.ErrorsAsync(await Supervisor.GetApiAsync("/api/team-timeline?priority=Bukan"))).Keys);
    }

    [Fact]
    public async Task Only_the_supervisor_of_that_team_can_open_it()
    {
        var url = $"/api/team-timeline?teamId={W.TeamA}";

        Assert.Equal(HttpStatusCode.OK, (await Supervisor.GetApiAsync(url)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await (await App.ClientAsync(W.OtherSupervisor)).GetApiAsync(url)).StatusCode); // supervisor tim lain
        Assert.Equal(HttpStatusCode.Forbidden, (await (await App.ClientAsync(W.Member)).GetApiAsync(url)).StatusCode); // anggota biasa
        Assert.Equal(HttpStatusCode.NotFound, (await (await App.ClientAsync(W.Admin)).GetApiAsync(url)).StatusCode); // Admin bukan supervisor tim ini
        Assert.Equal(HttpStatusCode.NotFound, (await (await App.ClientAsync(W.Guest)).GetApiAsync(url)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Supervisor.GetApiAsync($"/api/team-timeline?teamId={Guid.NewGuid()}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await (await App.ClientAsync(W.Guest)).GetApiAsync("/api/team-timeline")).StatusCode);
    }

    // ---------- Pindahkan task ----------

    [Fact]
    public async Task Supervisor_moves_a_task_to_another_teammate_and_the_move_is_logged()
    {
        var from = await NewTeammateAsync("Rama Pindah");
        var to = await NewTeammateAsync("Galih Pindah");
        var site = await TaskKit.NewSiteAsync(App, W);
        await JoinAsync(site, from);
        await JoinAsync(site, to);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "pindah", assigneeIds = new[] { from.Id, W.Member.Id } });

        var response = await Supervisor.PostApiAsync($"/api/tasks/{task.Id}/move", new { fromUserId = from.Id, toUserId = to.Id, notify = true });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var row = await response.ReadAsync<TaskRow>();
        Assert.Equal(["Anggota", "Galih Pindah"], row.Assignees.Select(a => a.Name).Order(StringComparer.Ordinal)); // PIC lain tidak tersentuh
        var log = (await TaskKit.ActivitiesAsync(site.Manager, task.Id)).Items.First(i => i.LogKind == LogKind.TaskMoved);
        Assert.Equal(W.Supervisor.Id, log.AuthorId);
        Assert.Equal(["Rama Pindah"], log.Data!.Removed);
        Assert.Equal(["Galih Pindah"], log.Data.Added);
    }

    [Fact]
    public async Task Moving_to_someone_already_on_the_task_leaves_one_entry_for_them()
    {
        var from = await NewTeammateAsync("Dari Ganda");
        var to = await NewTeammateAsync("Ke Ganda");
        var site = await TaskKit.NewSiteAsync(App, W);
        await JoinAsync(site, from);
        await JoinAsync(site, to);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "ganda", assigneeIds = new[] { from.Id, to.Id } });

        var row = await (await Supervisor.PostApiAsync($"/api/tasks/{task.Id}/move", new { fromUserId = from.Id, toUserId = to.Id })).ReadAsync<TaskRow>();

        Assert.Equal([to.Id], row.Assignees.Select(a => a.Id));
    }

    [Fact]
    public async Task Project_manager_can_move_to_any_project_member_but_a_supervisor_only_to_their_own_team()
    {
        var from = await NewTeammateAsync("Dari Tim");
        var site = await TaskKit.NewSiteAsync(App, W);
        await JoinAsync(site, from);
        await JoinAsync(site, new TestUser(W.OtherManager.Id, W.OtherManager.Email)); // anggota proyek, tetapi bukan Tim A
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "luar tim", assigneeIds = new[] { from.Id } });
        var body = new { fromUserId = from.Id, toUserId = W.OtherManager.Id, notify = false };

        var denied = await Supervisor.PostApiAsync($"/api/tasks/{task.Id}/move", body);
        Assert.Contains("toUserId", (await TaskKit.ErrorsAsync(denied)).Keys);

        var allowed = await site.Manager.PostApiAsync($"/api/tasks/{task.Id}/move", body);
        Assert.Equal(HttpStatusCode.OK, allowed.StatusCode);
    }

    [Fact]
    public async Task The_recipient_must_be_an_active_non_guest_project_member_and_different_from_the_sender()
    {
        var from = await NewTeammateAsync("Dari Cek");
        var site = await TaskKit.NewSiteAsync(App, W);
        await JoinAsync(site, from);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "cek", assigneeIds = new[] { from.Id } });
        string Url() => $"/api/tasks/{task.Id}/move";

        Assert.Contains("toUserId", (await TaskKit.ErrorsAsync(await site.Manager.PostApiAsync(Url(), new { fromUserId = from.Id, toUserId = W.Guest.Id }))).Keys); // Tamu
        Assert.Contains("toUserId", (await TaskKit.ErrorsAsync(await site.Manager.PostApiAsync(Url(), new { fromUserId = from.Id, toUserId = W.Outsider.Id }))).Keys); // bukan anggota proyek
        Assert.Contains("toUserId", (await TaskKit.ErrorsAsync(await site.Manager.PostApiAsync(Url(), new { fromUserId = from.Id, toUserId = from.Id }))).Keys); // diri sendiri
        Assert.Contains("fromUserId", (await TaskKit.ErrorsAsync(await site.Manager.PostApiAsync(Url(), new { fromUserId = W.Member.Id, toUserId = W.Admin.Id }))).Keys); // bukan PIC
    }

    [Fact]
    public async Task Others_cannot_move_a_task()
    {
        var from = await NewTeammateAsync("Dari Izin");
        var site = await TaskKit.NewSiteAsync(App, W);
        await JoinAsync(site, from);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "izin", assigneeIds = new[] { from.Id } });
        var body = new { fromUserId = from.Id, toUserId = W.Member.Id };
        var url = $"/api/tasks/{task.Id}/move";

        Assert.Equal(HttpStatusCode.Forbidden, (await site.Member.PostApiAsync(url, body)).StatusCode); // Anggota proyek
        Assert.Equal(HttpStatusCode.Forbidden, (await site.Guest.PostApiAsync(url, body)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await (await App.ClientAsync(W.OtherSupervisor)).PostApiAsync(url, body)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await (await App.ClientAsync(W.Outsider)).PostApiAsync(url, body)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await App.Anonymous().PostApiAsync(url, body)).StatusCode);
        Assert.Equal([from.Id], (await TaskKit.ListAsync(site.Manager, site.Root)).Tasks.Single(t => t.Id == task.Id).Assignees.Select(a => a.Id)); // tidak berubah
    }

    [Fact]
    public async Task Move_candidates_show_each_persons_load_on_the_days_of_the_task_without_counting_the_task_itself()
    {
        var from = await NewTeammateAsync("Dari Beban");
        var to = await NewTeammateAsync("Ke Beban");
        var site = await TaskKit.NewSiteAsync(App, W);
        var elsewhere = await TaskKit.NewSiteAsync(App, W);
        await JoinAsync(site, from);
        await JoinAsync(site, to);
        await JoinAsync(elsewhere, to);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "beban", startDate = "2026-09-21", dueDate = "2026-09-25", assigneeIds = new[] { from.Id } });
        await TaskKit.NewTaskAsync(elsewhere.Manager, elsewhere.Root, new { title = "lain", startDate = "2026-09-23", dueDate = "2026-09-24", assigneeIds = new[] { to.Id } });

        var response = await Supervisor.GetApiAsync($"/api/tasks/{task.Id}/move-candidates");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.ReadAsync<MoveCandidates>();
        Assert.Equal((new DateOnly(2026, 9, 21), 5), (result.Start, result.DayCount));
        Assert.Equal([from.Id], result.Assignees.Select(a => a.Id));
        var recipient = result.Candidates.Single(c => c.UserId == to.Id);
        Assert.Equal([0, 0, 1, 1, 0], recipient.Counts);
        Assert.Equal(1, recipient.Peak);
        Assert.False(recipient.IsAssignee);
        var sender = result.Candidates.Single(c => c.UserId == from.Id);
        Assert.True(sender.IsAssignee);
        Assert.Equal(0, sender.Peak); // tugas ini sendiri tidak dihitung
        Assert.DoesNotContain(result.Candidates, c => c.UserId == W.Guest.Id);
    }

    // ---------- Ubah tanggal oleh supervisor ----------

    [Fact]
    public async Task Supervisor_can_change_the_dates_of_a_teammates_task_in_a_project_they_have_not_joined()
    {
        var teammate = await NewTeammateAsync("Tanggal Uji");
        var site = await TaskKit.NewSiteAsync(App, W);
        await JoinAsync(site, teammate);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "geser", startDate = "2026-09-21", dueDate = "2026-09-25", assigneeIds = new[] { teammate.Id } });

        var response = await Supervisor.PutApiAsync($"/api/tasks/{task.Id}/dates", new { startDate = "2026-09-28", dueDate = "2026-10-02" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var row = await response.ReadAsync<TaskRow>();
        Assert.Equal((new DateOnly(2026, 9, 28), new DateOnly(2026, 10, 2)), (row.StartDate, row.DueDate));
        var log = (await TaskKit.ActivitiesAsync(site.Manager, task.Id)).Items.First(i => i.LogKind == LogKind.DatesChanged);
        Assert.Equal(W.Supervisor.Id, log.AuthorId);
        // Supervisor tim lain dan supervisor yang timnya bukan PIC-nya tidak berhak
        Assert.Equal(HttpStatusCode.NotFound, (await (await App.ClientAsync(W.OtherSupervisor)).PutApiAsync($"/api/tasks/{task.Id}/dates", new { startDate = "2026-09-28", dueDate = "2026-10-02" })).StatusCode);
    }

    // ---------- Dashboard anggota ----------

    [Fact]
    public async Task Supervisor_opens_a_teammates_dashboard_with_a_banner_name_and_without_the_add_task_button()
    {
        var teammate = await NewTeammateAsync("Dashboard Uji");
        var site = await TaskKit.NewSiteAsync(App, W);
        await JoinAsync(site, teammate);
        await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "milik dia", status = "OnProgress", startDate = "2026-09-21", dueDate = "2026-10-02", assigneeIds = new[] { teammate.Id } });

        var response = await Supervisor.GetApiAsync($"/api/dashboard?userId={teammate.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var dashboard = await response.ReadAsync<DashboardResponse>();
        Assert.Equal("Dashboard Uji", dashboard.Viewing?.Name);
        Assert.Contains(dashboard.Groups.SelectMany(g => g.Tasks), t => t.Task.Title == "milik dia");
        Assert.Empty(dashboard.EditableProjects);
        Assert.Equal(1, dashboard.Summary.InProgress);

        var timeline = await Supervisor.GetApiAsync($"/api/dashboard/timeline?userId={teammate.Id}");
        Assert.Equal(HttpStatusCode.OK, timeline.StatusCode);
        Assert.Contains((await timeline.ReadAsync<TimelineResponse>()).Groups.SelectMany(g => g.Tasks), t => t.Title == "milik dia");
    }

    [Fact]
    public async Task Nobody_else_can_open_a_teammates_dashboard_and_your_own_has_no_banner()
    {
        var teammate = await NewTeammateAsync("Dashboard Tertutup");
        var url = $"/api/dashboard?userId={teammate.Id}";

        Assert.Equal(HttpStatusCode.NotFound, (await (await App.ClientAsync(W.OtherSupervisor)).GetApiAsync(url)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await (await App.ClientAsync(W.Member)).GetApiAsync(url)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await (await App.ClientAsync(W.Admin)).GetApiAsync(url)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await (await App.ClientAsync(W.Guest)).GetApiAsync(url)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await Supervisor.GetApiAsync($"/api/dashboard?userId={W.Outsider.Id}")).StatusCode); // bukan anggota timnya

        var own = await (await Supervisor.GetApiAsync($"/api/dashboard?userId={W.Supervisor.Id}")).ReadAsync<DashboardResponse>();
        Assert.Null(own.Viewing);
    }

    [Fact]
    public async Task Internal_notes_never_reach_a_supervisor_who_is_not_on_the_project_through_the_attention_panel()
    {
        var teammate = await NewTeammateAsync("Rahasia Uji");
        var site = await TaskKit.NewSiteAsync(App, W);
        await JoinAsync(site, teammate);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "rahasia", assigneeIds = new[] { teammate.Id } });
        await TaskKit.AddActivityAsync(site.Manager, task.Id, "Internal", "@Rahasia Uji catatan internal rahasia untuk dia", teammate.Id);

        var dashboard = await (await Supervisor.GetApiAsync($"/api/dashboard?userId={teammate.Id}")).ReadAsync<DashboardResponse>();

        Assert.DoesNotContain(dashboard.Attention, a => a.Kind == "Mention");
        Assert.DoesNotContain("rahasia untuk dia", string.Join(' ', dashboard.Attention.Select(a => a.Detail)), StringComparison.Ordinal);
    }
}
