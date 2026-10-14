using System.Net;
using Ariadne.Api.Features.Users;
using Ariadne.Api.Tests.Infrastructure;

namespace Ariadne.Api.Tests.Features.Users;

public sealed class UserTests(WorldFixture fx) : IClassFixture<WorldFixture>
{
    private TestApp App => fx.App;

    private World W => fx.World;

    [Fact]
    public async Task Only_admins_can_list_users()
    {
        var admin = await App.ClientAsync(W.Admin);
        var list = await (await admin.GetApiAsync("/api/users")).ReadAsync<List<UserSummary>>();

        Assert.Contains(list, u => u.Email == W.Guest.Email && u.IsGuest);
        Assert.Contains(list, u => u.Email == W.Admin.Email && u.IsAdmin && !u.IsGuest);
        Assert.Contains(list, u => u.Email == W.Supervisor.Email && u.Teams.Contains("Tim A"));

        foreach (var user in new[] { W.Supervisor, W.Member, W.Manager, W.Guest, W.Outsider })
        {
            var client = await App.ClientAsync(user);
            Assert.Equal(HttpStatusCode.Forbidden, (await client.GetApiAsync("/api/users")).StatusCode);
        }

        Assert.Equal(HttpStatusCode.Unauthorized, (await App.Anonymous().GetApiAsync("/api/users")).StatusCode);
    }

    [Fact]
    public async Task List_never_exposes_password_hashes_or_security_fields()
    {
        var admin = await App.ClientAsync(W.Admin);

        var body = await (await admin.GetApiAsync("/api/users")).TextAsync();

        foreach (var forbidden in new[] { "passwordHash", "securityStamp", "concurrencyStamp", "lockout", "normalized" })
        {
            Assert.DoesNotContain(forbidden, body, StringComparison.OrdinalIgnoreCase);
        }
    }

    [Fact]
    public async Task Creating_a_user_emails_a_link_to_choose_a_password_and_the_admin_never_sees_one()
    {
        var admin = await App.ClientAsync(W.Admin);
        var email = $"baru.{Guid.NewGuid():N}@uji.example";

        var response = await admin.PostApiAsync("/api/users", new { email, displayName = "Orang Baru", isAdmin = false });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.ReadAsync<UserSummary>();
        Assert.Equal(email, created.Email);
        Assert.DoesNotContain("password", (await response.TextAsync()), StringComparison.OrdinalIgnoreCase);
        var welcome = App.Outbox.LastTo(email);
        Assert.NotNull(welcome);
        Assert.Contains("/reset-password#email=", welcome.TextBody, StringComparison.Ordinal);

        // Belum bisa masuk sebelum memilih password
        Assert.Equal(HttpStatusCode.Unauthorized, (await App.Anonymous().PostApiAsync("/api/auth/login", new { email, password = App.Password })).StatusCode);
    }

    [Theory]
    [InlineData("", "Nama", "email")]
    [InlineData("bukan-email", "Nama", "email")]
    [InlineData("a@b", "Nama", "email")]
    [InlineData("valid@uji.example", "", "displayName")]
    public async Task Creating_a_user_validates_input(string email, string displayName, string field)
    {
        var admin = await App.ClientAsync(W.Admin);

        var response = await admin.PostApiAsync("/api/users", new { email, displayName, isAdmin = false });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains(field, (await response.ReadAsync<ProblemBody>()).Errors!.Keys);
    }

    [Fact]
    public async Task Duplicate_emails_are_rejected_regardless_of_letter_case()
    {
        var admin = await App.ClientAsync(W.Admin);

        var response = await admin.PostApiAsync("/api/users", new { email = W.Member.Email.ToUpperInvariant(), displayName = "Kembar", isAdmin = false });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("email", (await response.ReadAsync<ProblemBody>()).Errors!.Keys);
    }

    [Fact]
    public async Task Non_admins_cannot_create_or_change_users()
    {
        var target = await App.CreateUserAsync("Sasaran");
        foreach (var user in new[] { W.Supervisor, W.Member, W.Manager, W.Guest, W.Outsider })
        {
            var client = await App.ClientAsync(user);
            Assert.Equal(HttpStatusCode.Forbidden, (await client.PostApiAsync("/api/users", new { email = "x@uji.example", displayName = "X" })).StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, (await client.PatchApiAsync($"/api/users/{target.Id}", new { isAdmin = true })).StatusCode);
        }
    }

    [Fact]
    public async Task An_admin_cannot_remove_their_own_admin_rights_or_deactivate_themselves()
    {
        var solo = await App.CreateUserAsync("Admin Kedua", isAdmin: true);
        var client = await App.LoginAsync(solo);

        var demote = await client.PatchApiAsync($"/api/users/{solo.Id}", new { isAdmin = false });
        var deactivate = await client.PatchApiAsync($"/api/users/{solo.Id}", new { isActive = false });

        Assert.Equal(HttpStatusCode.BadRequest, demote.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, deactivate.StatusCode);
    }

    [Fact]
    public async Task Demoting_another_admin_takes_effect_immediately()
    {
        var other = await App.CreateUserAsync("Admin Dicabut", isAdmin: true);
        var otherClient = await App.LoginAsync(other);
        var admin = await App.ClientAsync(W.Admin);
        Assert.Equal(HttpStatusCode.OK, (await otherClient.GetApiAsync("/api/users")).StatusCode);

        Assert.Equal(HttpStatusCode.NoContent, (await admin.PatchApiAsync($"/api/users/{other.Id}", new { isAdmin = false })).StatusCode);

        // Sesi lamanya dicabut sehingga hak admin tidak bisa terus dipakai
        Assert.Equal(HttpStatusCode.Unauthorized, (await otherClient.GetApiAsync("/api/users")).StatusCode);
        var relogin = await App.LoginAsync(other);
        Assert.Equal(HttpStatusCode.Forbidden, (await relogin.GetApiAsync("/api/users")).StatusCode);
    }

    [Fact]
    public async Task Users_can_be_renamed_and_made_admin_by_an_admin()
    {
        var target = await App.CreateUserAsync("Ubah");
        var admin = await App.ClientAsync(W.Admin);

        Assert.Equal(HttpStatusCode.NoContent, (await admin.PatchApiAsync($"/api/users/{target.Id}", new { displayName = "Sudah Diubah", isAdmin = true })).StatusCode);

        var list = await (await admin.GetApiAsync("/api/users")).ReadAsync<List<UserSummary>>();
        var updated = Assert.Single(list, u => u.Id == target.Id);
        Assert.Equal("Sudah Diubah", updated.DisplayName);
        Assert.True(updated.IsAdmin);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.PatchApiAsync($"/api/users/{Guid.NewGuid()}", new { displayName = "Hantu" })).StatusCode);
    }

    // ---------- pencarian orang untuk ditambahkan ke tim atau proyek ----------

    [Fact]
    public async Task Lookup_is_for_admins_supervisors_and_managers_only()
    {
        foreach (var user in new[] { W.Admin, W.Supervisor, W.Manager })
        {
            var client = await App.ClientAsync(user);
            Assert.Equal(HttpStatusCode.OK, (await client.GetApiAsync("/api/users/lookup?q=a")).StatusCode);
        }

        foreach (var user in new[] { W.Member, W.Guest, W.Outsider })
        {
            var client = await App.ClientAsync(user);
            Assert.Equal(HttpStatusCode.Forbidden, (await client.GetApiAsync("/api/users/lookup?q=a")).StatusCode);
        }
    }

    [Fact]
    public async Task Lookup_finds_internal_people_but_never_client_guests()
    {
        var admin = await App.ClientAsync(W.Admin);

        var byName = await (await admin.GetApiAsync("/api/users/lookup?q=Supervisor")).ReadAsync<List<UserLookupItem>>();
        var guestSearch = await (await admin.GetApiAsync("/api/users/lookup?q=Tamu")).ReadAsync<List<UserLookupItem>>();
        var empty = await (await admin.GetApiAsync("/api/users/lookup?q=")).ReadAsync<List<UserLookupItem>>();

        Assert.Contains(byName, u => u.Email == W.Supervisor.Email && u.Hint == "Supervisor · Tim A");
        Assert.DoesNotContain(guestSearch, u => u.Email == W.Guest.Email);
        Assert.Empty(empty);
    }

    [Fact]
    public async Task Lookup_can_hide_people_who_are_already_members()
    {
        var admin = await App.ClientAsync(W.Admin);

        // Nama dicari spesifik: jumlah pengguna di database uji terus bertambah dan hasil dibatasi 8
        var forTeam = await (await admin.GetApiAsync($"/api/users/lookup?q=Supervisor&teamId={W.TeamA}")).ReadAsync<List<UserLookupItem>>();
        var forProject = await (await admin.GetApiAsync($"/api/users/lookup?q=Pengelola&projectId={W.ProjectAlphaChild}")).ReadAsync<List<UserLookupItem>>();

        Assert.DoesNotContain(forTeam, u => u.Id == W.Supervisor.Id); // sudah di Tim A
        Assert.Contains(forTeam, u => u.Id == W.OtherSupervisor.Id);
        Assert.DoesNotContain(forProject, u => u.Id == W.Manager.Id); // anggota proyek root, lewat sub-proyek
        Assert.Contains(forProject, u => u.Id == W.OtherManager.Id);
    }

    [Fact]
    public async Task Lookup_treats_percent_and_underscore_as_plain_characters()
    {
        var admin = await App.ClientAsync(W.Admin);

        var wildcard = await (await admin.GetApiAsync("/api/users/lookup?q=%25")).ReadAsync<List<UserLookupItem>>();
        var underscore = await (await admin.GetApiAsync("/api/users/lookup?q=_")).ReadAsync<List<UserLookupItem>>();

        Assert.Empty(wildcard);
        Assert.Empty(underscore);
    }

    [Fact]
    public async Task Lookup_returns_at_most_eight_results()
    {
        var admin = await App.ClientAsync(W.Admin);
        for (var i = 0; i < 10; i++)
        {
            await App.CreateUserAsync("Banyak");
        }

        var results = await (await admin.GetApiAsync("/api/users/lookup?q=Banyak")).ReadAsync<List<UserLookupItem>>();

        Assert.Equal(8, results.Count);
    }
}
