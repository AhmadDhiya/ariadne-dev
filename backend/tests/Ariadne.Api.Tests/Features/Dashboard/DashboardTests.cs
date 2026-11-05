using System.Net;
using Ariadne.Api.Domain;
using Ariadne.Api.Features.Dashboard;
using Ariadne.Api.Features.Tasks;
using Ariadne.Api.Tests.Features.Tasks;
using Ariadne.Api.Tests.Infrastructure;

namespace Ariadne.Api.Tests.Features.Dashboard;

/// <summary>Dashboard pribadi (hari ini dikunci Senin 28 September 2026): kartu, daftar Hari Ini, perlu perhatian, dan timeline.</summary>
public sealed class DashboardTests(FakeTodayWorldFixture fx) : IClassFixture<FakeTodayWorldFixture>
{
    private TestApp App => fx.App;

    private World W => fx.World;

    /// <summary>Proyek baru dengan satu pekerja baru (Anggota), supaya angka dashboard tidak tercampur test lain.</summary>
    private async Task<Worker> NewWorkerAsync()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var user = await App.CreateUserAsync("Pekerja");
        Assert.Equal(HttpStatusCode.NoContent, (await site.Manager.PostApiAsync($"/api/projects/{site.Root}/members", new { userId = user.Id, role = "Anggota" })).StatusCode);
        return new Worker(site, user, await App.LoginAsync(user));
    }

    private sealed record Worker(TaskKit.Site Site, TestUser User, HttpClient Client);

    private static Task<TaskRow> MineAsync(Worker w, string title, string? start, string? due, string status = "OnProgress", string priority = "Medium", Guid? parent = null) =>
        TaskKit.NewTaskAsync(
            w.Site.Manager,
            w.Site.Root,
            new
            {
                title,
                status,
                priority,
                startDate = start,
                dueDate = due,
                holdReason = status is "Blocked" or "OnHold" or "OnRequest" ? "Menunggu" : null,
                assigneeIds = new[] { w.User.Id },
            });

    private static async Task<DashboardResponse> DashboardAsync(HttpClient client, string query = "")
    {
        var response = await client.GetApiAsync($"/api/dashboard{query}");
        Assert.True(response.StatusCode == HttpStatusCode.OK, await response.TextAsync());
        return await response.ReadAsync<DashboardResponse>();
    }

    private static string Json<T>(T value) => System.Text.Json.JsonSerializer.Serialize(value, HttpExtensions.Json);

    private static string[] Titles(DashboardGroup group) => [.. group.Tasks.Select(t => t.Task.Title)];

    // ---------- daftar Hari Ini ----------

    [Fact]
    public async Task Today_lists_only_my_open_tasks_grouped_and_sorted_by_priority_then_due_date()
    {
        var w = await NewWorkerAsync();
        await MineAsync(w, "terlambat-high", "2026-09-23", "2026-09-26", "Fixing", "High");
        await MineAsync(w, "terlambat-critical", "2026-09-21", "2026-09-25", "Blocked", "Critical");
        await MineAsync(w, "hari-ini-low", "2026-09-24", "2026-09-28", "OnProgress", "Low");
        await MineAsync(w, "hari-ini-critical", "2026-09-21", "2026-09-28", "OnProgress", "Critical");
        await MineAsync(w, "jalan-medium-awal", "2026-09-24", "2026-09-30", "OnProgress", "Medium");
        await MineAsync(w, "jalan-high-akhir", "2026-09-24", "2026-10-02", "OnProgress", "High");
        await MineAsync(w, "jalan-high-awal", "2026-09-24", "2026-09-30", "OnRequest", "High");
        await MineAsync(w, "mendatang", "2026-10-05", "2026-10-09", "NotStarted");
        await MineAsync(w, "selesai", "2026-09-14", "2026-09-18", "Done");
        await MineAsync(w, "tanpa-jadwal", null, null);
        await TaskKit.NewTaskAsync(w.Site.Manager, w.Site.Root, new { title = "milik-orang-lain", startDate = "2026-09-24", dueDate = "2026-09-30", assigneeIds = new[] { W.Admin.Id } });
        await TaskKit.NewTaskAsync(w.Site.Manager, w.Site.Root, new { title = "tanpa-pic", startDate = "2026-09-24", dueDate = "2026-09-30" });

        var dashboard = await DashboardAsync(w.Client);

        Assert.Equal(FakeTodayWorldFixture.Today, dashboard.Today);
        Assert.Equal(
            [TodayGroup.Overdue, TodayGroup.DueToday, TodayGroup.InProgress],
            dashboard.Groups.Select(g => g.Kind));
        Assert.Equal(["terlambat-critical", "terlambat-high"], Titles(dashboard.Groups[0]));
        Assert.Equal(["hari-ini-critical", "hari-ini-low"], Titles(dashboard.Groups[1]));
        Assert.Equal(["jalan-high-awal", "jalan-high-akhir", "jalan-medium-awal"], Titles(dashboard.Groups[2])); // prioritas, lalu tenggat
        Assert.Equal(3, dashboard.Groups[0].Tasks[0].Task.LateDays);
        Assert.Equal([$"Proyek {w.Site.Code}"], dashboard.Groups[0].Tasks[0].Path);
    }

    [Fact]
    public async Task The_summary_cards_count_the_right_tasks_and_describe_them()
    {
        var w = await NewWorkerAsync();
        await MineAsync(w, "a", "2026-09-21", "2026-09-25", "Fixing", "Critical"); // terlambat
        await MineAsync(w, "b", "2026-09-23", "2026-09-26", "Blocked", "High"); // terlambat, tertahan
        await MineAsync(w, "c", "2026-09-24", "2026-09-30", "OnProgress"); // minggu ini
        await MineAsync(w, "d", "2026-09-24", "2026-10-02", "OnRequest"); // minggu ini (Jumat), tertahan
        await MineAsync(w, "e", "2026-09-24", "2026-10-03", "OnProgress"); // Sabtu: bukan minggu ini
        await MineAsync(w, "f", "2026-09-14", "2026-09-18", "Done"); // selesai: tidak dihitung

        var summary = (await DashboardAsync(w.Client)).Summary;

        Assert.Equal(2, summary.Late);
        Assert.Equal([(Priority.Critical, 1), (Priority.High, 1)], summary.LateByPriority.Select(p => (p.Priority, p.Count)));
        Assert.Equal(2, summary.DueThisWeek); // c dan d; a dan b sudah lewat
        Assert.Equal(new DateOnly(2026, 10, 2), summary.WeekEnd);
        Assert.Equal(3, summary.InProgress); // a (Fixing), c, e
        Assert.Equal(1, summary.InProgressProjects);
        Assert.Equal(2, summary.Held);
        Assert.Equal([(WorkStatus.Blocked, 1), (WorkStatus.OnRequest, 1)], summary.HeldByStatus.Select(s => (s.Status, s.Count)));
    }

    [Fact]
    public async Task A_card_filters_the_list_but_the_cards_keep_their_numbers()
    {
        var w = await NewWorkerAsync();
        await MineAsync(w, "terlambat", "2026-09-21", "2026-09-25", "OnProgress");
        await MineAsync(w, "berjalan", "2026-09-24", "2026-09-30", "OnProgress");
        await MineAsync(w, "tertahan-mendatang", "2026-10-05", "2026-10-09", "OnHold");

        var all = await DashboardAsync(w.Client);
        var late = await DashboardAsync(w.Client, "?card=terlambat");
        var held = await DashboardAsync(w.Client, "?card=tertahan");
        var working = await DashboardAsync(w.Client, "?card=dikerjakan");
        var week = await DashboardAsync(w.Client, "?card=minggu");

        Assert.Null(all.Card);
        Assert.DoesNotContain(all.Groups, g => g.Kind == TodayGroup.Upcoming); // tanpa kartu, "Mendatang" tidak tampil
        Assert.Equal("terlambat", late.Card);
        Assert.Equal(["terlambat"], late.Groups.SelectMany(Titles));
        Assert.Equal(["tertahan-mendatang"], held.Groups.SelectMany(Titles)); // task tertahan yang belum mulai tidak hilang dari daftar
        Assert.Equal(TodayGroup.Upcoming, held.Groups.Single().Kind);
        Assert.Equal(["berjalan", "terlambat"], working.Groups.SelectMany(Titles).Order());
        Assert.Equal(["berjalan"], week.Groups.SelectMany(Titles));
        Assert.Equal(Json(all.Summary), Json(late.Summary)); // angka kartu tidak ikut tersaring
    }

    [Fact]
    public async Task An_unknown_card_is_rejected()
    {
        var w = await NewWorkerAsync();

        var errors = await TaskKit.ErrorsAsync(await w.Client.GetApiAsync("/api/dashboard?card=rahasia"));

        Assert.Contains("card", errors.Keys);
    }

    [Fact]
    public async Task Tasks_of_archived_projects_and_other_peoples_tasks_never_appear()
    {
        var w = await NewWorkerAsync();
        await MineAsync(w, "ada", "2026-09-24", "2026-09-30");
        var other = await NewWorkerAsync();
        await MineAsync(other, "punya-orang-lain", "2026-09-24", "2026-09-30");

        var mine = await DashboardAsync(w.Client);
        Assert.Equal(["ada"], mine.Groups.SelectMany(Titles));

        Assert.Equal(HttpStatusCode.NoContent, (await w.Site.Manager.PostApiAsync($"/api/projects/{w.Site.Root}/archive")).StatusCode);
        var afterArchive = await DashboardAsync(w.Client);
        Assert.Empty(afterArchive.Groups);
        Assert.Equal(0, afterArchive.Summary.InProgress);
        Assert.Empty((await DashboardAsync(w.Client, "?card=dikerjakan")).Groups);
    }

    [Fact]
    public async Task Someone_without_tasks_gets_an_empty_dashboard_and_a_guest_cannot_create_tasks()
    {
        var site = await TaskKit.NewSiteAsync(App, W);

        var guest = await DashboardAsync(site.Guest);

        Assert.Empty(guest.Groups);
        Assert.Empty(guest.Attention);
        Assert.Empty(guest.EditableProjects);
        Assert.Equal(0, guest.Summary.Late + guest.Summary.DueThisWeek + guest.Summary.InProgress + guest.Summary.Held);
    }

    [Fact]
    public async Task Editable_projects_are_only_those_where_I_may_create_tasks()
    {
        var w = await NewWorkerAsync();
        var guestSite = await TaskKit.NewSiteAsync(App, W);
        Assert.Equal(HttpStatusCode.NoContent, (await guestSite.Manager.PostApiAsync($"/api/projects/{guestSite.Root}/members", new { userId = w.User.Id, role = "Tamu" })).StatusCode);

        var dashboard = await DashboardAsync(w.Client);

        Assert.Equal(w.Site.Root, Assert.Single(dashboard.EditableProjects).Id);
    }

    [Fact]
    public async Task The_greeting_part_of_day_is_computed_by_the_server()
    {
        var w = await NewWorkerAsync();

        var dashboard = await DashboardAsync(w.Client);

        Assert.Contains(dashboard.DayPart, new[] { "pagi", "siang", "sore", "malam" });
    }

    // ---------- Perlu perhatian ----------

    [Fact]
    public async Task Attention_lists_mentions_assignments_by_others_due_tomorrow_and_overdue()
    {
        var w = await NewWorkerAsync();
        var overdue = await MineAsync(w, "terlambat-2-hari", "2026-09-21", "2026-09-26");
        var tomorrow = await MineAsync(w, "besok", "2026-09-24", "2026-09-29");
        var mentioned = await MineAsync(w, "dibahas", "2026-09-24", "2026-10-02");
        await TaskKit.AddActivityAsync(w.Site.Manager, mentioned.Id, "Comment", "@Pekerja bisa dicek?\ntolong lihat hasilnya", w.User.Id);
        var assigned = await TaskKit.NewTaskAsync(w.Site.Manager, w.Site.Root, new { title = "ditugaskan", startDate = "2026-10-05", dueDate = "2026-10-09", assigneeIds = new[] { W.Admin.Id } });
        Assert.Equal(HttpStatusCode.OK, (await w.Site.Manager.PutApiAsync($"/api/tasks/{assigned.Id}/assignees", new { userIds = new[] { W.Admin.Id, w.User.Id } })).StatusCode);

        var items = (await DashboardAsync(w.Client)).Attention;

        var mention = Assert.Single(items, i => i.Kind == "Mention");
        Assert.Equal(("Admin", $"{w.Site.Code}-{mentioned.Number}", "dibahas"), (mention.ActorName, mention.TaskKey, mention.TaskTitle));
        Assert.Equal("@Pekerja bisa dicek? tolong lihat hasilnya", mention.Detail); // baris baru dirapikan
        var assignment = Assert.Single(items, i => i.Kind == "Assigned" && i.TaskTitle == "ditugaskan");
        Assert.Equal(("Admin", "ditugaskan", new DateOnly(2026, 10, 5)), (assignment.ActorName, assignment.TaskTitle, assignment.StartDate));
        Assert.Equal(tomorrow.Key, Assert.Single(items, i => i.Kind == "DueTomorrow").TaskKey);
        var late = Assert.Single(items, i => i.Kind == "Overdue");
        Assert.Equal((overdue.Key, 2), (late.TaskKey, late.LateDays));
        // Yang berwaktu (mention, penugasan) di atas, terbaru dulu; yang dihitung dari tenggat sesudahnya
        var timed = items.TakeWhile(i => i.Kind is "Assigned" or "Mention").ToList();
        Assert.Equal(items.Count(i => i.Kind is "Assigned" or "Mention"), timed.Count);
        Assert.Equal(timed.OrderByDescending(i => i.At).Select(i => i.TaskKey), timed.Select(i => i.TaskKey));
        Assert.Equal(["DueTomorrow", "Overdue"], items.Skip(timed.Count).Select(i => i.Kind));
    }

    [Fact]
    public async Task A_task_created_with_me_as_assignee_counts_as_assigned_but_my_own_actions_do_not()
    {
        var w = await NewWorkerAsync();
        var byOther = await MineAsync(w, "dibuat-pengelola", "2026-10-05", "2026-10-09");
        var ownTask = await w.Client.PostApiAsync($"/api/projects/{w.Site.Root}/tasks", new { title = "buat-sendiri", assigneeIds = new[] { w.User.Id } });
        Assert.Equal(HttpStatusCode.Created, ownTask.StatusCode);
        var own = await w.Client.PostApiAsync($"/api/tasks/{byOther.Id}/activities", new { kind = "Comment", body = "@Pekerja catatan untuk diri sendiri", mentionUserIds = new[] { w.User.Id } });
        Assert.Equal(HttpStatusCode.Created, own.StatusCode);

        var items = (await DashboardAsync(w.Client)).Attention;

        Assert.Equal(byOther.Key, Assert.Single(items, i => i.Kind == "Assigned").TaskKey);
        Assert.DoesNotContain(items, i => i.Kind == "Mention"); // mention oleh diri sendiri tidak dihitung
    }

    [Fact]
    public async Task A_mention_in_an_internal_note_disappears_once_I_am_only_a_guest_or_no_longer_a_member()
    {
        var w = await NewWorkerAsync();
        var task = await MineAsync(w, "rahasia", "2026-09-24", "2026-10-02");
        await TaskKit.AddActivityAsync(w.Site.Manager, task.Id, "Internal", "@Pekerja RAHASIA-INTERNAL", w.User.Id);
        Assert.Single((await DashboardAsync(w.Client)).Attention, i => i.Kind == "Mention");

        Assert.Equal(HttpStatusCode.NoContent, (await w.Site.Manager.PatchApiAsync($"/api/projects/{w.Site.Root}/members/{w.User.Id}", new { role = "Tamu" })).StatusCode);
        var asGuest = await w.Client.GetApiAsync("/api/dashboard");
        var asGuestText = await asGuest.TextAsync();
        Assert.DoesNotContain("RAHASIA-INTERNAL", asGuestText, StringComparison.Ordinal);

        Assert.Equal(HttpStatusCode.NoContent, (await w.Site.Manager.DeleteApiAsync($"/api/projects/{w.Site.Root}/members/{w.User.Id}")).StatusCode);
        Assert.DoesNotContain("RAHASIA-INTERNAL", await (await w.Client.GetApiAsync("/api/dashboard")).TextAsync(), StringComparison.Ordinal);
    }

    // ---------- Timeline saya ----------

    private static async Task<TimelineResponse> TimelineAsync(HttpClient client, string zoom = "")
    {
        var response = await client.GetApiAsync($"/api/dashboard/timeline{(zoom.Length > 0 ? "?zoom=" + zoom : "")}");
        Assert.True(response.StatusCode == HttpStatusCode.OK, await response.TextAsync());
        return await response.ReadAsync<TimelineResponse>();
    }

    [Fact]
    public async Task The_timeline_covers_the_range_of_each_zoom_and_counts_the_workload_per_day()
    {
        var w = await NewWorkerAsync();
        await MineAsync(w, "a", "2026-09-21", "2026-09-25");
        await MineAsync(w, "b", "2026-09-24", "2026-09-28");
        await MineAsync(w, "selesai", "2026-09-21", "2026-09-30", "Done");

        var day = await TimelineAsync(w.Client);
        var week = await TimelineAsync(w.Client, "week");
        var month = await TimelineAsync(w.Client, "month");

        Assert.Equal(("day", new DateOnly(2026, 9, 21), 21), (day.Zoom, day.Start, day.DayCount));
        Assert.Equal(("week", new DateOnly(2026, 9, 21), 70), (week.Zoom, week.Start, week.DayCount)); // Senin pekan lalu
        Assert.Equal(("month", new DateOnly(2026, 8, 1), 212), (month.Zoom, month.Start, month.DayCount)); // 7 bulan utuh, Agu s.d. Feb
        Assert.Equal(21, day.Workload.Count);
        // Per kolom: Hari = per hari; Minggu = 10 pekan (a dan b aktif di pekan 21 Sep, b juga di 28 Sep); Bulan = 7 bulan
        Assert.Equal(day.Workload, day.ColumnWorkload);
        Assert.Equal([2, 1, 0, 0, 0, 0, 0, 0, 0, 0], week.ColumnWorkload);
        Assert.Equal([0, 2, 0, 0, 0, 0, 0], month.ColumnWorkload);
        // 21 Sep s.d. 25 Sep: a; 24 Sep s.d. 28 Sep: b; Done tidak dihitung
        Assert.Equal([1, 1, 1, 2, 2, 1, 1, 1, 0], day.Workload.Take(9));
        Assert.Equal(day.Today, FakeTodayWorldFixture.Today);
    }

    [Fact]
    public async Task The_timeline_groups_my_tasks_per_project_and_leaves_out_what_falls_outside_the_range()
    {
        var w = await NewWorkerAsync();
        await MineAsync(w, "di-dalam", "2026-09-25", "2026-09-30", "Blocked", "Critical");
        await MineAsync(w, "sebelum-rentang", "2026-08-01", "2026-08-10");
        await MineAsync(w, "setelah-rentang", "2026-11-01", "2026-11-10");
        await MineAsync(w, "sebagian", "2026-09-10", "2026-09-22"); // menyentuh batas awal
        await MineAsync(w, "tanpa-jadwal", null, null);
        var otherProject = await TaskKit.NewSiteAsync(App, W);
        Assert.Equal(HttpStatusCode.NoContent, (await otherProject.Manager.PostApiAsync($"/api/projects/{otherProject.Root}/members", new { userId = w.User.Id, role = "Anggota" })).StatusCode);
        await TaskKit.NewTaskAsync(otherProject.Manager, otherProject.Root, new { title = "proyek-lain", startDate = "2026-09-28", dueDate = "2026-09-29", assigneeIds = new[] { w.User.Id } });

        var timeline = await TimelineAsync(w.Client);

        Assert.Equal(2, timeline.Groups.Count);
        var mine = timeline.Groups.Single(g => g.ProjectId == w.Site.Root);
        Assert.Equal(["sebagian", "di-dalam"], mine.Tasks.Select(t => t.Title)); // urut tanggal mulai
        Assert.Equal(w.Site.Code, mine.Code);
        Assert.Equal(WorkStatus.Blocked, mine.Tasks[1].Status);
        Assert.False(mine.Tasks[1].IsOverdue);
        Assert.Equal("proyek-lain", Assert.Single(timeline.Groups.Single(g => g.ProjectId == otherProject.Root).Tasks).Title);
    }

    [Fact]
    public async Task The_timeline_shows_the_milestones_of_my_projects_that_fall_in_the_range()
    {
        var w = await NewWorkerAsync();
        await MineAsync(w, "ada", "2026-09-24", "2026-10-02");
        await w.Site.Manager.PostApiAsync($"/api/projects/{w.Site.Root}/milestones", new { name = "UAT", date = "2026-10-05" });
        await w.Site.Manager.PostApiAsync($"/api/projects/{w.Site.Root}/milestones", new { name = "Di luar rentang", date = "2027-03-01" });
        var elsewhere = await TaskKit.NewSiteAsync(App, W);
        await elsewhere.Manager.PostApiAsync($"/api/projects/{elsewhere.Root}/milestones", new { name = "Proyek orang lain", date = "2026-10-05" });

        var group = Assert.Single((await TimelineAsync(w.Client)).Groups);

        Assert.Equal(["UAT"], group.Milestones.Select(m => m.Name));
    }

    [Fact]
    public async Task An_unknown_zoom_is_rejected()
    {
        var w = await NewWorkerAsync();

        var errors = await TaskKit.ErrorsAsync(await w.Client.GetApiAsync("/api/dashboard/timeline?zoom=tahun"));

        Assert.Contains("zoom", errors.Keys);
    }
}
