using System.Net;
using Ariadne.Api.Domain;
using Ariadne.Api.Features.Tasks;
using Ariadne.Api.Infrastructure.Data;
using Ariadne.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Ariadne.Api.Tests.Features.Tasks;

/// <summary>Timeline aktivitas: siapa boleh menulis dan membaca apa, mention, dan paging.</summary>
public sealed class ActivityTests(WorldFixture fx) : IClassFixture<WorldFixture>
{
    private TestApp App => fx.App;

    private World W => fx.World;

    // ---------- menulis ----------

    [Fact]
    public async Task Members_write_updates_comments_and_internal_notes_and_the_timeline_shows_newest_first()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);

        var update = await TaskKit.AddActivityAsync(site.Member, task.Id, "Update", "Runner sudah terpasang");
        var comment = await TaskKit.AddActivityAsync(site.Manager, task.Id, "Comment", "Mantap");
        var internalNote = await TaskKit.AddActivityAsync(site.Member, task.Id, "Internal", "Eskalasi kalau Rabu belum jalan");

        var page = await TaskKit.ActivitiesAsync(site.Manager, task.Id);

        Assert.Equal(ActivityKind.Update, update.Kind);
        Assert.Equal("Anggota", update.AuthorName);
        Assert.False(update.AuthorIsGuest);
        var written = page.Items.Where(a => a.Kind != ActivityKind.Log).Select(a => a.Id).ToList();
        Assert.Equal([internalNote.Id, comment.Id, update.Id], written); // terbaru dulu
        Assert.Null(page.NextBefore);
    }

    [Fact]
    public async Task A_guest_can_comment_but_cannot_write_updates_or_internal_notes()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);

        var comment = await TaskKit.AddActivityAsync(site.Guest, task.Id, "Comment", "Kami sedang memproses firewall-nya.");
        var update = await site.Guest.PostApiAsync($"/api/tasks/{task.Id}/activities", new { kind = "Update", body = "Coba" });
        var note = await site.Guest.PostApiAsync($"/api/tasks/{task.Id}/activities", new { kind = "Internal", body = "Coba" });

        Assert.True(comment.AuthorIsGuest); // ditandai "Tamu" di timeline
        Assert.Equal(HttpStatusCode.Forbidden, update.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, note.StatusCode);
        Assert.DoesNotContain(
            (await TaskKit.ActivitiesAsync(site.Manager, task.Id)).Items,
            a => a.Kind is ActivityKind.Update or ActivityKind.Internal);
    }

    [Fact]
    public async Task Outsiders_get_404_and_an_admin_who_is_not_a_member_can_read_but_not_write()
    {
        var task = W.TaskAlpha;
        var admin = await App.ClientAsync(W.Admin);
        var outsider = await App.ClientAsync(W.Outsider);

        Assert.Equal(HttpStatusCode.NotFound, (await outsider.GetApiAsync($"/api/tasks/{task}/activities")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await outsider.PostApiAsync($"/api/tasks/{task}/activities", new { kind = "Comment", body = "Halo" })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await admin.GetApiAsync($"/api/tasks/{task}/activities")).StatusCode);
        foreach (var kind in new[] { "Update", "Comment", "Internal" })
        {
            Assert.Equal(HttpStatusCode.Forbidden, (await admin.PostApiAsync($"/api/tasks/{task}/activities", new { kind, body = "Halo" })).StatusCode);
        }
    }

    [Fact]
    public async Task Log_entries_cannot_be_written_by_hand_and_the_body_is_checked()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);

        Assert.Contains("kind", (await TaskKit.ErrorsAsync(await site.Member.PostApiAsync($"/api/tasks/{task.Id}/activities", new { kind = "Log", body = "Palsu" }))).Keys);
        Assert.Contains("kind", (await TaskKit.ErrorsAsync(await site.Member.PostApiAsync($"/api/tasks/{task.Id}/activities", new { kind = "Rahasia", body = "x" }))).Keys);
        Assert.Contains("kind", (await TaskKit.ErrorsAsync(await site.Member.PostApiAsync($"/api/tasks/{task.Id}/activities", new { body = "tanpa jenis" }))).Keys);
        Assert.Contains("body", (await TaskKit.ErrorsAsync(await site.Member.PostApiAsync($"/api/tasks/{task.Id}/activities", new { kind = "Comment", body = "   " }))).Keys);
        Assert.Contains("body", (await TaskKit.ErrorsAsync(await site.Member.PostApiAsync($"/api/tasks/{task.Id}/activities", new { kind = "Comment", body = new string('x', 5001) }))).Keys);
        Assert.Equal(HttpStatusCode.Created, (await site.Member.PostApiAsync($"/api/tasks/{task.Id}/activities", new { kind = "Comment", body = new string('x', 5000) })).StatusCode);
    }

    [Fact]
    public async Task Text_is_stored_as_plain_text_never_interpreted()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);
        const string Script = "<script>alert(1)</script> <b>tebal</b>";

        var saved = await TaskKit.AddActivityAsync(site.Member, task.Id, "Comment", Script);

        Assert.Equal(Script, saved.Body);
        Assert.Equal(Script, (await TaskKit.ActivitiesAsync(site.Member, task.Id)).Items.First(a => a.Kind == ActivityKind.Comment).Body);
    }

    // ---------- Internal tidak pernah sampai ke Tamu ----------

    [Fact]
    public async Task Internal_notes_never_reach_a_guest_in_the_list_the_pages_or_the_last_update()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);
        await TaskKit.AddActivityAsync(site.Member, task.Id, "Update", "Update publik");
        await TaskKit.AddActivityAsync(site.Member, task.Id, "Internal", "RAHASIA-1");
        await TaskKit.AddActivityAsync(site.Member, task.Id, "Comment", "Komentar publik");
        await TaskKit.AddActivityAsync(site.Member, task.Id, "Internal", "RAHASIA-2");

        var all = await site.Guest.GetApiAsync($"/api/tasks/{task.Id}/activities");
        var paged = new List<ActivityItem>();
        var cursor = (long?)null;
        do
        {
            var page = await TaskKit.ActivitiesAsync(site.Guest, task.Id, cursor is null ? "limit=1" : $"limit=1&before={cursor}");
            paged.AddRange(page.Items);
            cursor = page.NextBefore;
        }
        while (cursor is not null);
        var row = (await TaskKit.ListAsync(site.Guest, site.Root)).Tasks.Single();

        var text = await all.TextAsync();
        Assert.DoesNotContain("RAHASIA", text, StringComparison.Ordinal);
        Assert.DoesNotContain(paged, a => a.Kind == ActivityKind.Internal || a.Body?.Contains("RAHASIA", StringComparison.Ordinal) == true);
        Assert.Equal(paged.Count, (await TaskKit.ActivitiesAsync(site.Guest, task.Id)).Items.Count); // paging tidak memunculkan atau menghilangkan entri
        Assert.Equal("Update publik", row.LastUpdate?.Text);

        // Anggota tetap melihatnya
        var member = await TaskKit.ActivitiesAsync(site.Member, task.Id);
        Assert.Equal(2, member.Items.Count(a => a.Kind == ActivityKind.Internal));
    }

    [Fact]
    public async Task The_last_update_column_shows_only_the_newest_update_not_comments_or_internal_notes()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);
        var other = await TaskKit.NewTaskAsync(site.Manager, site.Root);

        Assert.Null((await TaskKit.ListAsync(site.Member, site.Root)).Tasks.Single(t => t.Id == task.Id).LastUpdate);

        await TaskKit.AddActivityAsync(site.Member, task.Id, "Update", "Update lama");
        await TaskKit.AddActivityAsync(site.Manager, task.Id, "Update", "Update baru");
        await TaskKit.AddActivityAsync(site.Member, task.Id, "Comment", "Bukan update");
        await TaskKit.AddActivityAsync(site.Member, task.Id, "Internal", "Bukan update juga");

        var tasks = (await TaskKit.ListAsync(site.Member, site.Root)).Tasks;

        var last = tasks.Single(t => t.Id == task.Id).LastUpdate;
        Assert.Equal("Update baru", last?.Text);
        Assert.Equal("Admin", last?.AuthorName);
        Assert.Null(tasks.Single(t => t.Id == other.Id).LastUpdate); // task lain tidak ikut terpengaruh
    }

    // ---------- mention ----------

    [Fact]
    public async Task Mentioned_people_are_stored_and_returned_with_the_entry()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);

        var saved = await TaskKit.AddActivityAsync(site.Manager, task.Id, "Comment", "@Anggota bisa dicek proxy sementaranya?", W.Member.Id);

        var mention = Assert.Single(saved.Mentions);
        Assert.Equal((W.Member.Id, "Anggota"), (mention.UserId, mention.Name));
        var again = (await TaskKit.ActivitiesAsync(site.Member, task.Id)).Items.Single(a => a.Kind == ActivityKind.Comment);
        Assert.Equal(W.Member.Id, Assert.Single(again.Mentions).UserId);

        await using var scope = App.Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(1, await db.Mentions.CountAsync(m => m.ActivityId == saved.Id && m.UserId == W.Member.Id, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task A_guest_can_mention_team_members_in_a_comment()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);

        var saved = await TaskKit.AddActivityAsync(site.Guest, task.Id, "Comment", "Terima kasih @Anggota", W.Member.Id);

        Assert.Equal(W.Member.Id, Assert.Single(saved.Mentions).UserId);
    }

    [Fact]
    public async Task Mentions_must_be_active_project_members_written_in_the_text_and_never_a_guest_in_an_internal_note()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);
        var url = $"/api/tasks/{task.Id}/activities";

        var stranger = await TaskKit.ErrorsAsync(await site.Member.PostApiAsync(url, new { kind = "Comment", body = "@Orang Luar halo", mentionUserIds = new[] { W.Outsider.Id } }));
        var unknown = await TaskKit.ErrorsAsync(await site.Member.PostApiAsync(url, new { kind = "Comment", body = "halo", mentionUserIds = new[] { Guid.NewGuid() } }));
        var notWritten = await TaskKit.ErrorsAsync(await site.Member.PostApiAsync(url, new { kind = "Comment", body = "halo semuanya", mentionUserIds = new[] { W.Manager.Id } }));
        var guestInInternal = await TaskKit.ErrorsAsync(await site.Member.PostApiAsync(url, new { kind = "Internal", body = "@Tamu jangan baca ini", mentionUserIds = new[] { W.Guest.Id } }));
        var tooMany = await TaskKit.ErrorsAsync(await site.Member.PostApiAsync(url, new { kind = "Comment", body = "x", mentionUserIds = Enumerable.Range(0, 21).Select(_ => Guid.NewGuid()).ToArray() }));

        Assert.All([stranger, unknown, notWritten, guestInInternal, tooMany], errors => Assert.Contains("mentionUserIds", errors.Keys));
        Assert.DoesNotContain((await TaskKit.ActivitiesAsync(site.Member, task.Id)).Items, a => a.Kind != ActivityKind.Log); // yang ditolak tidak tersimpan
        // Tamu boleh ditandai di komentar biasa
        Assert.Single((await TaskKit.AddActivityAsync(site.Member, task.Id, "Comment", "@Tamu terima kasih", W.Guest.Id)).Mentions);
    }

    [Fact]
    public async Task A_person_who_was_removed_from_the_project_cannot_be_mentioned()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);
        Assert.Equal(HttpStatusCode.NoContent, (await site.Manager.DeleteApiAsync($"/api/projects/{site.Root}/members/{W.Member.Id}")).StatusCode);

        var errors = await TaskKit.ErrorsAsync(await site.Manager.PostApiAsync($"/api/tasks/{task.Id}/activities", new { kind = "Comment", body = "@Anggota halo", mentionUserIds = new[] { W.Member.Id } }));

        Assert.Contains("mentionUserIds", errors.Keys);
    }

    // ---------- paging dan task terhapus ----------

    [Fact]
    public async Task The_timeline_is_paged_newest_first_without_gaps_or_repeats()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);
        for (var i = 1; i <= 7; i++)
        {
            await TaskKit.AddActivityAsync(site.Member, task.Id, "Comment", $"Komentar {i}");
        }

        var seen = new List<string?>();
        var cursor = (long?)null;
        var pages = 0;
        do
        {
            var page = await TaskKit.ActivitiesAsync(site.Member, task.Id, cursor is null ? "limit=3" : $"limit=3&before={cursor}");
            seen.AddRange(page.Items.Where(a => a.Kind == ActivityKind.Comment).Select(a => a.Body));
            cursor = page.NextBefore;
            pages++;
        }
        while (cursor is not null);

        Assert.Equal(Enumerable.Range(1, 7).Reverse().Select(i => $"Komentar {i}"), seen);
        Assert.Equal(3, pages); // 7 komentar + 1 log "dibuat" = 8 entri: 3 + 3 + 2
        foreach (var bad in new[] { "limit=0", "limit=101", "limit=abc" })
        {
            Assert.Equal(HttpStatusCode.BadRequest, (await site.Member.GetApiAsync($"/api/tasks/{task.Id}/activities?{bad}")).StatusCode);
        }
    }

    [Fact]
    public async Task A_deleted_task_hides_its_timeline()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);
        await TaskKit.AddActivityAsync(site.Member, task.Id, "Comment", "Sebelum dihapus");

        Assert.Equal(HttpStatusCode.NoContent, (await site.Manager.DeleteApiAsync($"/api/tasks/{task.Id}")).StatusCode);

        Assert.Equal(HttpStatusCode.NotFound, (await site.Member.GetApiAsync($"/api/tasks/{task.Id}/activities")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await site.Member.PostApiAsync($"/api/tasks/{task.Id}/activities", new { kind = "Comment", body = "Sesudah" })).StatusCode);
        await using var scope = App.Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.True(await db.Activities.IgnoreQueryFilters().AnyAsync(a => a.TaskId == task.Id && a.Body == "Sebelum dihapus", TestContext.Current.CancellationToken)); // disembunyikan, bukan dihapus
    }

    [Fact]
    public async Task The_database_refuses_an_activity_that_breaks_the_shape_rules()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);
        await using var scope = App.Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        db.Activities.Add(new Activity { Id = Guid.NewGuid(), TaskId = task.Id, RootProjectId = site.Root, AuthorId = W.Admin.Id, Kind = ActivityKind.Comment, Body = "  ", CreatedAt = DateTimeOffset.UtcNow });

        await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync(TestContext.Current.CancellationToken));
    }

    // ---------- Log otomatis ----------

    [Fact]
    public async Task Creating_a_task_writes_a_created_log_and_adding_a_subtask_logs_on_the_parent()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var parent = await TaskKit.NewTaskAsync(site.Manager, site.Root);

        var sub = await (await site.Member.PostApiAsync($"/api/tasks/{parent.Id}/subtasks", new { title = "Uji ulang oleh klien" })).ReadAsync<TaskRow>();

        var onParent = (await TaskKit.ActivitiesAsync(site.Member, parent.Id)).Items;
        var onSub = (await TaskKit.ActivitiesAsync(site.Member, sub.Id)).Items;
        Assert.Equal([LogKind.SubtaskAdded, LogKind.TaskCreated], onParent.Select(a => a.LogKind).ToArray());
        var added = onParent[0];
        Assert.Equal("Anggota", added.AuthorName);
        Assert.Equal($"{site.Code}-{sub.Number}", added.Data?.Key);
        Assert.Equal("Uji ulang oleh klien", added.Data?.Title);
        Assert.Equal(LogKind.TaskCreated, Assert.Single(onSub).LogKind);
    }

    [Fact]
    public async Task Changing_the_status_writes_who_changed_what_from_and_to_and_the_hold_reason()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "X", status = "OnProgress" });

        await site.Member.PutApiAsync($"/api/tasks/{task.Id}/status", new { status = "Blocked", holdReason = "Port 443 ditutup" });
        await site.Member.PutApiAsync($"/api/tasks/{task.Id}/status", new { status = "Done" });

        var logs = (await TaskKit.ActivitiesAsync(site.Member, task.Id)).Items.Where(a => a.LogKind == LogKind.StatusChanged).ToList();
        Assert.Equal(2, logs.Count);
        Assert.Equal(("Blocked", "Done", null), (logs[0].Data?.From, logs[0].Data?.To, logs[0].Data?.Reason));
        Assert.Equal(("OnProgress", "Blocked", "Port 443 ditutup"), (logs[1].Data?.From, logs[1].Data?.To, logs[1].Data?.Reason));
        Assert.All(logs, l => Assert.Equal("Anggota", l.AuthorName));
    }

    [Fact]
    public async Task Saving_the_same_status_again_or_a_rejected_change_writes_no_log()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "X", status = "OnProgress" });

        await site.Member.PutApiAsync($"/api/tasks/{task.Id}/status", new { status = "OnProgress" });
        await site.Member.PutApiAsync($"/api/tasks/{task.Id}/status", new { status = "Blocked" }); // tanpa alasan: ditolak

        var logs = (await TaskKit.ActivitiesAsync(site.Member, task.Id)).Items;
        Assert.Equal([LogKind.TaskCreated], logs.Select(a => a.LogKind).ToArray());
    }

    [Fact]
    public async Task Changing_the_reason_of_a_held_task_without_changing_its_status_writes_no_status_log()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "X", status = "Blocked", holdReason = "Satu" });

        await site.Member.PutApiAsync($"/api/tasks/{task.Id}/status", new { status = "Blocked", holdReason = "Dua" });

        Assert.DoesNotContain((await TaskKit.ActivitiesAsync(site.Member, task.Id)).Items, a => a.LogKind == LogKind.StatusChanged);
        Assert.Equal("Dua", (await TaskKit.ListAsync(site.Member, site.Root)).Tasks.Single().HoldReason);
    }

    [Fact]
    public async Task Changing_the_dates_logs_before_and_after_only_when_something_changed()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "X", startDate = "2026-09-21", dueDate = "2026-09-25" });

        await site.Member.PutApiAsync($"/api/tasks/{task.Id}/dates", new { startDate = "2026-09-21", dueDate = "2026-09-25" }); // sama
        await site.Member.PutApiAsync($"/api/tasks/{task.Id}/dates", new { startDate = "2026-09-21", dueDate = "2026-09-30" });
        await site.Member.PutApiAsync($"/api/tasks/{task.Id}/dates", new { startDate = (string?)null, dueDate = (string?)null });

        var logs = (await TaskKit.ActivitiesAsync(site.Member, task.Id)).Items.Where(a => a.LogKind == LogKind.DatesChanged).ToList();
        Assert.Equal(2, logs.Count);
        Assert.Equal(("2026-09-21", "2026-09-30", null, null), (logs[0].Data?.FromStart, logs[0].Data?.FromDue, logs[0].Data?.ToStart, logs[0].Data?.ToDue));
        Assert.Equal(("2026-09-21", "2026-09-25", "2026-09-21", "2026-09-30"), (logs[1].Data?.FromStart, logs[1].Data?.FromDue, logs[1].Data?.ToStart, logs[1].Data?.ToDue));
    }

    [Fact]
    public async Task Changing_the_assignees_logs_who_was_added_and_who_was_removed()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "X", assigneeIds = new[] { W.Admin.Id } });

        await site.Manager.PutApiAsync($"/api/tasks/{task.Id}/assignees", new { userIds = new[] { W.Admin.Id } }); // sama
        await site.Manager.PutApiAsync($"/api/tasks/{task.Id}/assignees", new { userIds = new[] { W.Member.Id } });

        var log = Assert.Single((await TaskKit.ActivitiesAsync(site.Member, task.Id)).Items, a => a.LogKind == LogKind.AssigneesChanged);
        Assert.Equal(["Anggota"], log.Data?.Added);
        Assert.Equal(["Admin"], log.Data?.Removed);
    }

    [Fact]
    public async Task A_guest_sees_the_log_lines_but_cannot_cause_them()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);
        await site.Member.PutApiAsync($"/api/tasks/{task.Id}/status", new { status = "Done" });

        var denied = await site.Guest.PutApiAsync($"/api/tasks/{task.Id}/status", new { status = "Fixing" });

        Assert.Equal(HttpStatusCode.Forbidden, denied.StatusCode);
        var logs = (await TaskKit.ActivitiesAsync(site.Guest, task.Id)).Items;
        Assert.Equal([LogKind.StatusChanged, LogKind.TaskCreated], logs.Select(a => a.LogKind).ToArray());
    }

    [Fact]
    public async Task The_task_detail_carries_what_the_drawer_needs()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var parent = await TaskKit.NewTaskAsync(site.Manager, site.Root);
        var sub = await (await site.Member.PostApiAsync($"/api/tasks/{parent.Id}/subtasks", new { title = "Sub" })).ReadAsync<TaskRow>();

        var asParent = await (await site.Member.GetApiAsync($"/api/tasks/{parent.Key}")).ReadAsync<TaskDetail>();
        var asSub = await (await site.Guest.GetApiAsync($"/api/tasks/{sub.Key}")).ReadAsync<TaskDetail>();

        Assert.Equal(site.Root, asParent.RootProjectId);
        Assert.Equal([$"Proyek {site.Code}"], asParent.ProjectPath);
        Assert.Equal(sub.Id, Assert.Single(asParent.Subtasks).Id);
        Assert.True(asParent.CanEdit);
        Assert.True(asParent.CanComment);
        Assert.Null(asParent.Parent);
        Assert.Equal(parent.Key, asSub.Parent?.Key);
        Assert.False(asSub.CanEdit);
        Assert.True(asSub.CanComment); // Tamu boleh berkomentar
        Assert.Empty(asSub.Subtasks);
    }
}
