using Ariadne.Api.Domain;
using Ariadne.Api.Infrastructure.Clock;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Ariadne.Api.Infrastructure.Data.Seed;

/// <summary>
/// Data contoh dari mockup (proyek Sentul dan Migrasi Data Center, anggota Syaikhan, Wiwiet, Ahmad, Manto,
/// Rama, Khalil, Bintang, Galih) supaya tampilan bisa dibandingkan dengan screenshot.
/// Hanya berjalan di Development dan hanya bila Seed:Password diisi; tidak ada password bawaan di kode
/// (pedoman A5). Aman dijalankan berulang: tidak berbuat apa-apa bila sudah ada pengguna.
/// </summary>
internal static partial class DevelopmentSeeder
{
    public static async Task SeedIfConfiguredAsync(this WebApplication app)
    {
        if (!app.Environment.IsDevelopment())
        {
            return; // data contoh tidak pernah ada di produksi
        }

        await using var scope = app.Services.CreateAsyncScope();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger(nameof(DevelopmentSeeder));
        var password = app.Configuration["Seed:Password"];
        if (string.IsNullOrWhiteSpace(password))
        {
            LogSkipped(logger);
            return;
        }

        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        if (await db.Users.AnyAsync())
        {
            return;
        }

        var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var clock = scope.ServiceProvider.GetRequiredService<IClock>();
        await SeedAsync(db, users, clock, password);
        LogSeeded(logger);
    }

    [LoggerMessage(Level = LogLevel.Warning, Message = "Data contoh dilewati: Seed:Password belum diisi (lihat .env.example)")]
    private static partial void LogSkipped(ILogger logger);

    [LoggerMessage(Level = LogLevel.Information, Message = "Data contoh dimasukkan (pengguna, tim, proyek)")]
    private static partial void LogSeeded(ILogger logger);

    internal static async Task SeedAsync(AppDbContext db, UserManager<AppUser> users, IClock clock, string password)
    {
        var now = clock.UtcNow;

        async Task<AppUser> AddUser(string name, bool admin = false, string? email = null)
        {
            email ??= $"{name.ToLowerInvariant()}@perusahaan.co.id";
            var user = new AppUser
            {
                Id = Guid.NewGuid(),
                UserName = email,
                Email = email,
                EmailConfirmed = true,
                DisplayName = name,
                IsAdmin = admin,
                IsActive = true,
                CreatedAt = now,
            };
            var result = await users.CreateAsync(user, password);
            if (!result.Succeeded)
            {
                throw new InvalidOperationException(
                    "Seed gagal membuat pengguna: " + string.Join("; ", result.Errors.Select(e => e.Code)));
            }

            return user;
        }

        var ahmad = await AddUser("Ahmad", admin: true); // admin + supervisor, sesuai mockup
        var syaikhan = await AddUser("Syaikhan");
        var wiwiet = await AddUser("Wiwiet");
        var manto = await AddUser("Manto");
        var rama = await AddUser("Rama");
        var khalil = await AddUser("Khalil");
        var galih = await AddUser("Galih");
        var bintang = await AddUser("Bintang");
        var budi = await AddUser("Pak Budi", email: "budi@klien.example"); // Tamu klien (mockup 08, 09)

        // Selisih detik supaya urutan "dibuat" jelas: Tim Sentul, Infrastruktur, QA (urutan di mockup)
        var teamOrder = 0;
        Team Team(string name) => new() { Id = Guid.NewGuid(), Name = name, CreatedAt = now.AddSeconds(teamOrder++) };
        var memberOrder = 0; // urutan ditambahkan = urutan di mockup
        TeamMember Member(Team team, AppUser user, TeamRole role) => new() { TeamId = team.Id, UserId = user.Id, Role = role, AddedAt = now.AddSeconds(memberOrder++) };

        var sentul = Team("Tim Sentul");
        var infra = Team("Tim Infrastruktur");
        var qa = Team("Tim QA");
        db.Teams.AddRange(sentul, infra, qa);
        db.TeamMembers.AddRange(
            Member(sentul, ahmad, TeamRole.Supervisor),
            Member(sentul, wiwiet, TeamRole.Anggota),
            Member(sentul, manto, TeamRole.Anggota),
            Member(sentul, rama, TeamRole.Anggota),
            Member(sentul, galih, TeamRole.Anggota),
            Member(sentul, khalil, TeamRole.Anggota),
            Member(sentul, bintang, TeamRole.Anggota),
            Member(infra, syaikhan, TeamRole.Supervisor),
            Member(infra, wiwiet, TeamRole.Anggota),
            Member(infra, manto, TeamRole.Anggota),
            Member(infra, galih, TeamRole.Anggota),
            Member(qa, ahmad, TeamRole.Supervisor),
            Member(qa, rama, TeamRole.Anggota),
            Member(qa, bintang, TeamRole.Anggota));

        int order = 0;
        Project Root(string name, string code) => new()
        {
            Id = Guid.NewGuid(),
            Name = name,
            Code = code,
            Depth = 0,
            SortOrder = ++order,
            CreatedAt = now,
        };
        Project Child(Project parent, string name, int sort) => new()
        {
            Id = Guid.NewGuid(),
            ParentId = parent.Id,
            RootId = parent.RootId,
            Depth = parent.Depth + 1,
            Name = name,
            SortOrder = sort,
            CreatedAt = now,
        };

        var sentulProject = Root("Sentul", "SEN");
        sentulProject.RootId = sentulProject.Id;
        var migrasi = Root("Migrasi Data Center", "MDC");
        migrasi.RootId = migrasi.Id;
        var dispatch = Child(sentulProject, "Dispatch", 1);
        var slms = Child(sentulProject, "SLMS", 2);
        var temuan = Child(slms, "Temuan UAT & API", 1);
        var smartclassroom = Child(sentulProject, "Smartclassroom", 3);
        var faq = Child(sentulProject, "FAQ", 4);
        var menagih = Child(sentulProject, "Menagih Pihak Lain", 5);
        var testing = Child(sentulProject, "Testing Oktober", 6);
        db.Projects.AddRange(sentulProject, migrasi, dispatch, slms, temuan, smartclassroom, faq, menagih, testing);

        var pmOrder = 0; // menit berbeda supaya yang sama tanggalnya tetap berurutan seperti mockup
        ProjectMember Pm(Project project, AppUser user, ProjectRole role, int year, int month, int day) => new()
        {
            ProjectId = project.Id,
            UserId = user.Id,
            Role = role,
            // Tanggal ditambahkan seperti mockup 08
            AddedAt = new DateTimeOffset(year, month, day, 2, pmOrder++ % 60, 0, TimeSpan.Zero),
        };

        db.ProjectMembers.AddRange(
            Pm(sentulProject, ahmad, ProjectRole.Pengelola, 2026, 6, 2),
            Pm(sentulProject, syaikhan, ProjectRole.Pengelola, 2026, 6, 2),
            Pm(sentulProject, wiwiet, ProjectRole.Anggota, 2026, 6, 2),
            Pm(sentulProject, manto, ProjectRole.Anggota, 2026, 6, 10),
            Pm(sentulProject, rama, ProjectRole.Anggota, 2026, 6, 10),
            Pm(sentulProject, khalil, ProjectRole.Anggota, 2026, 7, 1),
            Pm(sentulProject, galih, ProjectRole.Anggota, 2026, 7, 1),
            Pm(sentulProject, bintang, ProjectRole.Anggota, 2026, 8, 14),
            Pm(sentulProject, budi, ProjectRole.Tamu, 2026, 8, 3),
            Pm(migrasi, ahmad, ProjectRole.Pengelola, 2026, 6, 15),
            Pm(migrasi, syaikhan, ProjectRole.Pengelola, 2026, 6, 15),
            Pm(migrasi, wiwiet, ProjectRole.Anggota, 2026, 6, 15),
            Pm(migrasi, manto, ProjectRole.Anggota, 2026, 6, 15),
            Pm(migrasi, rama, ProjectRole.Anggota, 2026, 6, 15),
            Pm(migrasi, galih, ProjectRole.Anggota, 2026, 6, 15));

        await db.SaveChangesAsync();
    }
}
