using System.Net;
using System.Net.Http.Json;
using Ariadne.Api.Features.Auth;
using Ariadne.Api.Tests.Infrastructure;

namespace Ariadne.Api.Tests.Features.Auth;

public sealed class LoginTests(WorldFixture fx) : IClassFixture<WorldFixture>
{
    private TestApp App => fx.App;

    private const string GenericLoginFailure = "Email atau password salah.";

    private async Task<HttpResponseMessage> TryLoginAsync(HttpClient client, string email, string password) =>
        await client.PostApiAsync("/api/auth/login", new { email, password, rememberMe = false });

    [Fact]
    public async Task Login_succeeds_and_sets_a_cookie_that_javascript_cannot_read()
    {
        var user = await App.CreateUserAsync("Dewi");
        using var client = App.Anonymous();

        var response = await TryLoginAsync(client, user.Email, App.Password);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var me = await response.ReadAsync<MeResponse>();
        Assert.Equal(user.Email, me.Email);
        Assert.Equal("Dewi", me.DisplayName);

        var cookie = Assert.Single(response.Headers.GetValues("Set-Cookie"), c => c.StartsWith("ariadne.auth=", StringComparison.Ordinal));
        Assert.Contains("httponly", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=strict", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(HttpStatusCode.OK, (await client.GetApiAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task Me_describes_the_role_of_each_kind_of_user()
    {
        var w = fx.World;

        var admin = await (await (await App.ClientAsync(w.Admin)).GetApiAsync("/api/auth/me")).ReadAsync<MeResponse>();
        var supervisor = await (await (await App.ClientAsync(w.Supervisor)).GetApiAsync("/api/auth/me")).ReadAsync<MeResponse>();
        var guest = await (await (await App.ClientAsync(w.Guest)).GetApiAsync("/api/auth/me")).ReadAsync<MeResponse>();
        var outsider = await (await (await App.ClientAsync(w.Outsider)).GetApiAsync("/api/auth/me")).ReadAsync<MeResponse>();

        Assert.True(admin.IsAdmin);
        Assert.False(admin.IsGuestOnly);
        Assert.True(supervisor.IsSupervisor);
        Assert.False(supervisor.IsAdmin);
        Assert.Equal("Tim A", Assert.Single(supervisor.Teams).Name);
        Assert.True(guest.IsGuestOnly);
        Assert.False(guest.IsSupervisor);
        Assert.False(outsider.IsGuestOnly); // orang internal baru tanpa proyek bukan tamu
        Assert.Empty(outsider.Teams);
    }

    [Fact]
    public async Task Every_login_failure_looks_the_same()
    {
        var active = await App.CreateUserAsync("Aktif");
        var inactive = await App.CreateUserAsync("Nonaktif", isActive: false);
        using var client = App.Anonymous();

        var wrongPassword = await TryLoginAsync(client, active.Email, "password-yang-salah-sekali");
        var unknownEmail = await TryLoginAsync(client, "tidak.ada@uji.example", App.Password);
        var deactivated = await TryLoginAsync(client, inactive.Email, App.Password);
        var empty = await TryLoginAsync(client, "", "");

        foreach (var response in new[] { wrongPassword, unknownEmail, deactivated, empty })
        {
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
            var problem = await response.ReadAsync<ProblemBody>();
            Assert.Equal(GenericLoginFailure, problem.Title);
            Assert.DoesNotContain("Set-Cookie", response.Headers.Select(h => h.Key));
        }
    }

    [Fact]
    public async Task Account_locks_after_five_wrong_passwords_even_for_the_right_one()
    {
        var user = await App.CreateUserAsync("Terkunci");
        using var client = App.Anonymous();

        for (var i = 0; i < 5; i++)
        {
            Assert.Equal(HttpStatusCode.Unauthorized, (await TryLoginAsync(client, user.Email, "tebakan-keliru-ke-" + i)).StatusCode);
        }

        var rightPassword = await TryLoginAsync(client, user.Email, App.Password);

        Assert.Equal(HttpStatusCode.Unauthorized, rightPassword.StatusCode);
        Assert.Equal(GenericLoginFailure, (await rightPassword.ReadAsync<ProblemBody>()).Title); // tidak membocorkan bahwa akunnya terkunci
    }

    [Fact]
    public async Task Logout_ends_the_session()
    {
        var user = await App.CreateUserAsync("Keluar");
        using var client = await App.LoginAsync(user);
        Assert.Equal(HttpStatusCode.OK, (await client.GetApiAsync("/api/auth/me")).StatusCode);

        Assert.Equal(HttpStatusCode.NoContent, (await client.PostApiAsync("/api/auth/logout")).StatusCode);

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetApiAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task Protected_endpoints_answer_401_not_a_redirect_without_login()
    {
        using var client = App.Anonymous();

        var response = await client.GetApiAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Null(response.Headers.Location);
    }

    [Fact]
    public async Task Requests_that_change_data_are_rejected_without_the_anti_csrf_header()
    {
        var user = await App.CreateUserAsync("Csrf");
        using var withoutHeader = App.Factory.CreateClient();

        var login = await withoutHeader.PostAsJsonAsync(
            new Uri("/api/auth/login", UriKind.Relative),
            new { email = user.Email, password = App.Password },
            TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.Forbidden, login.StatusCode);

        // Sudah login (cookie benar) tetapi tanpa header: tetap ditolak
        using var loggedIn = await App.LoginAsync(user);
        loggedIn.DefaultRequestHeaders.Remove("X-Requested-With");
        Assert.Equal(HttpStatusCode.Forbidden, (await loggedIn.PostApiAsync("/api/auth/logout")).StatusCode);

        // Membaca data tidak butuh header
        Assert.Equal(HttpStatusCode.OK, (await loggedIn.GetApiAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task A_session_stops_working_when_an_admin_deactivates_the_account()
    {
        var victim = await App.CreateUserAsync("Dinonaktifkan");
        using var victimClient = await App.LoginAsync(victim);
        Assert.Equal(HttpStatusCode.OK, (await victimClient.GetApiAsync("/api/auth/me")).StatusCode);

        var admin = await App.ClientAsync(fx.World.Admin);
        Assert.Equal(HttpStatusCode.NoContent, (await admin.PatchApiAsync($"/api/users/{victim.Id}", new { isActive = false })).StatusCode);

        Assert.Equal(HttpStatusCode.Unauthorized, (await victimClient.GetApiAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await TryLoginAsync(App.Anonymous(), victim.Email, App.Password)).StatusCode);
    }

    [Fact]
    public async Task Profile_can_be_updated_but_only_with_known_themes()
    {
        var user = await App.CreateUserAsync("Profil");
        using var client = await App.LoginAsync(user);

        var ok = await client.PatchApiAsync("/api/me", new { displayName = "  Nama Baru  ", theme = "dark" });
        var me = await ok.ReadAsync<MeResponse>();
        var bad = await client.PatchApiAsync("/api/me", new { theme = "neon" });
        var empty = await client.PatchApiAsync("/api/me", new { displayName = "   " });
        var back = await client.PatchApiAsync("/api/me", new { theme = "system" });

        Assert.Equal("Nama Baru", me.DisplayName);
        Assert.Equal("dark", me.Theme);
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, empty.StatusCode);
        Assert.Null((await back.ReadAsync<MeResponse>()).Theme);
    }

    [Fact]
    public async Task Changing_the_password_signs_other_devices_out_but_not_this_one()
    {
        var user = await App.CreateUserAsync("Ganti Password");
        using var phone = await App.LoginAsync(user);
        using var laptop = await App.LoginAsync(user);
        var newPassword = $"baru-{Guid.NewGuid():N}";

        var wrongCurrent = await laptop.PostApiAsync("/api/me/change-password", new { currentPassword = "bukan-yang-ini", newPassword });
        var tooShort = await laptop.PostApiAsync("/api/me/change-password", new { currentPassword = App.Password, newPassword = "pendek" });
        var changed = await laptop.PostApiAsync("/api/me/change-password", new { currentPassword = App.Password, newPassword });

        Assert.Equal(HttpStatusCode.BadRequest, wrongCurrent.StatusCode);
        Assert.Contains("currentPassword", (await wrongCurrent.ReadAsync<ProblemBody>()).Errors!.Keys);
        Assert.Equal(HttpStatusCode.BadRequest, tooShort.StatusCode);
        Assert.Contains("newPassword", (await tooShort.ReadAsync<ProblemBody>()).Errors!.Keys);
        Assert.Equal(HttpStatusCode.NoContent, changed.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await laptop.GetApiAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await phone.GetApiAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await TryLoginAsync(App.Anonymous(), user.Email, App.Password)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await TryLoginAsync(App.Anonymous(), user.Email, newPassword)).StatusCode);
    }
}
