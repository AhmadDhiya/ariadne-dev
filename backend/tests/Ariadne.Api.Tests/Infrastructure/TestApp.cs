using System.Collections.Concurrent;
using System.Net.Http.Json;
using Ariadne.Api.Domain;
using Ariadne.Api.Infrastructure.Clock;
using Ariadne.Api.Infrastructure.Data;
using Ariadne.Api.Infrastructure.Email;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Ariadne.Api.Tests.Infrastructure;

/// <summary>Email keluar yang ditangkap untuk diperiksa test (mis. tautan reset password).</summary>
public sealed class FakeEmailOutbox : IEmailOutbox
{
    private readonly ConcurrentQueue<EmailMessage> _sent = new();

    public IReadOnlyList<EmailMessage> Sent => [.. _sent];

    public void Enqueue(EmailMessage message) => _sent.Enqueue(message);

    public EmailMessage? LastTo(string email) =>
        _sent.Reverse().FirstOrDefault(m => string.Equals(m.To, email, StringComparison.OrdinalIgnoreCase));
}

public sealed record TestUser(Guid Id, string Email);

/// <summary>Dunia contoh untuk test izin: satu orang untuk setiap peran, dua tim, dua proyek.</summary>
public sealed record World(
    TestUser Admin,
    TestUser Supervisor,
    TestUser OtherSupervisor,
    TestUser Member,
    TestUser Manager,
    TestUser Guest,
    TestUser Outsider,
    TestUser OtherManager,
    Guid TeamA,
    Guid TeamB,
    Guid ProjectAlpha,
    Guid ProjectAlphaChild,
    Guid ProjectAlphaGrandchild,
    Guid ProjectBeta);

/// <summary>
/// Satu aplikasi uji (database sendiri) untuk satu kelas test. Setiap peran login sekali dan kliennya
/// dipakai ulang. Test yang mengubah akun (password, penguncian, penonaktifan) harus membuat pengguna
/// sendiri lewat CreateUserAsync supaya tidak mengganggu test lain.
/// </summary>
public sealed class TestApp : IAsyncDisposable
{
    private readonly ConcurrentDictionary<Guid, HttpClient> _clients = new();

    /// <summary>Password acak per jalannya test; tidak ada kata sandi yang ditulis di kode.</summary>
    public string Password { get; } = $"uji-{Guid.NewGuid():N}";

    public ApiFactory Factory { get; }

    public FakeEmailOutbox Outbox { get; } = new();

    public World? World { get; private set; }

    public TestApp(string connectionString, IReadOnlyDictionary<string, string?>? settings = null, string environment = "Development")
    {
        var outbox = Outbox;
        Factory = new ApiFactory(
            connectionString,
            environment,
            settings,
            services =>
            {
                services.RemoveAll<IEmailOutbox>();
                services.AddSingleton<IEmailOutbox>(outbox);
            });
    }

    public static async Task<TestApp> CreateWithWorldAsync(PostgresFixture postgres, IReadOnlyDictionary<string, string?>? settings = null)
    {
        var app = new TestApp(postgres.NewDatabase(), settings);
        await app.SeedWorldAsync();
        return app;
    }

    public async Task<TestUser> CreateUserAsync(string name, bool isAdmin = false, bool isActive = true)
    {
        await using var scope = Factory.Services.CreateAsyncScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var email = $"{name.ToLowerInvariant().Replace(' ', '.')}.{Guid.NewGuid():N}@uji.example";
        var user = new AppUser
        {
            Id = Guid.NewGuid(),
            UserName = email,
            Email = email,
            EmailConfirmed = true,
            DisplayName = name,
            IsAdmin = isAdmin,
            IsActive = isActive,
            CreatedAt = DateTimeOffset.UtcNow,
        };
        var result = await users.CreateAsync(user, Password);
        Assert.True(result.Succeeded, string.Join(",", result.Errors.Select(e => e.Code)));
        return new TestUser(user.Id, email);
    }

    private async Task SeedWorldAsync()
    {
        var admin = await CreateUserAsync("Admin", isAdmin: true);
        var supervisor = await CreateUserAsync("Supervisor");
        var otherSupervisor = await CreateUserAsync("Supervisor Lain");
        var member = await CreateUserAsync("Anggota");
        var manager = await CreateUserAsync("Pengelola");
        var guest = await CreateUserAsync("Tamu");
        var outsider = await CreateUserAsync("Orang Luar");
        var otherManager = await CreateUserAsync("Pengelola Lain");

        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = DateTimeOffset.UtcNow;

        var teamA = new Team { Id = Guid.NewGuid(), Name = "Tim A", CreatedAt = now };
        var teamB = new Team { Id = Guid.NewGuid(), Name = "Tim B", CreatedAt = now };
        db.Teams.AddRange(teamA, teamB);
        db.TeamMembers.AddRange(
            new TeamMember { TeamId = teamA.Id, UserId = supervisor.Id, Role = TeamRole.Supervisor, AddedAt = now },
            new TeamMember { TeamId = teamA.Id, UserId = member.Id, Role = TeamRole.Anggota, AddedAt = now },
            new TeamMember { TeamId = teamB.Id, UserId = otherSupervisor.Id, Role = TeamRole.Supervisor, AddedAt = now });

        var alpha = new Project { Id = Guid.NewGuid(), Name = "Alpha", Code = "ALP", Depth = 0, SortOrder = 1, CreatedAt = now };
        alpha.RootId = alpha.Id;
        var child = new Project { Id = Guid.NewGuid(), ParentId = alpha.Id, RootId = alpha.Id, Depth = 1, Name = "Modul", SortOrder = 1, CreatedAt = now };
        var grandchild = new Project { Id = Guid.NewGuid(), ParentId = child.Id, RootId = alpha.Id, Depth = 2, Name = "Detail", SortOrder = 1, CreatedAt = now };
        var beta = new Project { Id = Guid.NewGuid(), Name = "Beta", Code = "BET", Depth = 0, SortOrder = 2, CreatedAt = now };
        beta.RootId = beta.Id;
        db.Projects.AddRange(alpha, child, grandchild, beta);
        db.ProjectMembers.AddRange(
            new ProjectMember { ProjectId = alpha.Id, UserId = manager.Id, Role = ProjectRole.Pengelola, AddedAt = now },
            new ProjectMember { ProjectId = alpha.Id, UserId = member.Id, Role = ProjectRole.Anggota, AddedAt = now },
            new ProjectMember { ProjectId = alpha.Id, UserId = guest.Id, Role = ProjectRole.Tamu, AddedAt = now },
            new ProjectMember { ProjectId = beta.Id, UserId = otherManager.Id, Role = ProjectRole.Pengelola, AddedAt = now });
        await db.SaveChangesAsync();

        World = new World(admin, supervisor, otherSupervisor, member, manager, guest, outsider, otherManager,
            teamA.Id, teamB.Id, alpha.Id, child.Id, grandchild.Id, beta.Id);
    }

    /// <summary>Klien yang tidak login (tetap membawa header anti-CSRF seperti frontend).</summary>
    public HttpClient Anonymous()
    {
        var client = Factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Requested-With", "ariadne");
        return client;
    }

    /// <summary>Klien yang sudah login sebagai pengguna itu; dipakai ulang antar test.</summary>
    public async Task<HttpClient> ClientAsync(TestUser user)
    {
        if (_clients.TryGetValue(user.Id, out var existing))
        {
            return existing;
        }

        var client = await LoginAsync(user);
        return _clients.GetOrAdd(user.Id, client);
    }

    /// <summary>Klien baru dengan sesi baru (tidak dipakai bersama).</summary>
    public async Task<HttpClient> LoginAsync(TestUser user)
    {
        var client = Anonymous();
        var response = await client.PostAsJsonAsync(
            new Uri("/api/auth/login", UriKind.Relative),
            new { email = user.Email, password = Password, rememberMe = false },
            TestContext.Current.CancellationToken);
        response.EnsureSuccessStatusCode();
        return client;
    }

    public async ValueTask DisposeAsync()
    {
        foreach (var client in _clients.Values)
        {
            client.Dispose();
        }

        await Factory.DisposeAsync();
    }
}

public sealed class WorldFixture(PostgresFixture postgres) : IAsyncLifetime
{
    public TestApp App { get; private set; } = null!;

    public World World => App.World!;

    public PostgresFixture Postgres => postgres;

    // Batas percobaan login dibuat longgar supaya ratusan test tidak saling menghalangi; perilaku batasnya diuji di RateLimitTests
    public async ValueTask InitializeAsync() => App = await TestApp.CreateWithWorldAsync(
        postgres,
        new Dictionary<string, string?> { ["RateLimit:AuthPerMinute"] = "100000" });

    public async ValueTask DisposeAsync() => await App.DisposeAsync();
}
