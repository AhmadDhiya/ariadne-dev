using System.Net;
using Ariadne.Api.Domain;
using Ariadne.Api.Features.Notifications;
using Ariadne.Api.Tests.Features.Tasks;
using Ariadne.Api.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace Ariadne.Api.Tests.Features;

/// <summary>
/// Notifikasi (Fase 9): setiap jenis dibuat pada aksinya, tidak pernah untuk pelakunya sendiri, email segera untuk
/// mention/penugasan/pemindahan, ringkasan harian tanpa dobel, dan hak melihat diperiksa ulang setiap kali dibaca.
/// "Hari ini" dikunci ke 28 September 2026. Setiap test memakai penerima baru, jadi tidak saling mengganggu.
/// </summary>
public sealed class NotificationTests(FakeTodayWorldFixture fx) : IClassFixture<FakeTodayWorldFixture>
{
    private TestApp App => fx.App;

    private World W => fx.World;

    private sealed record Person(TestUser User, string Name, HttpClient Client);

    private async Task<Person> NewPersonAsync(TaskKit.Site site, string role = "Anggota", string name = "Penerima")
    {
        var user = await App.CreateUserAsync(name);
        var added = await site.Manager.PostApiAsync($"/api/projects/{site.Root}/members", new { userId = user.Id, role });
        Assert.Equal(HttpStatusCode.NoContent, added.StatusCode);
        return new Person(user, name, await App.ClientAsync(user));
    }

    private static async Task<NotificationPage> PageAsync(HttpClient client, string query = "")
    {
        var response = await client.GetApiAsync($"/api/notifications{(query.Length > 0 ? "?" + query : "")}");
        Assert.True(response.StatusCode == HttpStatusCode.OK, await response.TextAsync());
        return await response.ReadAsync<NotificationPage>();
    }

    private static async Task<int> UnreadAsync(HttpClient client) =>
        (await (await client.GetApiAsync("/api/notifications/unread-count")).ReadAsync<UnreadCountResponse>()).Count;

    private int EmailsTo(TestUser user) => App.Outbox.Sent.Count(m => string.Equals(m.To, user.Email, StringComparison.OrdinalIgnoreCase));

    [Fact]
    public async Task A_mention_notifies_the_person_once_with_an_excerpt_and_an_immediate_email()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var person = await NewPersonAsync(site);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "Siapkan runner" });
        var adminBefore = await UnreadAsync(site.Manager);

        // Admin menandai dirinya sendiri juga: orang tidak pernah diberi notifikasi atas aksinya sendiri
        await TaskKit.AddActivityAsync(site.Manager, task.Id, "Comment", "@Penerima tolong cek <b>runner</b>, @Admin ikut pantau", person.User.Id, W.Admin.Id);

        var page = await PageAsync(person.Client);
        var item = Assert.Single(page.Items);
        Assert.Equal(NotificationKind.Mention, item.Kind);
        Assert.Equal("Admin", item.ActorName);
        Assert.Equal(task.Key, item.TaskKey);
        Assert.Equal("Siapkan runner", item.TaskTitle);
        Assert.Equal(site.Root, item.ProjectId);
        Assert.Equal(["Proyek " + site.Code], item.Path);
        Assert.Equal("@Penerima tolong cek <b>runner</b>, @Admin ikut pantau", item.Excerpt);
        Assert.False(item.Read);
        Assert.Equal(1, page.Unread);
        Assert.Equal(1, await UnreadAsync(person.Client));
        Assert.Equal(adminBefore, await UnreadAsync(site.Manager));

        var mail = App.Outbox.LastTo(person.User.Email);
        Assert.NotNull(mail);
        Assert.Equal($"Admin menyebut Anda di {task.Key}", mail.Subject);
        Assert.Contains($"/proyek/{site.Root}/tabel?task={task.Key}", mail.TextBody, StringComparison.Ordinal);
        // Isi dari pengguna di-encode; ikon status disisipkan sebagai PNG
        Assert.Contains("&lt;b&gt;runner&lt;/b&gt;", mail.HtmlBody, StringComparison.Ordinal);
        Assert.Contains("cid:status-not-started", mail.HtmlBody, StringComparison.Ordinal);
        var icon = Assert.Single(mail.Images);
        Assert.Equal("status-not-started", icon.ContentId);
        Assert.Equal([0x89, 0x50, 0x4E, 0x47], icon.Png[..4]);
    }

    [Fact]
    public async Task Editing_a_note_notifies_newly_mentioned_people_and_forgets_removed_ones()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var first = await NewPersonAsync(site, name: "Pertama");
        var second = await NewPersonAsync(site, name: "Kedua");
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);
        var note = await TaskKit.AddActivityAsync(site.Manager, task.Id, "Update", "Progres untuk @Pertama", first.User.Id);
        Assert.Single((await PageAsync(first.Client)).Items);

        var edited = await site.Manager.PatchApiAsync($"/api/tasks/{task.Id}/activities/{note.Id}", new { body = "Progres untuk @Kedua", mentionUserIds = new[] { second.User.Id } });
        Assert.Equal(HttpStatusCode.OK, edited.StatusCode);

        Assert.Empty((await PageAsync(first.Client)).Items);
        var item = Assert.Single((await PageAsync(second.Client)).Items);
        Assert.Equal("Progres untuk @Kedua", item.Excerpt);

        // Entri dihapus: notifikasinya ikut hilang (isinya tidak boleh lagi terbaca lewat lonceng)
        Assert.Equal(HttpStatusCode.NoContent, (await site.Manager.DeleteApiAsync($"/api/tasks/{task.Id}/activities/{note.Id}")).StatusCode);
        Assert.Empty((await PageAsync(second.Client)).Items);
        Assert.Equal(0, await UnreadAsync(second.Client));
    }

    [Fact]
    public async Task Assigning_notifies_only_the_newly_added_people()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var first = await NewPersonAsync(site, name: "Pertama");
        var second = await NewPersonAsync(site, name: "Kedua");
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "Rencana cut-over", startDate = "2026-10-05", assigneeIds = new[] { first.User.Id } });

        var assigned = Assert.Single((await PageAsync(first.Client)).Items);
        Assert.Equal(NotificationKind.Assigned, assigned.Kind);
        Assert.Equal("Admin", assigned.ActorName);
        Assert.Equal(new DateOnly(2026, 10, 5), assigned.StartDate);
        Assert.Equal($"Admin menugaskan {task.Key} ke Anda", App.Outbox.LastTo(first.User.Email)?.Subject);

        var changed = await site.Manager.PutApiAsync($"/api/tasks/{task.Id}/assignees", new { userIds = new[] { first.User.Id, second.User.Id } });
        Assert.Equal(HttpStatusCode.OK, changed.StatusCode);
        Assert.Single((await PageAsync(first.Client)).Items);
        Assert.Equal(NotificationKind.Assigned, Assert.Single((await PageAsync(second.Client)).Items).Kind);

        // Menugaskan diri sendiri tidak membuat notifikasi
        var self = await TaskKit.NewTaskAsync(first.Client, site.Root, new { title = "Untuk saya", assigneeIds = new[] { first.User.Id } });
        Assert.DoesNotContain((await PageAsync(first.Client)).Items, i => i.TaskId == self.Id);
    }

    [Fact]
    public async Task Moving_with_notify_tells_the_new_assignee_who_it_came_from()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var from = await NewPersonAsync(site, name: "Rama");
        var to = await NewPersonAsync(site, name: "Galih");
        var quiet = await NewPersonAsync(site, name: "Bintang");
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "Buka akses runner", assigneeIds = new[] { from.User.Id } });

        var moved = await site.Manager.PostApiAsync($"/api/tasks/{task.Id}/move", new { fromUserId = from.User.Id, toUserId = to.User.Id, notify = true });
        Assert.Equal(HttpStatusCode.OK, moved.StatusCode);
        var item = Assert.Single((await PageAsync(to.Client)).Items);
        Assert.Equal(NotificationKind.Moved, item.Kind);
        Assert.Equal("Rama", item.FromName);
        Assert.Equal($"Admin memindahkan {task.Key} dari Rama ke Anda", App.Outbox.LastTo(to.User.Email)?.Subject);

        // Tanpa "kabari": tidak ada notifikasi maupun email
        var before = EmailsTo(quiet.User);
        var silent = await site.Manager.PostApiAsync($"/api/tasks/{task.Id}/move", new { fromUserId = to.User.Id, toUserId = quiet.User.Id, notify = false });
        Assert.Equal(HttpStatusCode.OK, silent.StatusCode);
        Assert.Empty((await PageAsync(quiet.Client)).Items);
        Assert.Equal(before, EmailsTo(quiet.User));
    }

    [Fact]
    public async Task Filters_paging_and_marking_read_work_on_ones_own_notifications()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var person = await NewPersonAsync(site);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "Task saya", assigneeIds = new[] { person.User.Id } });
        for (var i = 1; i <= 3; i++)
        {
            await TaskKit.AddActivityAsync(site.Manager, task.Id, "Comment", $"@Penerima catatan {i}", person.User.Id);
        }

        var first = await PageAsync(person.Client, "limit=2");
        Assert.Equal(2, first.Items.Count);
        Assert.Equal("@Penerima catatan 3", first.Items[0].Excerpt); // terbaru dulu
        Assert.NotNull(first.Next);
        var second = await PageAsync(person.Client, $"limit=2&before={first.Next}");
        Assert.Equal(["@Penerima catatan 1", null], second.Items.Select(i => i.Excerpt));
        Assert.Null(second.Next);
        Assert.Equal(4, first.Unread);

        Assert.Equal(3, (await PageAsync(person.Client, "filter=mentions")).Items.Count);
        Assert.Equal(HttpStatusCode.NoContent, (await person.Client.PostApiAsync($"/api/notifications/{first.Items[0].Id}/read")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await person.Client.PostApiAsync($"/api/notifications/{first.Items[0].Id}/read")).StatusCode); // dua kali tidak apa-apa
        var unread = await PageAsync(person.Client, "filter=unread");
        Assert.Equal(3, unread.Items.Count);
        Assert.DoesNotContain(unread.Items, i => i.Id == first.Items[0].Id);
        Assert.True((await PageAsync(person.Client)).Items.Single(i => i.Id == first.Items[0].Id).Read);

        Assert.Equal(HttpStatusCode.NoContent, (await person.Client.PostApiAsync("/api/notifications/read-all")).StatusCode);
        Assert.Equal(0, await UnreadAsync(person.Client));
        Assert.Empty((await PageAsync(person.Client, "filter=unread")).Items);

        Assert.Equal(HttpStatusCode.BadRequest, (await person.Client.GetApiAsync("/api/notifications?filter=semua")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await person.Client.GetApiAsync("/api/notifications?before=bukan-penanda")).StatusCode);
    }

    [Fact]
    public async Task Nobody_can_read_or_mark_someone_elses_notification()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var person = await NewPersonAsync(site);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);
        await TaskKit.AddActivityAsync(site.Manager, task.Id, "Comment", "@Penerima lihat ini", person.User.Id);
        var id = Assert.Single((await PageAsync(person.Client)).Items).Id;

        foreach (var other in new[] { W.Admin, W.Member, W.Outsider })
        {
            var client = await App.ClientAsync(other);
            Assert.Equal(HttpStatusCode.NotFound, (await client.PostApiAsync($"/api/notifications/{id}/read")).StatusCode);
            Assert.DoesNotContain((await PageAsync(client)).Items, i => i.Id == id);
        }

        Assert.Equal(HttpStatusCode.NoContent, (await site.Manager.PostApiAsync("/api/notifications/read-all")).StatusCode);
        Assert.Equal(1, await UnreadAsync(person.Client));
    }

    [Fact]
    public async Task Someone_who_becomes_a_guest_no_longer_sees_notifications_from_internal_notes()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var person = await NewPersonAsync(site);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);
        await TaskKit.AddActivityAsync(site.Manager, task.Id, "Internal", "@Penerima RAHASIA-INTERNAL eskalasi", person.User.Id);
        await TaskKit.AddActivityAsync(site.Manager, task.Id, "Comment", "@Penerima komentar biasa", person.User.Id);
        Assert.Equal(2, (await PageAsync(person.Client)).Items.Count);

        var demoted = await site.Manager.PatchApiAsync($"/api/projects/{site.Root}/members/{person.User.Id}", new { role = "Tamu" });
        Assert.Equal(HttpStatusCode.NoContent, demoted.StatusCode);
        var asGuest = await person.Client.GetApiAsync("/api/notifications");
        Assert.DoesNotContain("RAHASIA-INTERNAL", await asGuest.TextAsync(), StringComparison.Ordinal);
        Assert.Equal("@Penerima komentar biasa", Assert.Single((await asGuest.ReadAsync<NotificationPage>()).Items).Excerpt);
        Assert.Equal(1, await UnreadAsync(person.Client));

        // Dikeluarkan dari proyek: tidak ada lagi yang terlihat dari proyek itu
        Assert.Equal(HttpStatusCode.NoContent, (await site.Manager.DeleteApiAsync($"/api/projects/{site.Root}/members/{person.User.Id}")).StatusCode);
        Assert.Empty((await PageAsync(person.Client)).Items);
        Assert.Equal(0, await UnreadAsync(person.Client));
    }

    [Fact]
    public async Task A_deleted_task_hides_its_notifications()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var person = await NewPersonAsync(site);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "Task saya", assigneeIds = new[] { person.User.Id } });
        Assert.Single((await PageAsync(person.Client)).Items);

        Assert.Equal(HttpStatusCode.NoContent, (await site.Manager.DeleteApiAsync($"/api/tasks/{task.Id}")).StatusCode);
        Assert.Empty((await PageAsync(person.Client)).Items);
        Assert.Equal(0, await UnreadAsync(person.Client));
    }

    private async Task<DailyNotificationJob.Result> RunDailyJobAsync()
    {
        await using var scope = App.Factory.Services.CreateAsyncScope();
        return await scope.ServiceProvider.GetRequiredService<DailyNotificationJob>().RunAsync(TestContext.Current.CancellationToken);
    }

    [Fact]
    public async Task The_daily_job_notifies_due_tomorrow_and_overdue_once_with_one_digest_email()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var person = await NewPersonAsync(site);
        var pic = new[] { person.User.Id };
        var tomorrow = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "Label ulang kabel rak A", dueDate = "2026-09-29", assigneeIds = pic });
        var late = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "Pipeline IRS", status = "OnProgress", startDate = "2026-09-21", dueDate = "2026-09-25", assigneeIds = pic });
        await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "Sudah selesai", status = "Done", dueDate = "2026-09-20", assigneeIds = pic });
        await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "Rutin", status = "Rutin", dueDate = "2026-09-20", assigneeIds = pic });
        await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "Hari ini", dueDate = "2026-09-28", assigneeIds = pic });
        await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "Minggu depan", dueDate = "2026-10-05", assigneeIds = pic });
        await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "Bukan miliknya", dueDate = "2026-09-25" });
        var emailsBefore = EmailsTo(person.User);

        await RunDailyJobAsync();

        var daily = (await PageAsync(person.Client)).Items.Where(i => i.Kind is NotificationKind.DueTomorrow or NotificationKind.Overdue).ToList();
        Assert.Equal(2, daily.Count);
        Assert.Equal(tomorrow.Id, daily.Single(i => i.Kind == NotificationKind.DueTomorrow).TaskId);
        var overdue = daily.Single(i => i.Kind == NotificationKind.Overdue);
        Assert.Equal(late.Id, overdue.TaskId);
        Assert.Equal(3, overdue.LateDays);
        Assert.All(daily, i => Assert.Null(i.ActorName));

        Assert.Equal(emailsBefore + 1, EmailsTo(person.User));
        var digest = App.Outbox.LastTo(person.User.Email);
        Assert.NotNull(digest);
        Assert.Equal("Ringkasan task 28 Sep: 1 terlambat, 1 jatuh tempo besok", digest.Subject);
        Assert.Contains($"{late.Key} lewat tenggat 3 hari", digest.TextBody, StringComparison.Ordinal);
        Assert.Contains($"{tomorrow.Key} jatuh tempo besok, 29 Sep", digest.TextBody, StringComparison.Ordinal);
        Assert.Contains("cid:status-progress", digest.HtmlBody, StringComparison.Ordinal);
        Assert.Equal(["status-not-started", "status-progress"], digest.Images.Select(i => i.ContentId).Order(StringComparer.Ordinal));

        // Jalan lagi di hari yang sama (mis. API di-restart): tidak ada notifikasi atau email kedua
        await RunDailyJobAsync();
        Assert.Equal(2, (await PageAsync(person.Client)).Items.Count(i => i.Kind is NotificationKind.DueTomorrow or NotificationKind.Overdue));
        Assert.Equal(emailsBefore + 1, EmailsTo(person.User));
    }

    [Fact]
    public async Task Two_daily_jobs_at_the_same_time_still_make_one_notification_each()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var person = await NewPersonAsync(site);
        await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "Telat", dueDate = "2026-09-24", assigneeIds = new[] { person.User.Id } });
        var emailsBefore = EmailsTo(person.User);

        await Task.WhenAll(RunDailyJobAsync(), RunDailyJobAsync(), RunDailyJobAsync());

        Assert.Single((await PageAsync(person.Client)).Items, i => i.Kind == NotificationKind.Overdue);
        Assert.Equal(emailsBefore + 1, EmailsTo(person.User));
    }

    [Fact]
    public async Task The_daily_job_skips_inactive_people()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var person = await NewPersonAsync(site);
        await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "Besok", dueDate = "2026-09-29", assigneeIds = new[] { person.User.Id } });
        Assert.Equal(HttpStatusCode.NoContent, (await site.Manager.PatchApiAsync($"/api/users/{person.User.Id}", new { isActive = false })).StatusCode);
        var emailsBefore = EmailsTo(person.User);

        await RunDailyJobAsync();

        Assert.Equal(emailsBefore, EmailsTo(person.User));
    }
}
