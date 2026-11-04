using System.Net;
using System.Text.RegularExpressions;
using Ariadne.Api.Domain;
using Ariadne.Api.Features.Auth;
using Ariadne.Api.Features.Invitations;
using Ariadne.Api.Features.Projects;
using Ariadne.Api.Infrastructure.Data;
using Ariadne.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Ariadne.Api.Tests.Features.Invitations;

public sealed partial class InvitationTests(WorldFixture fx) : IClassFixture<WorldFixture>
{
    private TestApp App => fx.App;

    private World W => fx.World;

    [GeneratedRegex(@"/undangan#token=(?<token>\S+)")]
    private static partial Regex LinkPattern();

    private static string NewEmail(string name) => $"{name}.{Guid.NewGuid():N}@klien.example";

    private static string StrongPassword() => $"kuat-{Guid.NewGuid():N}";

    private string TokenFor(string email)
    {
        var message = App.Outbox.LastTo(email) ?? throw new InvalidOperationException($"Tidak ada email untuk {email}");
        var token = LinkPattern().Match(message.TextBody).Groups["token"].Value;
        Assert.NotEmpty(token);
        return Uri.UnescapeDataString(token);
    }

    private async Task<List<InviteResult>> InviteAsync(Guid projectId, string role, params string[] emails)
    {
        var manager = await App.ClientAsync(W.Manager);
        var response = await manager.PostApiAsync($"/api/projects/{projectId}/invitations", new { emails, role, message = "Halo, ini akses proyek." });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.ReadAsync<List<InviteResult>>();
    }

    private async Task<List<InvitationItem>> PendingAsync()
    {
        var manager = await App.ClientAsync(W.Manager);
        return await (await manager.GetApiAsync($"/api/projects/{W.ProjectAlpha}/invitations")).ReadAsync<List<InvitationItem>>();
    }

    [Fact]
    public async Task Inviting_a_new_email_sends_a_link_and_lists_the_invitation_as_waiting()
    {
        var email = NewEmail("baru");

        // Lewat sub-proyek pun undangannya untuk proyek root
        var results = await InviteAsync(W.ProjectAlphaChild, "Tamu", email);

        Assert.Equal([new InviteResult(email, InviteOutcome.Diundang)], results);
        var message = App.Outbox.LastTo(email)!;
        Assert.Contains("Alpha", message.Subject, StringComparison.Ordinal);
        Assert.Contains("Halo, ini akses proyek.", message.TextBody, StringComparison.Ordinal);
        Assert.Matches(@"/undangan#token=", message.TextBody);
        Assert.DoesNotContain("?token=", message.TextBody, StringComparison.Ordinal);

        var pending = Assert.Single(await PendingAsync(), i => i.Email == email);
        Assert.Equal(ProjectRole.Tamu, pending.Role);
        Assert.Equal("Pengelola", pending.InvitedBy);
        Assert.False(pending.Expired);
    }

    [Fact]
    public async Task The_invitation_email_never_carries_html_from_names_or_the_message()
    {
        var email = NewEmail("html");
        var manager = await App.ClientAsync(W.Manager);

        await manager.PostApiAsync($"/api/projects/{W.ProjectAlpha}/invitations", new { emails = new[] { email }, role = "Tamu", message = "<script>alert(1)</script>" });

        var html = App.Outbox.LastTo(email)!.HtmlBody;
        Assert.DoesNotContain("<script>", html, StringComparison.Ordinal);
        Assert.Contains("&lt;script&gt;", html, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Accepting_creates_the_account_signs_in_and_shows_only_the_invited_project_as_a_guest()
    {
        var email = NewEmail("terima");
        await InviteAsync(W.ProjectAlpha, "Tamu", email);
        var token = TokenFor(email);
        using var client = App.Anonymous();

        var preview = await (await client.PostApiAsync("/api/invitations/preview", new { token })).ReadAsync<InvitationPreview>();
        Assert.Equal(email, preview.Email);
        Assert.Equal("Alpha", preview.ProjectName);
        Assert.Equal(ProjectRole.Tamu, preview.Role);
        Assert.Equal("Pengelola", preview.InvitedBy);
        Assert.False(preview.HasAccount);

        var password = StrongPassword();
        var accept = await client.PostApiAsync("/api/invitations/accept", new { token, displayName = "Sari Klien", password });
        Assert.Equal(HttpStatusCode.OK, accept.StatusCode);
        var accepted = await accept.ReadAsync<AcceptInvitationResponse>();
        Assert.True(accepted.SignedIn);
        Assert.Equal(W.ProjectAlpha, accepted.ProjectId);

        // Sudah masuk lewat cookie dari jawaban itu
        var me = await (await client.GetApiAsync("/api/auth/me")).ReadAsync<MeResponse>();
        Assert.Equal("Sari Klien", me.DisplayName);
        Assert.True(me.IsGuestOnly);
        var tree = await (await client.GetApiAsync("/api/projects/tree")).ReadAsync<List<ProjectNode>>();
        Assert.All(tree, p => Assert.Equal(W.ProjectAlpha, p.RootId));
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetApiAsync($"/api/projects/{W.ProjectBeta}")).StatusCode);

        // Login biasa setelahnya; undangannya tidak lagi menunggu dan tautannya tidak bisa dipakai lagi
        using var again = App.Anonymous();
        Assert.Equal(HttpStatusCode.OK, (await again.PostApiAsync("/api/auth/login", new { email, password })).StatusCode);
        Assert.DoesNotContain(await PendingAsync(), i => i.Email == email);
        Assert.Equal(HttpStatusCode.BadRequest, (await App.Anonymous().PostApiAsync("/api/invitations/accept", new { token, displayName = "Lagi", password = StrongPassword() })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await App.Anonymous().PostApiAsync("/api/invitations/preview", new { token })).StatusCode);

        var members = await (await (await App.ClientAsync(W.Manager)).GetApiAsync($"/api/projects/{W.ProjectAlpha}/members")).ReadAsync<List<ProjectMemberItem>>();
        var member = Assert.Single(members, m => m.Email == email);
        Assert.Equal(ProjectRole.Tamu, member.Role);
    }

    [Fact]
    public async Task People_who_already_have_an_account_are_added_directly_and_told_by_email()
    {
        var existing = await App.CreateUserAsync("Sudah Punya Akun");
        var inactive = await App.CreateUserAsync("Akun Mati", isActive: false);

        var results = await InviteAsync(W.ProjectAlpha, "Anggota", existing.Email, W.Member.Email, inactive.Email);

        Assert.Equal(
            [InviteOutcome.Ditambahkan, InviteOutcome.SudahAnggota, InviteOutcome.AkunNonaktif],
            results.Select(r => r.Outcome));
        Assert.Contains("ditambahkan", App.Outbox.LastTo(existing.Email)!.Subject, StringComparison.Ordinal);
        Assert.Null(App.Outbox.LastTo(inactive.Email));
        var members = await (await (await App.ClientAsync(W.Manager)).GetApiAsync($"/api/projects/{W.ProjectAlpha}/members")).ReadAsync<List<ProjectMemberItem>>();
        Assert.Equal(ProjectRole.Anggota, Assert.Single(members, m => m.UserId == existing.Id).Role);
        Assert.DoesNotContain(members, m => m.UserId == inactive.Id);
        Assert.DoesNotContain(await PendingAsync(), i => i.Email == existing.Email);
    }

    [Fact]
    public async Task Inviting_again_replaces_the_old_link()
    {
        var email = NewEmail("ulang");
        await InviteAsync(W.ProjectAlpha, "Tamu", email);
        var oldToken = TokenFor(email);

        await InviteAsync(W.ProjectAlpha, "Anggota", email.ToUpperInvariant());
        var newToken = TokenFor(email);

        Assert.NotEqual(oldToken, newToken);
        var pending = Assert.Single(await PendingAsync(), i => string.Equals(i.Email, email, StringComparison.OrdinalIgnoreCase));
        Assert.Equal(ProjectRole.Anggota, pending.Role);
        using var client = App.Anonymous();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostApiAsync("/api/invitations/preview", new { token = oldToken })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PostApiAsync("/api/invitations/preview", new { token = newToken })).StatusCode);
    }

    [Fact]
    public async Task Bad_input_is_rejected_and_nothing_is_sent()
    {
        var manager = await App.ClientAsync(W.Manager);
        var good = NewEmail("baik");
        var before = App.Outbox.Sent.Count;

        var invalid = await manager.PostApiAsync($"/api/projects/{W.ProjectAlpha}/invitations", new { emails = new[] { good, "bukan-email" }, role = "Tamu" });
        var tooMany = await manager.PostApiAsync($"/api/projects/{W.ProjectAlpha}/invitations", new { emails = Enumerable.Range(0, 21).Select(i => $"orang{i}@klien.example").ToArray(), role = "Tamu" });
        var badRole = await manager.PostApiAsync($"/api/projects/{W.ProjectAlpha}/invitations", new { emails = new[] { good }, role = "Admin" });
        var longMessage = await manager.PostApiAsync($"/api/projects/{W.ProjectAlpha}/invitations", new { emails = new[] { good }, role = "Tamu", message = new string('x', 501) });

        foreach (var response in new[] { invalid, tooMany, badRole, longMessage })
        {
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        Assert.Contains("bukan-email", (await invalid.ReadAsync<ProblemBody>()).Errors!["emails"][0], StringComparison.Ordinal);
        Assert.Equal(before, App.Outbox.Sent.Count);
        Assert.DoesNotContain(await PendingAsync(), i => i.Email == good);
    }

    [Fact]
    public async Task Only_managers_and_admins_cancel_or_change_an_invitation()
    {
        var email = NewEmail("batal");
        await InviteAsync(W.ProjectAlpha, "Tamu", email);
        var token = TokenFor(email);
        var id = (await PendingAsync()).Single(i => i.Email == email).Id;

        foreach (var user in new[] { W.Member, W.Guest })
        {
            var client = await App.ClientAsync(user);
            Assert.Equal(HttpStatusCode.Forbidden, (await client.DeleteApiAsync($"/api/invitations/{id}")).StatusCode);
        }

        foreach (var user in new[] { W.Outsider, W.OtherManager, W.Supervisor })
        {
            var client = await App.ClientAsync(user);
            Assert.Equal(HttpStatusCode.NotFound, (await client.DeleteApiAsync($"/api/invitations/{id}")).StatusCode);
        }

        var admin = await App.ClientAsync(W.Admin);
        Assert.Equal(HttpStatusCode.NoContent, (await admin.PatchApiAsync($"/api/invitations/{id}", new { role = "Anggota" })).StatusCode);
        Assert.Equal(ProjectRole.Anggota, (await PendingAsync()).Single(i => i.Id == id).Role);

        var manager = await App.ClientAsync(W.Manager);
        Assert.Equal(HttpStatusCode.NoContent, (await manager.DeleteApiAsync($"/api/invitations/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await manager.DeleteApiAsync($"/api/invitations/{id}")).StatusCode);
        Assert.DoesNotContain(await PendingAsync(), i => i.Id == id);
        Assert.Equal(HttpStatusCode.BadRequest, (await App.Anonymous().PostApiAsync("/api/invitations/preview", new { token })).StatusCode);
    }

    [Fact]
    public async Task An_expired_link_cannot_be_used_and_is_flagged_in_the_list()
    {
        var email = NewEmail("basi");
        await InviteAsync(W.ProjectAlpha, "Tamu", email);
        var token = TokenFor(email);
        await using (var scope = App.Factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Invitations.Where(i => i.Email == email)
                .ExecuteUpdateAsync(s => s.SetProperty(i => i.ExpiresAt, DateTimeOffset.UtcNow.AddMinutes(-1)), TestContext.Current.CancellationToken);
        }

        using var client = App.Anonymous();
        var preview = await client.PostApiAsync("/api/invitations/preview", new { token });
        var accept = await client.PostApiAsync("/api/invitations/accept", new { token, displayName = "Telat", password = StrongPassword() });
        var garbage = await client.PostApiAsync("/api/invitations/preview", new { token = "token-asal" });

        Assert.Equal(HttpStatusCode.BadRequest, preview.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, accept.StatusCode);
        // Kedaluwarsa dan palsu memberi pesan yang sama
        Assert.Equal((await garbage.ReadAsync<ProblemBody>()).Title, (await preview.ReadAsync<ProblemBody>()).Title);
        Assert.True((await PendingAsync()).Single(i => i.Email == email).Expired);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetApiAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task A_weak_password_or_missing_name_is_rejected_and_the_link_stays_usable()
    {
        var email = NewEmail("lemah");
        await InviteAsync(W.ProjectAlpha, "Tamu", email);
        var token = TokenFor(email);
        using var client = App.Anonymous();

        var weak = await client.PostApiAsync("/api/invitations/accept", new { token, displayName = "Lemah", password = "pendek" });
        var noName = await client.PostApiAsync("/api/invitations/accept", new { token, displayName = "  ", password = StrongPassword() });
        var ok = await client.PostApiAsync("/api/invitations/accept", new { token, displayName = "Kuat", password = StrongPassword() });

        Assert.Equal(HttpStatusCode.BadRequest, weak.StatusCode);
        Assert.Contains("password", (await weak.ReadAsync<ProblemBody>()).Errors!.Keys);
        Assert.Equal(HttpStatusCode.BadRequest, noName.StatusCode);
        Assert.Contains("displayName", (await noName.ReadAsync<ProblemBody>()).Errors!.Keys);
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
    }

    [Fact]
    public async Task If_the_account_appeared_after_the_invitation_its_password_is_untouched_and_it_just_joins()
    {
        var email = NewEmail("muncul");
        await InviteAsync(W.ProjectAlpha, "Tamu", email);
        var token = TokenFor(email);
        var admin = await App.ClientAsync(W.Admin);
        var created = await (await admin.PostApiAsync("/api/users", new { email, displayName = "Dibuat Admin" })).ReadAsync<Ariadne.Api.Features.Users.UserSummary>();
        using var client = App.Anonymous();

        var preview = await (await client.PostApiAsync("/api/invitations/preview", new { token })).ReadAsync<InvitationPreview>();
        var accept = await (await client.PostApiAsync("/api/invitations/accept", new { token, displayName = "Penyusup", password = StrongPassword() })).ReadAsync<AcceptInvitationResponse>();

        Assert.True(preview.HasAccount);
        Assert.False(accept.SignedIn);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetApiAsync("/api/auth/me")).StatusCode);
        var members = await (await admin.GetApiAsync($"/api/projects/{W.ProjectAlpha}/members")).ReadAsync<List<ProjectMemberItem>>();
        var member = Assert.Single(members, m => m.UserId == created.Id);
        Assert.Equal("Dibuat Admin", member.DisplayName);
    }

    [Fact]
    public async Task Archived_projects_take_no_invitations_and_their_links_stop_working()
    {
        var admin = await App.ClientAsync(W.Admin);
        var root = await (await admin.PostApiAsync("/api/projects", new { name = $"Arsip {Guid.NewGuid():N}", code = "Z" + Guid.NewGuid().ToString("N")[..5].ToUpperInvariant() })).ReadAsync<ProjectNode>();
        var email = NewEmail("arsip");
        Assert.Equal(HttpStatusCode.OK, (await admin.PostApiAsync($"/api/projects/{root.Id}/invitations", new { emails = new[] { email }, role = "Tamu" })).StatusCode);
        var token = TokenFor(email);

        await admin.PostApiAsync($"/api/projects/{root.Id}/archive");

        Assert.Equal(HttpStatusCode.BadRequest, (await App.Anonymous().PostApiAsync("/api/invitations/preview", new { token })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostApiAsync($"/api/projects/{root.Id}/invitations", new { emails = new[] { NewEmail("lagi") }, role = "Tamu" })).StatusCode);
    }

    [Fact]
    public async Task Two_simultaneous_accepts_with_one_link_create_one_account()
    {
        var email = NewEmail("serentak");
        await InviteAsync(W.ProjectAlpha, "Tamu", email);
        var token = TokenFor(email);

        var responses = await Task.WhenAll(Enumerable.Range(0, 4).Select(i =>
            App.Anonymous().PostApiAsync("/api/invitations/accept", new { token, displayName = $"Serentak {i}", password = StrongPassword() })));

        Assert.Single(responses, r => r.StatusCode == HttpStatusCode.OK);
        Assert.All(responses.Where(r => r.StatusCode != HttpStatusCode.OK), r => Assert.True((int)r.StatusCode is 400 or 409, $"dapat {(int)r.StatusCode}"));
        await using var scope = App.Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(1, await db.Users.CountAsync(u => u.Email == email, TestContext.Current.CancellationToken));
    }
}
