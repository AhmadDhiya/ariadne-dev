using System.Net;
using Ariadne.Api.Features.Auth;
using Ariadne.Api.Features.Projects;
using Ariadne.Api.Features.Teams;
using Ariadne.Api.Infrastructure.Data;
using Ariadne.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Ariadne.Api.Tests.Platform;

public sealed class SeedTests(PostgresFixture postgres)
{
    private static string RandomPassword() => $"seed-{Guid.NewGuid():N}";

    private static Dictionary<string, string?> SeedSettings(string password) => new() { ["Seed:Password"] = password };

    private static async Task<int> CountAsync(TestApp app, Func<AppDbContext, IQueryable<object>> query)
    {
        await using var scope = app.Factory.Services.CreateAsyncScope();
        return await query(scope.ServiceProvider.GetRequiredService<AppDbContext>()).CountAsync(TestContext.Current.CancellationToken);
    }

    private static async Task<HttpClient> LoginAsAsync(TestApp app, string name, string password)
    {
        var client = app.Anonymous();
        var response = await client.PostApiAsync("/api/auth/login", new { email = $"{name.ToLowerInvariant()}@perusahaan.co.id", password });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return client;
    }

    [Fact]
    public async Task Development_seed_recreates_the_mockup_data()
    {
        var password = RandomPassword();
        await using var app = new TestApp(postgres.NewDatabase(), SeedSettings(password));

        // Memicu start aplikasi (yang menjalankan seed)
        using var ahmad = await LoginAsAsync(app, "Ahmad", password);

        Assert.Equal(9, await CountAsync(app, db => db.Users)); // 8 orang internal + Pak Budi
        Assert.Equal(3, await CountAsync(app, db => db.Teams));
        Assert.Equal(9, await CountAsync(app, db => db.Projects)); // 2 proyek + 7 sub-proyek
        Assert.Equal(15, await CountAsync(app, db => db.ProjectMembers));

        var me = await (await ahmad.GetApiAsync("/api/auth/me")).ReadAsync<MeResponse>();
        Assert.True(me.IsAdmin);
        Assert.True(me.IsSupervisor);
        Assert.Equal(["Tim Sentul", "Tim QA"], me.Teams.Select(t => t.Name));

        var teams = await (await ahmad.GetApiAsync("/api/teams")).ReadAsync<List<TeamSummary>>();
        Assert.Equal([("Tim Sentul", 7), ("Tim Infrastruktur", 4), ("Tim QA", 3)], teams.Select(t => (t.Name, t.MemberCount)));

        var tree = await (await ahmad.GetApiAsync("/api/projects/tree")).ReadAsync<List<ProjectNode>>();
        var temuan = Assert.Single(tree, p => p.Name == "Temuan UAT & API");
        Assert.Equal(2, temuan.Depth);
        Assert.Equal("SLMS", tree.Single(p => p.Id == temuan.ParentId).Name);
        Assert.Equal(["SEN", "MDC"], tree.Where(p => p.Depth == 0).Select(p => p.Code));

        Assert.Equal(23, await CountAsync(app, db => db.Tasks)); // 19 di Sentul (3 sub-task) + 4 di Migrasi Data Center

        var sentul = tree.Single(p => p.Code == "SEN");
        var tasks = await (await ahmad.GetApiAsync($"/api/projects/{sentul.Id}/tasks")).ReadAsync<Ariadne.Api.Features.Tasks.TaskList>();
        var blocked = tasks.Tasks.Single(t => t.Key == "SEN-115");
        Assert.Equal("Blocked", blocked.Status.ToString());
        Assert.Equal("Manto", blocked.WaitingOn);
        Assert.Equal(["Ahmad", "Wiwiet"], blocked.Assignees.Select(a => a.Name));
        Assert.Equal(3, tasks.Tasks.Single(t => t.Key == "SEN-121").SubtaskCount);
        Assert.Equal(2, tasks.Tasks.Single(t => t.Key == "SEN-112").Assignees.Count);
        Assert.Equal(16, tasks.Tasks.Count(t => t.ParentTaskId is null));
    }

    [Fact]
    public async Task The_seeded_client_guest_sees_only_the_project_they_were_invited_to()
    {
        var password = RandomPassword();
        await using var app = new TestApp(postgres.NewDatabase(), SeedSettings(password));
        using var client = app.Anonymous();

        var login = await client.PostApiAsync("/api/auth/login", new { email = "budi@klien.example", password });
        var me = await login.ReadAsync<MeResponse>();
        var tree = await (await client.GetApiAsync("/api/projects/tree")).ReadAsync<List<ProjectNode>>();

        Assert.True(me.IsGuestOnly);
        Assert.Equal(7 + 1, tree.Count); // Sentul dan sub-proyeknya
        Assert.DoesNotContain(tree, p => p.Name == "Migrasi Data Center");
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetApiAsync("/api/teams")).StatusCode);
    }

    [Fact]
    public async Task Seeding_is_skipped_without_a_password_and_never_uses_a_built_in_one()
    {
        await using var app = new TestApp(postgres.NewDatabase());

        using var client = app.Anonymous();
        await client.GetApiAsync("/api/health");

        Assert.Equal(0, await CountAsync(app, db => db.Users));
    }

    [Fact]
    public async Task Seeding_never_runs_in_production_even_when_a_password_is_set()
    {
        await using var app = new TestApp(postgres.NewDatabase(), SeedSettings(RandomPassword()), environment: "Production");

        using var client = app.Anonymous();
        await client.GetApiAsync("/api/health");

        Assert.Equal(0, await CountAsync(app, db => db.Users));
    }

    [Fact]
    public async Task Starting_again_does_not_duplicate_the_seed()
    {
        var connection = postgres.NewDatabase();
        var password = RandomPassword();
        await using (var first = new TestApp(connection, SeedSettings(password)))
        {
            using var client = first.Anonymous();
            await client.GetApiAsync("/api/health");
            Assert.Equal(9, await CountAsync(first, db => db.Users));
        }

        await using var second = new TestApp(connection, SeedSettings(password));
        using var again = second.Anonymous();
        await again.GetApiAsync("/api/health");

        Assert.Equal(9, await CountAsync(second, db => db.Users));
        Assert.Equal(3, await CountAsync(second, db => db.Teams));
    }

    [Fact]
    public async Task The_first_admin_can_be_created_from_configuration_in_any_environment()
    {
        var password = RandomPassword();
        var settings = new Dictionary<string, string?>
        {
            ["Bootstrap:AdminEmail"] = "pertama@uji.example",
            ["Bootstrap:AdminPassword"] = password,
        };
        await using var app = new TestApp(postgres.NewDatabase(), settings, environment: "Production");
        using var client = app.Anonymous();

        var login = await client.PostApiAsync("/api/auth/login", new { email = "pertama@uji.example", password });

        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        Assert.True((await login.ReadAsync<MeResponse>()).IsAdmin);
        Assert.Equal(1, await CountAsync(app, db => db.Users));
    }

    [Fact]
    public async Task Bootstrap_admin_uses_the_configured_display_name()
    {
        var password = RandomPassword();
        var settings = new Dictionary<string, string?>
        {
            ["Bootstrap:AdminEmail"] = "pertama@uji.example",
            ["Bootstrap:AdminPassword"] = password,
            ["Bootstrap:AdminName"] = "  Ahmad  ",
        };
        await using var app = new TestApp(postgres.NewDatabase(), settings, environment: "Production");
        using var client = app.Anonymous();

        var login = await client.PostApiAsync("/api/auth/login", new { email = "pertama@uji.example", password });

        Assert.Equal("Ahmad", (await login.ReadAsync<MeResponse>()).DisplayName);
    }

    [Fact]
    public async Task Bootstrap_settings_are_ignored_once_any_user_exists()
    {
        var connection = postgres.NewDatabase();
        await using (var first = new TestApp(connection, SeedSettings(RandomPassword())))
        {
            using var client = first.Anonymous();
            await client.GetApiAsync("/api/health");
        }

        var settings = new Dictionary<string, string?>
        {
            ["Bootstrap:AdminEmail"] = "penyusup@uji.example",
            ["Bootstrap:AdminPassword"] = RandomPassword(),
        };
        await using var second = new TestApp(connection, settings);
        using var again = second.Anonymous();
        await again.GetApiAsync("/api/health");

        Assert.Equal(9, await CountAsync(second, db => db.Users));
        Assert.Equal(0, await CountAsync(second, db => db.Users.Where(u => u.Email == "penyusup@uji.example")));
    }
}
