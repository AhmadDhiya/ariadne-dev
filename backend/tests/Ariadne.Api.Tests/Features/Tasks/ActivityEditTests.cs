using System.Net;
using Ariadne.Api.Domain;
using Ariadne.Api.Features.Tasks;
using Ariadne.Api.Infrastructure.Data;
using Ariadne.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Ariadne.Api.Tests.Features.Tasks;

/// <summary>Mengubah dan menghapus update, komentar, dan catatan internal: siapa boleh, dan apa yang tetap terjaga.</summary>
public sealed class ActivityEditTests(WorldFixture fx) : IClassFixture<WorldFixture>
{
    private TestApp App => fx.App;

    private World W => fx.World;

    private static string Url(Guid task, Guid activity) => $"/api/tasks/{task}/activities/{activity}";

    private static async Task<ActivityItem> EditAsync(HttpClient client, Guid task, Guid activity, string body, params Guid[] mentions)
    {
        var response = await client.PatchApiAsync(Url(task, activity), new { body, mentionUserIds = mentions });
        Assert.True(response.StatusCode == HttpStatusCode.OK, await response.TextAsync());
        return await response.ReadAsync<ActivityItem>();
    }

    // ---------- mengubah ----------

    [Fact]
    public async Task The_author_can_edit_the_text_and_it_is_marked_as_edited()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);
        var original = await TaskKit.AddActivityAsync(site.Member, task.Id, "Comment", "Versi pertama");
        Assert.Null(original.EditedAt);

        var edited = await EditAsync(site.Member, task.Id, original.Id, "  Versi kedua  ");

        Assert.Equal("Versi kedua", edited.Body);
        Assert.NotNull(edited.EditedAt);
        Assert.Equal(original.CreatedAt, edited.CreatedAt); // waktu tulis asli tidak berubah
        var listed = (await TaskKit.ActivitiesAsync(site.Member, task.Id)).Items.Single(a => a.Id == original.Id);
        Assert.Equal("Versi kedua", listed.Body);
        Assert.NotNull(listed.EditedAt);
    }

    [Fact]
    public async Task Saving_the_same_text_again_does_not_mark_it_as_edited()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);
        var original = await TaskKit.AddActivityAsync(site.Member, task.Id, "Comment", "Sama saja");

        var again = await EditAsync(site.Member, task.Id, original.Id, "Sama saja");

        Assert.Null(again.EditedAt);
    }

    [Fact]
    public async Task Editing_replaces_the_mentioned_people_and_applies_the_same_rules_as_writing()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);
        var original = await TaskKit.AddActivityAsync(site.Manager, task.Id, "Comment", "@Anggota tolong cek", W.Member.Id);

        var swapped = await EditAsync(site.Manager, task.Id, original.Id, "@Tamu terima kasih", W.Guest.Id);
        var cleared = await EditAsync(site.Manager, task.Id, original.Id, "Tidak menandai siapa pun");

        Assert.Equal(W.Guest.Id, Assert.Single(swapped.Mentions).UserId);
        Assert.Empty(cleared.Mentions);
        var stranger = await TaskKit.ErrorsAsync(await site.Manager.PatchApiAsync(Url(task.Id, original.Id), new { body = "@Orang Luar", mentionUserIds = new[] { W.Outsider.Id } }));
        var notWritten = await TaskKit.ErrorsAsync(await site.Manager.PatchApiAsync(Url(task.Id, original.Id), new { body = "tanpa nama", mentionUserIds = new[] { W.Member.Id } }));
        var blank = await TaskKit.ErrorsAsync(await site.Manager.PatchApiAsync(Url(task.Id, original.Id), new { body = "   " }));
        var tooLong = await TaskKit.ErrorsAsync(await site.Manager.PatchApiAsync(Url(task.Id, original.Id), new { body = new string('x', 5001) }));
        Assert.Contains("mentionUserIds", stranger.Keys);
        Assert.Contains("mentionUserIds", notWritten.Keys);
        Assert.Contains("body", blank.Keys);
        Assert.Contains("body", tooLong.Keys);
        Assert.Equal("Tidak menandai siapa pun", (await TaskKit.ActivitiesAsync(site.Manager, task.Id)).Items.Single(a => a.Id == original.Id).Body); // yang ditolak tidak mengubah apa pun
    }

    [Fact]
    public async Task An_internal_note_cannot_be_edited_to_mention_a_guest()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);
        var note = await TaskKit.AddActivityAsync(site.Member, task.Id, "Internal", "Catatan tim");

        var errors = await TaskKit.ErrorsAsync(await site.Member.PatchApiAsync(Url(task.Id, note.Id), new { body = "@Tamu lihat ini", mentionUserIds = new[] { W.Guest.Id } }));

        Assert.Contains("mentionUserIds", errors.Keys);
    }

    [Fact]
    public async Task Only_the_author_can_edit_not_even_a_manager_or_an_admin()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);
        var comment = await TaskKit.AddActivityAsync(site.Member, task.Id, "Comment", "Milik Anggota");
        var admin = await App.ClientAsync(W.Admin); // bukan anggota proyek World.ProjectAlpha

        Assert.Equal(HttpStatusCode.Forbidden, (await site.Manager.PatchApiAsync(Url(task.Id, comment.Id), new { body = "Ditimpa" })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await site.Guest.PatchApiAsync(Url(task.Id, comment.Id), new { body = "Ditimpa" })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await admin.PatchApiAsync(Url(W.TaskAlpha, W.ActivityAlpha), new { body = "Ditimpa" })).StatusCode);
        Assert.Equal("Milik Anggota", (await TaskKit.ActivitiesAsync(site.Member, task.Id)).Items.Single(a => a.Id == comment.Id).Body);
    }

    [Fact]
    public async Task A_guest_can_edit_and_delete_their_own_comment()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);
        var comment = await TaskKit.AddActivityAsync(site.Guest, task.Id, "Comment", "Pertanyaan saya");

        var edited = await EditAsync(site.Guest, task.Id, comment.Id, "Pertanyaan saya (diperjelas)");
        var deleted = await site.Guest.DeleteApiAsync(Url(task.Id, comment.Id));

        Assert.True(edited.AuthorIsGuest);
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
    }

    [Fact]
    public async Task A_guest_cannot_see_edit_or_delete_an_internal_note_and_gets_404_like_it_does_not_exist()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);
        var note = await TaskKit.AddActivityAsync(site.Member, task.Id, "Internal", "Rahasia tim");
        var missing = Guid.NewGuid();

        var edit = await site.Guest.PatchApiAsync(Url(task.Id, note.Id), new { body = "Coba" });
        var delete = await site.Guest.DeleteApiAsync(Url(task.Id, note.Id));
        var absentEdit = await site.Guest.PatchApiAsync(Url(task.Id, missing), new { body = "Coba" });

        Assert.Equal(HttpStatusCode.NotFound, edit.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, delete.StatusCode);
        Assert.Equal(absentEdit.StatusCode, edit.StatusCode); // sama persis dengan entri yang memang tidak ada
        Assert.Equal("Rahasia tim", (await TaskKit.ActivitiesAsync(site.Member, task.Id)).Items.Single(a => a.Id == note.Id).Body);
    }

    [Fact]
    public async Task Log_lines_can_be_neither_edited_nor_deleted_by_anyone()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);
        var log = (await TaskKit.ActivitiesAsync(site.Manager, task.Id)).Items.Single(a => a.Kind == ActivityKind.Log);

        Assert.Equal(HttpStatusCode.BadRequest, (await site.Manager.PatchApiAsync(Url(task.Id, log.Id), new { body = "Palsu" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await site.Manager.DeleteApiAsync(Url(task.Id, log.Id))).StatusCode);
        Assert.Contains((await TaskKit.ActivitiesAsync(site.Manager, task.Id)).Items, a => a.Id == log.Id);
    }

    [Fact]
    public async Task An_entry_cannot_be_reached_through_another_task_or_by_an_outsider()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var one = await TaskKit.NewTaskAsync(site.Manager, site.Root);
        var two = await TaskKit.NewTaskAsync(site.Manager, site.Root);
        var comment = await TaskKit.AddActivityAsync(site.Member, one.Id, "Comment", "Di task satu");
        var outsider = await App.ClientAsync(W.Outsider);

        Assert.Equal(HttpStatusCode.NotFound, (await site.Member.PatchApiAsync(Url(two.Id, comment.Id), new { body = "Lewat task lain" })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await site.Manager.DeleteApiAsync(Url(two.Id, comment.Id))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await outsider.PatchApiAsync(Url(one.Id, comment.Id), new { body = "Dari luar" })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await outsider.DeleteApiAsync(Url(one.Id, comment.Id))).StatusCode);
    }

    [Fact]
    public async Task Someone_removed_from_the_project_can_no_longer_edit_or_delete_what_they_wrote()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);
        var comment = await TaskKit.AddActivityAsync(site.Member, task.Id, "Comment", "Sebelum dikeluarkan");
        Assert.Equal(HttpStatusCode.NoContent, (await site.Manager.DeleteApiAsync($"/api/projects/{site.Root}/members/{W.Member.Id}")).StatusCode);

        Assert.Equal(HttpStatusCode.NotFound, (await site.Member.PatchApiAsync(Url(task.Id, comment.Id), new { body = "Masih boleh?" })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await site.Member.DeleteApiAsync(Url(task.Id, comment.Id))).StatusCode);
    }

    [Fact]
    public async Task Editing_an_update_changes_the_last_update_column()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);
        var update = await TaskKit.AddActivityAsync(site.Member, task.Id, "Update", "Setengah jalan");

        await EditAsync(site.Member, task.Id, update.Id, "Hampir selesai");

        Assert.Equal("Hampir selesai", (await TaskKit.ListAsync(site.Member, site.Root)).Tasks.Single(t => t.Id == task.Id).LastUpdate?.Text);
    }

    // ---------- menghapus ----------

    [Fact]
    public async Task The_author_deletes_their_own_entry_and_it_disappears_everywhere_but_stays_in_the_database()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);
        await TaskKit.AddActivityAsync(site.Member, task.Id, "Update", "Update pertama");
        var latest = await TaskKit.AddActivityAsync(site.Member, task.Id, "Update", "Update kedua @Admin", W.Admin.Id);
        Assert.Equal("Update kedua @Admin", (await TaskKit.ListAsync(site.Member, site.Root)).Tasks.Single().LastUpdate?.Text);

        var response = await site.Member.DeleteApiAsync(Url(task.Id, latest.Id));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.DoesNotContain((await TaskKit.ActivitiesAsync(site.Member, task.Id)).Items, a => a.Id == latest.Id);
        Assert.Equal("Update pertama", (await TaskKit.ListAsync(site.Member, site.Root)).Tasks.Single().LastUpdate?.Text); // kolom kembali ke update sebelumnya
        Assert.Equal(HttpStatusCode.NotFound, (await site.Member.DeleteApiAsync(Url(task.Id, latest.Id))).StatusCode); // sudah tidak ada
        Assert.Equal(HttpStatusCode.NotFound, (await site.Member.PatchApiAsync(Url(task.Id, latest.Id), new { body = "Hidupkan lagi" })).StatusCode);
        await using var scope = App.Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var row = await db.Activities.IgnoreQueryFilters().SingleAsync(a => a.Id == latest.Id, TestContext.Current.CancellationToken);
        Assert.NotNull(row.DeletedAt);
        Assert.Equal("Update kedua @Admin", row.Body);
    }

    [Fact]
    public async Task A_manager_can_delete_other_peoples_entries_but_a_regular_member_cannot()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);
        var byManager = await TaskKit.AddActivityAsync(site.Manager, task.Id, "Comment", "Dari pengelola");
        var byGuest = await TaskKit.AddActivityAsync(site.Guest, task.Id, "Comment", "Dari tamu");

        Assert.Equal(HttpStatusCode.Forbidden, (await site.Member.DeleteApiAsync(Url(task.Id, byManager.Id))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await site.Member.DeleteApiAsync(Url(task.Id, byGuest.Id))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await site.Guest.DeleteApiAsync(Url(task.Id, byManager.Id))).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await site.Manager.DeleteApiAsync(Url(task.Id, byGuest.Id))).StatusCode);
        Assert.DoesNotContain((await TaskKit.ActivitiesAsync(site.Member, task.Id)).Items, a => a.Id == byGuest.Id);
        Assert.Contains((await TaskKit.ActivitiesAsync(site.Member, task.Id)).Items, a => a.Id == byManager.Id);
    }

    [Fact]
    public async Task An_admin_who_is_not_a_member_cannot_delete_entries()
    {
        var admin = await App.ClientAsync(W.Admin);

        Assert.Equal(HttpStatusCode.Forbidden, (await admin.DeleteApiAsync(Url(W.TaskAlpha, W.ActivityAlpha))).StatusCode);
    }

    [Fact]
    public async Task Deleted_entries_are_skipped_by_paging_without_gaps()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);
        var kept = new List<Guid>();
        for (var i = 1; i <= 6; i++)
        {
            var item = await TaskKit.AddActivityAsync(site.Member, task.Id, "Comment", $"Komentar {i}");
            if (i % 2 == 0)
            {
                Assert.Equal(HttpStatusCode.NoContent, (await site.Member.DeleteApiAsync(Url(task.Id, item.Id))).StatusCode);
            }
            else
            {
                kept.Add(item.Id);
            }
        }

        var seen = new List<Guid>();
        var cursor = (long?)null;
        do
        {
            var page = await TaskKit.ActivitiesAsync(site.Member, task.Id, cursor is null ? "limit=2" : $"limit=2&before={cursor}");
            seen.AddRange(page.Items.Where(a => a.Kind == ActivityKind.Comment).Select(a => a.Id));
            cursor = page.NextBefore;
        }
        while (cursor is not null);

        Assert.Equal(kept.AsEnumerable().Reverse(), seen);
    }
}
