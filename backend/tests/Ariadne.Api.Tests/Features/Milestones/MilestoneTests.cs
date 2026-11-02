using System.Net;
using Ariadne.Api.Features.Gantt;
using Ariadne.Api.Features.Milestones;
using Ariadne.Api.Features.Projects;
using Ariadne.Api.Tests.Features.Tasks;
using Ariadne.Api.Tests.Infrastructure;

namespace Ariadne.Api.Tests.Features.Milestones;

/// <summary>Milestone proyek: semua anggota melihat, hanya Pengelola dan Admin yang mengelola.</summary>
public sealed class MilestoneTests(WorldFixture fx) : IClassFixture<WorldFixture>
{
    private TestApp App => fx.App;

    private World W => fx.World;

    private static async Task<MilestoneItem> AddAsync(HttpClient client, Guid project, string name, string date)
    {
        var response = await client.PostApiAsync($"/api/projects/{project}/milestones", new { name, date });
        Assert.True(response.StatusCode == HttpStatusCode.Created, await response.TextAsync());
        return await response.ReadAsync<MilestoneItem>();
    }

    private static async Task<List<MilestoneItem>> ListAsync(HttpClient client, Guid project)
    {
        var response = await client.GetApiAsync($"/api/projects/{project}/milestones");
        Assert.True(response.StatusCode == HttpStatusCode.OK, await response.TextAsync());
        return await response.ReadAsync<List<MilestoneItem>>();
    }

    [Fact]
    public async Task A_manager_creates_milestones_and_everyone_in_the_project_sees_them_sorted_by_date()
    {
        var site = await TaskKit.NewSiteAsync(App, W);

        var late = await AddAsync(site.Manager, site.Root, "Go-Live", "2026-10-30");
        var early = await AddAsync(site.Manager, site.Root, "UAT", "2026-10-05");

        Assert.Equal(["UAT", "Go-Live"], (await ListAsync(site.Member, site.Root)).Select(m => m.Name));
        Assert.Equal(["UAT", "Go-Live"], (await ListAsync(site.Guest, site.Root)).Select(m => m.Name)); // Tamu boleh melihat
        Assert.Equal(new DateOnly(2026, 10, 5), early.Date);
        Assert.False(late.IsDone);
        Assert.Equal([$"Proyek {site.Code}"], late.Path);
    }

    [Fact]
    public async Task Members_and_guests_cannot_manage_milestones_and_outsiders_get_404()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var milestone = await AddAsync(site.Manager, site.Root, "Tetap", "2026-10-05");
        var outsider = await App.ClientAsync(W.Outsider);

        foreach (var client in new[] { site.Member, site.Guest })
        {
            Assert.Equal(HttpStatusCode.Forbidden, (await client.PostApiAsync($"/api/projects/{site.Root}/milestones", new { name = "X", date = "2026-10-06" })).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await client.PatchApiAsync($"/api/milestones/{milestone.Id}", new { name = "Diganti" })).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await client.DeleteApiAsync($"/api/milestones/{milestone.Id}")).StatusCode);
        }

        Assert.Equal(HttpStatusCode.NotFound, (await outsider.GetApiAsync($"/api/projects/{site.Root}/milestones")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await outsider.PatchApiAsync($"/api/milestones/{milestone.Id}", new { name = "X" })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await outsider.DeleteApiAsync($"/api/milestones/{milestone.Id}")).StatusCode);
        Assert.Equal(["Tetap"], (await ListAsync(site.Manager, site.Root)).Select(m => m.Name)); // tidak ada yang berubah
    }

    [Fact]
    public async Task An_admin_who_is_not_a_member_can_manage_milestones()
    {
        var admin = await App.ClientAsync(W.Admin); // bukan anggota World.ProjectAlpha
        var created = await AddAsync(admin, W.ProjectAlpha, "Dari admin", "2030-02-02");

        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteApiAsync($"/api/milestones/{created.Id}")).StatusCode);
    }

    [Fact]
    public async Task Name_and_date_are_validated()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var url = $"/api/projects/{site.Root}/milestones";

        Assert.Contains("name", (await TaskKit.ErrorsAsync(await site.Manager.PostApiAsync(url, new { name = "   ", date = "2026-10-05" }))).Keys);
        Assert.Contains("name", (await TaskKit.ErrorsAsync(await site.Manager.PostApiAsync(url, new { name = new string('x', 101), date = "2026-10-05" }))).Keys);
        Assert.Contains("date", (await TaskKit.ErrorsAsync(await site.Manager.PostApiAsync(url, new { name = "Tanpa tanggal" }))).Keys);
        Assert.Contains("date", (await TaskKit.ErrorsAsync(await site.Manager.PostApiAsync(url, new { name = "Zaman purba", date = "1900-01-01" }))).Keys);
        Assert.Empty(await ListAsync(site.Manager, site.Root)); // yang ditolak tidak tersimpan
    }

    [Fact]
    public async Task A_milestone_can_be_renamed_rescheduled_marked_done_and_moved_within_the_same_project()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var milestone = await AddAsync(site.Manager, site.Root, "UAT", "2026-10-05");

        var changed = await (await site.Manager.PatchApiAsync($"/api/milestones/{milestone.Id}", new { name = "UAT SLMS", date = "2026-10-12", isDone = true, projectId = site.Child })).ReadAsync<MilestoneItem>();

        Assert.Equal(("UAT SLMS", new DateOnly(2026, 10, 12), true, site.Child), (changed.Name, changed.Date, changed.IsDone, changed.ProjectId));
        Assert.Equal([$"Proyek {site.Code}", "Modul"], changed.Path);
        var reopened = await (await site.Manager.PatchApiAsync($"/api/milestones/{milestone.Id}", new { isDone = false })).ReadAsync<MilestoneItem>();
        Assert.False(reopened.IsDone);
        Assert.Equal("UAT SLMS", reopened.Name); // yang tidak disebut tidak berubah
    }

    [Fact]
    public async Task A_milestone_cannot_be_moved_to_another_project_or_get_invalid_values()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var other = await TaskKit.NewSiteAsync(App, W);
        var milestone = await AddAsync(site.Manager, site.Root, "Tetap", "2026-10-05");

        var moved = await TaskKit.ErrorsAsync(await site.Manager.PatchApiAsync($"/api/milestones/{milestone.Id}", new { projectId = other.Root }));
        var blank = await TaskKit.ErrorsAsync(await site.Manager.PatchApiAsync($"/api/milestones/{milestone.Id}", new { name = "  " }));

        Assert.Contains("projectId", moved.Keys);
        Assert.Contains("name", blank.Keys);
        Assert.Equal(site.Root, (await ListAsync(site.Manager, site.Root)).Single().ProjectId);
    }

    [Fact]
    public async Task Deleting_removes_it_and_a_second_delete_is_404()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var milestone = await AddAsync(site.Manager, site.Root, "Sementara", "2026-10-05");

        Assert.Equal(HttpStatusCode.NoContent, (await site.Manager.DeleteApiAsync($"/api/milestones/{milestone.Id}")).StatusCode);

        Assert.Empty(await ListAsync(site.Manager, site.Root));
        Assert.Equal(HttpStatusCode.NotFound, (await site.Manager.DeleteApiAsync($"/api/milestones/{milestone.Id}")).StatusCode);
    }

    [Fact]
    public async Task Listing_a_sub_project_shows_only_its_own_subtree()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        await AddAsync(site.Manager, site.Root, "Di root", "2026-10-30");
        await AddAsync(site.Manager, site.Child, "Di sub-proyek", "2026-10-05");

        var root = await ListAsync(site.Manager, site.Root);
        var child = await ListAsync(site.Manager, site.Child);

        Assert.Equal(["Di sub-proyek", "Di root"], root.Select(m => m.Name));
        Assert.Equal(["Di sub-proyek"], child.Select(m => m.Name));
        Assert.Equal([$"Proyek {site.Code}", "Modul"], child.Single().Path);
    }

    [Fact]
    public async Task Archived_projects_hide_their_milestones()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var milestone = await AddAsync(site.Manager, site.Root, "Terarsip", "2026-10-05");
        Assert.Equal(HttpStatusCode.NoContent, (await site.Manager.PostApiAsync($"/api/projects/{site.Root}/archive")).StatusCode);

        Assert.Equal(HttpStatusCode.NotFound, (await site.Manager.GetApiAsync($"/api/projects/{site.Root}/milestones")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await site.Manager.PatchApiAsync($"/api/milestones/{milestone.Id}", new { name = "X" })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await site.Manager.PostApiAsync($"/api/projects/{site.Root}/milestones", new { name = "X", date = "2026-10-06" })).StatusCode);
    }

    [Fact]
    public async Task The_gantt_response_carries_only_milestones_inside_the_range_of_the_zoom()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        await AddAsync(site.Manager, site.Root, "Dekat", "2030-01-02");
        await AddAsync(site.Manager, site.Root, "Sangat jauh", "2099-01-01");

        var gantt = await (await site.Member.GetApiAsync($"/api/projects/{site.Root}/gantt")).ReadAsync<GanttResponse>();

        Assert.DoesNotContain(gantt.Milestones, m => m.Name == "Sangat jauh");
        Assert.All(gantt.Milestones, m => Assert.InRange(m.Date, gantt.Start, gantt.Start.AddDays(gantt.DayCount - 1)));
    }
}
