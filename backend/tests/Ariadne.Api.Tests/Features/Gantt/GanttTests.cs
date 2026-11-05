using System.Net;
using Ariadne.Api.Features.Gantt;
using Ariadne.Api.Features.Milestones;
using Ariadne.Api.Tests.Features.Tasks;
using Ariadne.Api.Tests.Infrastructure;

namespace Ariadne.Api.Tests.Features.Gantt;

/// <summary>Data Gantt proyek (hari ini dikunci Senin 28 September 2026): rentang per zoom, milestone, dan beban kerja per orang.</summary>
public sealed class GanttTests(FakeTodayWorldFixture fx) : IClassFixture<FakeTodayWorldFixture>
{
    private TestApp App => fx.App;

    private World W => fx.World;

    private static async Task<GanttResponse> GanttAsync(HttpClient client, Guid project, string zoom = "")
    {
        var response = await client.GetApiAsync($"/api/projects/{project}/gantt{(zoom.Length > 0 ? "?zoom=" + zoom : "")}");
        Assert.True(response.StatusCode == HttpStatusCode.OK, await response.TextAsync());
        return await response.ReadAsync<GanttResponse>();
    }

    [Fact]
    public async Task Each_zoom_has_a_wide_range_that_scrolls_sideways()
    {
        var site = await TaskKit.NewSiteAsync(App, W);

        var day = await GanttAsync(site.Member, site.Root);
        var week = await GanttAsync(site.Member, site.Root, "week");
        var month = await GanttAsync(site.Member, site.Root, "month");

        Assert.Equal(("day", new DateOnly(2026, 9, 21), 91), (day.Zoom, day.Start, day.DayCount));
        Assert.Equal(("week", new DateOnly(2026, 9, 14), 182), (week.Zoom, week.Start, week.DayCount)); // Senin, dua pekan sebelum hari ini
        Assert.Equal(("month", new DateOnly(2026, 8, 1), 365), (month.Zoom, month.Start, month.DayCount)); // 12 bulan utuh
        Assert.All(week.Workload, p => Assert.Equal(26, p.ColumnCounts.Count));
        Assert.All(month.Workload, p => Assert.Equal(12, p.ColumnCounts.Count));
        Assert.Equal(FakeTodayWorldFixture.Today, day.Today);
        Assert.Equal(DayOfWeek.Monday, week.Start.DayOfWeek);
    }

    [Fact]
    public async Task An_unknown_zoom_is_rejected()
    {
        var site = await TaskKit.NewSiteAsync(App, W);

        Assert.Contains("zoom", (await TaskKit.ErrorsAsync(await site.Member.GetApiAsync($"/api/projects/{site.Root}/gantt?zoom=tahun"))).Keys);
    }

    [Fact]
    public async Task Workload_counts_each_members_active_tasks_per_day_in_this_project_only()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        // Anggota ("Anggota"): 21-25 Sep dan 24-28 Sep di proyek ini, 1 task Done, dan 1 task di proyek lain
        await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "a", startDate = "2026-09-21", dueDate = "2026-09-25", assigneeIds = new[] { W.Member.Id } });
        await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "b", startDate = "2026-09-24", dueDate = "2026-09-28", assigneeIds = new[] { W.Member.Id } });
        await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "selesai", status = "Done", startDate = "2026-09-21", dueDate = "2026-09-30", assigneeIds = new[] { W.Member.Id } });
        var other = await TaskKit.NewSiteAsync(App, W);
        await TaskKit.NewTaskAsync(other.Manager, other.Root, new { title = "proyek-lain", startDate = "2026-09-21", dueDate = "2026-09-30", assigneeIds = new[] { W.Member.Id } });

        var gantt = await GanttAsync(site.Guest, site.Root);

        var person = gantt.Workload.Single(p => p.UserId == W.Member.Id);
        Assert.Equal("Anggota", person.Name);
        Assert.Equal(91, person.Counts.Count);
        Assert.Equal([1, 1, 1, 2, 2, 1, 1, 1, 0], person.Counts.Take(9)); // 21 sampai 29 Sep
        Assert.All(gantt.Workload.Where(p => p.UserId != W.Member.Id), p => Assert.All(p.Counts, c => Assert.Equal(0, c)));
    }

    [Fact]
    public async Task Workload_lists_members_without_guests_in_name_order_even_with_no_tasks()
    {
        var site = await TaskKit.NewSiteAsync(App, W);

        var gantt = await GanttAsync(site.Manager, site.Root);

        Assert.Equal(["Admin", "Anggota"], gantt.Workload.Select(p => p.Name)); // Pengelola dan Anggota; Tamu tidak
        Assert.DoesNotContain(gantt.Workload, p => p.UserId == W.Guest.Id);
    }

    [Fact]
    public async Task A_sub_project_gantt_counts_only_its_own_tasks()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "di-root", startDate = "2026-09-21", dueDate = "2026-09-21", assigneeIds = new[] { W.Member.Id } });
        await TaskKit.NewTaskAsync(site.Manager, site.Child, new { title = "di-child", startDate = "2026-09-21", dueDate = "2026-09-22", assigneeIds = new[] { W.Member.Id } });

        var root = (await GanttAsync(site.Member, site.Root)).Workload.Single(p => p.UserId == W.Member.Id).Counts;
        var child = (await GanttAsync(site.Member, site.Child)).Workload.Single(p => p.UserId == W.Member.Id).Counts;

        Assert.Equal([2, 1], root.Take(2));
        Assert.Equal([1, 1], child.Take(2));
    }

    [Fact]
    public async Task Milestones_in_range_come_with_their_project_path_and_done_flag()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var created = await (await site.Manager.PostApiAsync($"/api/projects/{site.Child}/milestones", new { name = "UAT", date = "2026-10-05" })).ReadAsync<MilestoneItem>();
        await site.Manager.PatchApiAsync($"/api/milestones/{created.Id}", new { isDone = true });

        var gantt = await GanttAsync(site.Member, site.Root);

        var milestone = Assert.Single(gantt.Milestones);
        Assert.Equal(("UAT", new DateOnly(2026, 10, 5), true), (milestone.Name, milestone.Date, milestone.IsDone));
        Assert.Equal([$"Proyek {site.Code}", "Modul"], milestone.Path);
    }

    [Fact]
    public async Task Outsiders_and_archived_projects_are_404()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var outsider = await App.ClientAsync(W.Outsider);

        Assert.Equal(HttpStatusCode.NotFound, (await outsider.GetApiAsync($"/api/projects/{site.Root}/gantt")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await site.Manager.PostApiAsync($"/api/projects/{site.Root}/archive")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await site.Member.GetApiAsync($"/api/projects/{site.Root}/gantt")).StatusCode);
    }
}
