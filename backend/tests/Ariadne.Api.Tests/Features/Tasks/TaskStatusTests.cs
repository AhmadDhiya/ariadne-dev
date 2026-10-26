using System.Net;
using Ariadne.Api.Domain;
using Ariadne.Api.Features.Tasks;
using Ariadne.Api.Infrastructure.Data;
using Ariadne.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Ariadne.Api.Tests.Features.Tasks;

/// <summary>Aturan status tertahan (docs/domain.md): alasan wajib, "sejak kapan" otomatis, dibersihkan saat keluar.</summary>
public sealed class TaskStatusTests(FakeTodayWorldFixture fx) : IClassFixture<FakeTodayWorldFixture>
{
    private TestApp App => fx.App;

    private World W => fx.World;

    [Theory]
    [InlineData("Blocked")]
    [InlineData("OnHold")]
    [InlineData("OnRequest")]
    public async Task Moving_to_a_held_status_without_a_reason_is_rejected(string status)
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "X", status = "OnProgress" });

        var none = await TaskKit.ErrorsAsync(await site.Member.PutApiAsync($"/api/tasks/{task.Id}/status", new { status }));
        var blank = await TaskKit.ErrorsAsync(await site.Member.PutApiAsync($"/api/tasks/{task.Id}/status", new { status, holdReason = "   " }));
        var tooLong = await TaskKit.ErrorsAsync(await site.Member.PutApiAsync($"/api/tasks/{task.Id}/status", new { status, holdReason = new string('x', 1001) }));

        Assert.Contains("holdReason", none.Keys);
        Assert.Contains("holdReason", blank.Keys);
        Assert.Contains("holdReason", tooLong.Keys);
        var unchanged = (await TaskKit.ListAsync(site.Member, site.Root)).Tasks.Single();
        Assert.Equal(WorkStatus.OnProgress, unchanged.Status); // gagal = status tidak berubah sama sekali
        Assert.Null(unchanged.HoldReason);
    }

    [Fact]
    public async Task A_new_task_cannot_start_in_a_held_status_without_a_reason()
    {
        var site = await TaskKit.NewSiteAsync(App, W);

        var errors = await TaskKit.ErrorsAsync(await site.Manager.PostApiAsync($"/api/projects/{site.Root}/tasks", new { title = "X", status = "Blocked" }));
        var created = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "Y", status = "OnHold", holdReason = "Menunggu jadwal" });

        Assert.Contains("holdReason", errors.Keys);
        Assert.Equal("Menunggu jadwal", created.HoldReason);
        Assert.NotNull(created.HeldSince);
    }

    [Fact]
    public async Task A_held_status_records_the_reason_who_we_wait_for_and_since_when()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root, new { title = "X", status = "OnProgress" });

        var held = await (await site.Member.PutApiAsync($"/api/tasks/{task.Id}/status", new { status = "Blocked", holdReason = "  Port 443 ditutup firewall  ", waitingOnUserId = W.Member.Id })).ReadAsync<TaskRow>();

        Assert.Equal(WorkStatus.Blocked, held.Status);
        Assert.Equal("Port 443 ditutup firewall", held.HoldReason);
        Assert.Equal("Anggota", held.WaitingOn); // nama tampil orang itu
        Assert.Equal(FakeTodayWorldFixture.Today, DateOnly.FromDateTime(held.HeldSince!.Value.ToOffset(TimeSpan.FromHours(7)).DateTime));
    }

    [Fact]
    public async Task Waiting_on_can_be_free_text_but_not_both_and_a_person_must_belong_to_the_project()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);

        var text = await (await site.Member.PutApiAsync($"/api/tasks/{task.Id}/status", new { status = "OnRequest", holdReason = "Akun VPN", waitingOnText = " Klien, tim IT " })).ReadAsync<TaskRow>();
        var both = await TaskKit.ErrorsAsync(await site.Member.PutApiAsync($"/api/tasks/{task.Id}/status", new { status = "OnRequest", holdReason = "X", waitingOnText = "Klien", waitingOnUserId = W.Member.Id }));
        var stranger = await TaskKit.ErrorsAsync(await site.Member.PutApiAsync($"/api/tasks/{task.Id}/status", new { status = "OnRequest", holdReason = "X", waitingOnUserId = W.Outsider.Id }));
        var tooLong = await TaskKit.ErrorsAsync(await site.Member.PutApiAsync($"/api/tasks/{task.Id}/status", new { status = "OnRequest", holdReason = "X", waitingOnText = new string('x', 201) }));

        Assert.Equal("Klien, tim IT", text.WaitingOn);
        Assert.Contains("waitingOnText", both.Keys);
        Assert.Contains("waitingOnUserId", stranger.Keys);
        Assert.Contains("waitingOnText", tooLong.Keys);
    }

    [Fact]
    public async Task Moving_between_held_statuses_keeps_since_but_updates_the_reason()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);
        var first = await (await site.Member.PutApiAsync($"/api/tasks/{task.Id}/status", new { status = "Blocked", holdReason = "Alasan satu" })).ReadAsync<TaskRow>();

        var second = await (await site.Member.PutApiAsync($"/api/tasks/{task.Id}/status", new { status = "OnHold", holdReason = "Alasan dua" })).ReadAsync<TaskRow>();

        Assert.Equal(first.HeldSince, second.HeldSince);
        Assert.Equal("Alasan dua", second.HoldReason);
        Assert.Equal(WorkStatus.OnHold, second.Status);
    }

    [Theory]
    [InlineData("OnProgress")]
    [InlineData("Done")]
    [InlineData("Rutin")]
    [InlineData("NotStarted")]
    [InlineData("Fixing")]
    public async Task Leaving_a_held_status_clears_reason_waiting_on_and_since(string status)
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);
        await site.Member.PutApiAsync($"/api/tasks/{task.Id}/status", new { status = "Blocked", holdReason = "Alasan", waitingOnUserId = W.Member.Id });

        var freed = await (await site.Member.PutApiAsync($"/api/tasks/{task.Id}/status", new { status, holdReason = "diabaikan", waitingOnText = "diabaikan" })).ReadAsync<TaskRow>();

        Assert.Equal(Enum.Parse<WorkStatus>(status), freed.Status);
        Assert.Null(freed.HoldReason);
        Assert.Null(freed.WaitingOn);
        Assert.Null(freed.HeldSince);
    }

    [Fact]
    public async Task The_database_itself_refuses_a_held_task_without_a_reason()
    {
        // Pertahanan lapis kedua: walau ada bug di kode, baris yang melanggar aturan tidak bisa tersimpan
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);

        await using var scope = App.Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var entity = await db.Tasks.SingleAsync(t => t.Id == task.Id, TestContext.Current.CancellationToken);
        entity.Status = WorkStatus.Blocked;

        await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Every_status_name_is_accepted_and_unknown_ones_are_not()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);

        foreach (var status in new[] { "NotStarted", "OnProgress", "Fixing", "Done", "Rutin" })
        {
            Assert.Equal(HttpStatusCode.OK, (await site.Member.PutApiAsync($"/api/tasks/{task.Id}/status", new { status })).StatusCode);
        }

        foreach (var bad in new[] { "", "0", "7", "done", "Selesai" })
        {
            Assert.Contains("status", (await TaskKit.ErrorsAsync(await site.Member.PutApiAsync($"/api/tasks/{task.Id}/status", new { status = bad }))).Keys);
        }
    }

    [Fact]
    public async Task Two_people_saving_the_same_task_at_once_never_corrupt_it()
    {
        var site = await TaskKit.NewSiteAsync(App, W);
        var task = await TaskKit.NewTaskAsync(site.Manager, site.Root);

        var results = await Task.WhenAll(Enumerable.Range(0, 8).Select(i =>
            (i % 2 == 0 ? site.Manager : site.Member).PutApiAsync($"/api/tasks/{task.Id}/status", new { status = i % 2 == 0 ? "OnProgress" : "Blocked", holdReason = "Uji" })));

        // Setiap jawaban sukses (200) atau minta mengulang (409); tidak pernah 500, dan hasil akhirnya konsisten
        Assert.All(results, r => Assert.Contains(r.StatusCode, new[] { HttpStatusCode.OK, HttpStatusCode.Conflict }));
        var final = (await TaskKit.ListAsync(site.Manager, site.Root)).Tasks.Single();
        Assert.Equal(TaskRules.IsHeld(final.Status), final.HoldReason is not null);
        Assert.Equal(TaskRules.IsHeld(final.Status), final.HeldSince is not null);
    }
}
