using System.Net;
using System.Text.RegularExpressions;
using System.Web;
using Ariadne.Api.Features.Auth;
using Ariadne.Api.Tests.Infrastructure;

namespace Ariadne.Api.Tests.Features.Auth;

public sealed partial class PasswordResetTests(WorldFixture fx) : IClassFixture<WorldFixture>
{
    private TestApp App => fx.App;

    [GeneratedRegex(@"/reset-password#(?<fragment>\S+)")]
    private static partial Regex LinkPattern();

    /// <summary>Mengambil email dan token dari tautan di email, persis seperti yang dilakukan halaman reset.</summary>
    private static (string Email, string Token) ParseLink(string emailText)
    {
        var fragment = LinkPattern().Match(emailText).Groups["fragment"].Value;
        Assert.NotEmpty(fragment);
        var query = HttpUtility.ParseQueryString(fragment);
        return (query["email"]!, query["token"]!);
    }

    private async Task<(string Email, string Token)> RequestResetAsync(TestUser user)
    {
        using var client = App.Anonymous();
        var before = App.Outbox.Sent.Count;
        Assert.Equal(HttpStatusCode.Accepted, (await client.PostApiAsync("/api/auth/forgot-password", new { email = user.Email })).StatusCode);
        Assert.Equal(before + 1, App.Outbox.Sent.Count);
        return ParseLink(App.Outbox.LastTo(user.Email)!.TextBody);
    }

    [Fact]
    public async Task Forgot_password_answers_identically_whether_or_not_the_account_exists()
    {
        var known = await App.CreateUserAsync("Lupa");
        using var client = App.Anonymous();

        var forKnown = await client.PostApiAsync("/api/auth/forgot-password", new { email = known.Email });
        var forUnknown = await client.PostApiAsync("/api/auth/forgot-password", new { email = "tidak.ada@uji.example" });
        var forBlank = await client.PostApiAsync("/api/auth/forgot-password", new { email = "" });

        Assert.Equal(HttpStatusCode.Accepted, forKnown.StatusCode);
        Assert.Equal(HttpStatusCode.Accepted, forUnknown.StatusCode);
        Assert.Equal(HttpStatusCode.Accepted, forBlank.StatusCode);
        var message = (await forKnown.ReadAsync<MessageResponse>()).Message;
        Assert.Equal(message, (await forUnknown.ReadAsync<MessageResponse>()).Message);
        Assert.Equal(message, (await forBlank.ReadAsync<MessageResponse>()).Message);

        Assert.NotNull(App.Outbox.LastTo(known.Email)); // hanya akun yang ada yang menerima email
        Assert.Null(App.Outbox.LastTo("tidak.ada@uji.example"));
    }

    [Fact]
    public async Task Deactivated_accounts_get_no_reset_email()
    {
        var inactive = await App.CreateUserAsync("Mati", isActive: false);
        using var client = App.Anonymous();

        Assert.Equal(HttpStatusCode.Accepted, (await client.PostApiAsync("/api/auth/forgot-password", new { email = inactive.Email })).StatusCode);

        Assert.Null(App.Outbox.LastTo(inactive.Email));
    }

    [Fact]
    public async Task The_link_keeps_the_token_out_of_the_query_string_and_the_email_is_html_safe()
    {
        var user = await App.CreateUserAsync("<b>Nakal</b> & Co");
        using var client = App.Anonymous();

        await client.PostApiAsync("/api/auth/forgot-password", new { email = user.Email });

        var email = App.Outbox.LastTo(user.Email)!;
        Assert.Matches(@"/reset-password#email=.+&token=.+", email.TextBody);
        Assert.DoesNotContain("?token=", email.TextBody, StringComparison.Ordinal);
        Assert.DoesNotContain("<b>Nakal</b>", email.HtmlBody, StringComparison.Ordinal);
        Assert.Contains("&lt;b&gt;Nakal&lt;/b&gt;", email.HtmlBody, StringComparison.Ordinal);
    }

    [Fact]
    public async Task A_reset_link_sets_a_new_password_once()
    {
        var user = await App.CreateUserAsync("Reset");
        var (email, token) = await RequestResetAsync(user);
        var newPassword = $"baru-{Guid.NewGuid():N}";
        using var client = App.Anonymous();

        var reset = await client.PostApiAsync("/api/auth/reset-password", new { email, token, newPassword });
        var again = await client.PostApiAsync("/api/auth/reset-password", new { email, token, newPassword = $"lain-{Guid.NewGuid():N}" });

        Assert.Equal(HttpStatusCode.NoContent, reset.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PostApiAsync("/api/auth/login", new { email, password = newPassword })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await App.Anonymous().PostApiAsync("/api/auth/login", new { email, password = App.Password })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, again.StatusCode); // sekali pakai
    }

    [Fact]
    public async Task Bad_or_foreign_tokens_give_the_same_generic_answer()
    {
        var victim = await App.CreateUserAsync("Korban");
        var other = await App.CreateUserAsync("Lain");
        var (_, otherToken) = await RequestResetAsync(other);
        using var client = App.Anonymous();
        var password = $"baru-{Guid.NewGuid():N}";

        var garbage = await client.PostApiAsync("/api/auth/reset-password", new { email = victim.Email, token = "token-asal", newPassword = password });
        var foreign = await client.PostApiAsync("/api/auth/reset-password", new { email = victim.Email, token = otherToken, newPassword = password });
        var unknown = await client.PostApiAsync("/api/auth/reset-password", new { email = "tidak.ada@uji.example", token = "x", newPassword = password });
        var missing = await client.PostApiAsync("/api/auth/reset-password", new { email = victim.Email, token = "", newPassword = password });

        var titles = new List<string?>();
        foreach (var response in new[] { garbage, foreign, unknown, missing })
        {
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            titles.Add((await response.ReadAsync<ProblemBody>()).Title);
        }

        Assert.Single(titles.Distinct());
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostApiAsync("/api/auth/login", new { email = victim.Email, password })).StatusCode);
    }

    [Fact]
    public async Task A_weak_new_password_is_rejected_and_the_link_stays_usable()
    {
        var user = await App.CreateUserAsync("Lemah");
        var (email, token) = await RequestResetAsync(user);
        using var client = App.Anonymous();

        var weak = await client.PostApiAsync("/api/auth/reset-password", new { email, token, newPassword = "pendek" });
        var strong = await client.PostApiAsync("/api/auth/reset-password", new { email, token, newPassword = $"kuat-{Guid.NewGuid():N}" });

        Assert.Equal(HttpStatusCode.BadRequest, weak.StatusCode);
        Assert.Contains("newPassword", (await weak.ReadAsync<ProblemBody>()).Errors!.Keys);
        Assert.Equal(HttpStatusCode.NoContent, strong.StatusCode);
    }

    [Fact]
    public async Task Resetting_the_password_unlocks_a_locked_account_and_signs_out_old_sessions()
    {
        var user = await App.CreateUserAsync("Kunci Reset");
        using var oldSession = await App.LoginAsync(user);
        using var client = App.Anonymous();
        for (var i = 0; i < 5; i++)
        {
            await client.PostApiAsync("/api/auth/login", new { email = user.Email, password = "salah-" + i });
        }

        var (email, token) = await RequestResetAsync(user);
        var newPassword = $"baru-{Guid.NewGuid():N}";
        await client.PostApiAsync("/api/auth/reset-password", new { email, token, newPassword });

        Assert.Equal(HttpStatusCode.OK, (await client.PostApiAsync("/api/auth/login", new { email, password = newPassword })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await oldSession.GetApiAsync("/api/auth/me")).StatusCode);
    }
}
