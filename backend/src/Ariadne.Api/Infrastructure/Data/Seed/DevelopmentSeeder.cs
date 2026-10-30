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


        var timeline = SeedTasks(db, now, sentulProject, migrasi, dispatch, slms, temuan, smartclassroom, faq, menagih, testing, ahmad, syaikhan, wiwiet, manto, rama, khalil, galih, bintang, budi);

        await db.SaveChangesAsync();

        // Urutan timeline mengikuti urutan penyimpanan (nomor urut database), sedangkan EF mengurutkan penyimpanan
        // sekaligus menurut kunci; maka entri contoh disimpan satu per satu, dari yang terlama
        foreach (var activity in timeline)
        {
            db.Activities.Add(activity);
            await db.SaveChangesAsync();
        }

    }

    /// <summary>
    /// Task contoh dari mockup 03 (Sentul): nomor, judul, PIC, dan tanggalnya sama dengan gambar. Smartclassroom (enam task,
    /// dilipat di mockup) dan Migrasi Data Center hanya berupa contoh karena mockup tidak merinci isinya.
    /// </summary>
    private static List<Activity> SeedTasks(
        AppDbContext db,
        DateTimeOffset now,
        Project sentul,
        Project migrasi,
        Project dispatch,
        Project slms,
        Project temuan,
        Project smartclassroom,
        Project faq,
        Project menagih,
        Project testing,
        AppUser ahmad,
        AppUser syaikhan,
        AppUser wiwiet,
        AppUser manto,
        AppUser rama,
        AppUser khalil,
        AppUser galih,
        AppUser bintang,
        AppUser budi)
    {
        var timeline = new List<Activity>();
        var labels = new Dictionary<(Guid Root, string Name), Label>();
        var sort = new Dictionary<(Guid Project, Guid? Parent), int>();

        ProjectTask Add(
            Project root,
            Project project,
            int number,
            string title,
            Priority priority,
            WorkStatus status,
            string start,
            string due,
            AppUser[] pic,
            string[] tags,
            ProjectTask? parent = null,
            string? holdReason = null,
            AppUser? waitingOn = null,
            string? waitingText = null,
            string? heldSince = null)
        {
            var key = (project.Id, parent?.Id);
            sort[key] = sort.GetValueOrDefault(key) + 1;
            var task = new ProjectTask
            {
                Id = Guid.NewGuid(),
                ProjectId = project.Id,
                RootProjectId = root.Id,
                Number = number,
                ParentTaskId = parent?.Id,
                Title = title,
                Status = status,
                Priority = priority,
                StartDate = DateOnly.Parse(start, System.Globalization.CultureInfo.InvariantCulture),
                DueDate = DateOnly.Parse(due, System.Globalization.CultureInfo.InvariantCulture),
                HoldReason = holdReason,
                WaitingOnUserId = waitingOn?.Id,
                WaitingOnText = waitingText,
                HeldSince = heldSince is null ? null : new DateTimeOffset(DateOnly.Parse(heldSince, System.Globalization.CultureInfo.InvariantCulture).ToDateTime(new TimeOnly(1, 0)), TimeSpan.Zero),
                SortOrder = sort[key],
                CreatedById = ahmad.Id,
                CreatedAt = now,
                UpdatedAt = now,
            };
            foreach (var person in pic)
            {
                task.Assignees.Add(new TaskAssignee { TaskId = task.Id, UserId = person.Id });
            }

            foreach (var name in tags)
            {
                if (!labels.TryGetValue((root.Id, name), out var label))
                {
                    label = new Label { Id = Guid.NewGuid(), RootProjectId = root.Id, Name = name, NormalizedName = name.ToLowerInvariant() };
                    labels[(root.Id, name)] = label;
                    db.Labels.Add(label);
                }

                task.Labels.Add(new TaskLabel { TaskId = task.Id, LabelId = label.Id });
            }

            db.Tasks.Add(task);
            return task;
        }

        // Entri aktivitas contoh (jam dalam WIB, sama dengan kolom "Update terakhir" dan drawer di mockup 03 dan 05)
        static DateTimeOffset Wib(string local) =>
            new DateTimeOffset(DateTime.Parse(local, System.Globalization.CultureInfo.InvariantCulture), TimeSpan.FromHours(7)).ToUniversalTime();

        Activity Note(ProjectTask task, ActivityKind kind, AppUser author, string wib, string body, params AppUser[] mentioned)
        {
            var activity = new Activity
            {
                Id = Guid.NewGuid(),
                TaskId = task.Id,
                RootProjectId = task.RootProjectId,
                AuthorId = author.Id,
                Kind = kind,
                Body = body,
                CreatedAt = Wib(wib),
            };
            foreach (var person in mentioned)
            {
                activity.Mentions.Add(new Mention { ActivityId = activity.Id, UserId = person.Id, DisplayName = person.DisplayName });
            }

            timeline.Add(activity);
            return activity;
        }

        void Update(ProjectTask task, AppUser author, string wib, string body) => Note(task, ActivityKind.Update, author, wib, body);

        void Log(ProjectTask task, AppUser author, string wib, LogKind kind, ActivityData data) =>
            timeline.Add(new Activity
            {
                Id = Guid.NewGuid(),
                TaskId = task.Id,
                RootProjectId = task.RootProjectId,
                AuthorId = author.Id,
                Kind = ActivityKind.Log,
                LogKind = kind,
                Data = data,
                CreatedAt = Wib(wib),
            });

        // Dispatch
        var server = Add(sentul, dispatch, 101, "Pengisian Kebutuhan Server", Priority.High, WorkStatus.Done, "2026-09-14", "2026-09-18", [ahmad], ["Infra"]);
        var metrics = Add(sentul, dispatch, 104, "Integrasi log & metrics", Priority.Medium, WorkStatus.OnProgress, "2026-09-28", "2026-10-02", [ahmad, rama], ["Monitoring"]);
        var pipeline = Add(sentul, dispatch, 115, "Pipeline GitLab IRS", Priority.Critical, WorkStatus.Blocked, "2026-09-21", "2026-09-25", [wiwiet, ahmad], ["DevOps"],
            holdReason: "Runner GitLab belum bisa mengakses server staging; port 22 dan 443 masih ditutup firewall.", waitingOn: manto, heldSince: "2026-09-24");

        // SLMS
        var pentest = Add(sentul, slms, 112, "Paket PenTest whitebox", Priority.Critical, WorkStatus.OnProgress, "2026-09-21", "2026-09-28", [ahmad, khalil], ["Keamanan"]);
        var apiDocs = Add(sentul, slms, 118, "Dokumentasi API absensi", Priority.Medium, WorkStatus.OnProgress, "2026-09-24", "2026-09-29", [manto], ["Dokumentasi"]);

        // SLMS / Temuan UAT & API (satu task dengan tiga sub-task)
        var uat = Add(sentul, temuan, 121, "Perbaikan temuan UAT modul absensi", Priority.High, WorkStatus.Fixing, "2026-09-23", "2026-09-26", [ahmad], ["UAT"]);
        var shift = Add(sentul, temuan, 122, "Validasi jam masuk shift malam", Priority.High, WorkStatus.Fixing, "2026-09-23", "2026-09-26", [ahmad], ["UAT"], uat);
        var token = Add(sentul, temuan, 123, "Pesan error saat token kedaluwarsa", Priority.Medium, WorkStatus.Done, "2026-09-23", "2026-09-24", [manto], ["UAT"], uat);
        Add(sentul, temuan, 124, "Uji ulang oleh klien", Priority.Medium, WorkStatus.NotStarted, "2026-09-29", "2026-09-30", [ahmad], ["UAT"], uat);
        var recap = Add(sentul, temuan, 126, "Endpoint rekap kehadiran lambat", Priority.High, WorkStatus.OnProgress, "2026-09-25", "2026-10-01", [manto, galih], ["API"]);

        // Smartclassroom (enam task; mockup hanya menunjukkan grup ini dilipat)
        Add(sentul, smartclassroom, 105, "Inventaris perangkat kelas", Priority.Medium, WorkStatus.Done, "2026-09-14", "2026-09-18", [galih], ["Infra"]);
        Add(sentul, smartclassroom, 106, "Pasang access point lantai 2", Priority.High, WorkStatus.Done, "2026-09-15", "2026-09-22", [galih], ["Infra"]);
        Add(sentul, smartclassroom, 107, "Konfigurasi proyektor interaktif", Priority.Medium, WorkStatus.OnProgress, "2026-09-24", "2026-10-02", [galih, bintang], ["Infra"]);
        Add(sentul, smartclassroom, 127, "Uji koneksi tiap ruang kelas", Priority.Medium, WorkStatus.NotStarted, "2026-10-05", "2026-10-09", [bintang], ["QA"]);
        Add(sentul, smartclassroom, 128, "Pelatihan guru", Priority.Low, WorkStatus.NotStarted, "2026-10-12", "2026-10-16", [wiwiet], ["Konten"]);
        Add(sentul, smartclassroom, 129, "Dokumentasi instalasi", Priority.Low, WorkStatus.NotStarted, "2026-10-07", "2026-10-09", [galih], ["Dokumentasi"]);

        // FAQ, Menagih Pihak Lain, Testing Oktober
        Add(sentul, faq, 130, "Penyusunan FAQ", Priority.Low, WorkStatus.NotStarted, "2026-10-01", "2026-10-07", [bintang], ["Konten"]);
        var vpn = Add(sentul, menagih, 133, "Menunggu akses VPN dari klien", Priority.High, WorkStatus.OnRequest, "2026-09-22", "2026-09-30", [ahmad], ["Klien"],
            holdReason: "Akun VPN untuk tim belum dibuatkan oleh klien.", waitingText: "Klien — tim IT", heldSince: "2026-09-22");
        var scenario = Add(sentul, testing, 145, "Skenario uji Oktober", Priority.Medium, WorkStatus.OnHold, "2026-10-01", "2026-10-09", [rama], ["QA"],
            holdReason: "Menunggu jadwal UAT final dari klien.", waitingOn: syaikhan, heldSince: "2026-09-25");
        sentul.NextTaskNumber = 146;

        Update(server, ahmad, "2026-09-18T15:00", "Spesifikasi final dikirim ke klien");
        Update(metrics, rama, "2026-09-28T09:40", "Dashboard Grafana 60%, alert belum");
        Update(pentest, khalil, "2026-09-27T14:00", "Draf laporan sudah diunggah");
        Update(apiDocs, manto, "2026-09-28T10:05", "12 dari 18 endpoint terdokumentasi");
        Update(uat, ahmad, "2026-09-27T16:00", "Validasi shift malam masih salah");
        Update(shift, ahmad, "2026-09-27T16:30", "Kasus lewat tengah malam");
        Update(token, manto, "2026-09-24T11:00", "Sudah dites di staging");
        Update(recap, galih, "2026-09-28T11:20", "Index baru dipasang, 2,1 dtk → 0,4 dtk");
        Update(vpn, ahmad, "2026-09-26T10:00", "Formulir akses sudah dikirim ulang");
        Update(scenario, rama, "2026-09-25T09:00", "Ditunda sampai jadwal UAT final");

        // Drawer SEN-115 (mockup 05). Urutan timeline mengikuti urutan penyimpanan, jadi disimpan dari yang terlama
        Log(pipeline, syaikhan, "2026-09-22T10:00", LogKind.AssigneesChanged, new ActivityData { Added = ["Wiwiet"], Removed = ["Rama"] });
        Log(pipeline, wiwiet, "2026-09-28T08:38", LogKind.StatusChanged, new ActivityData { From = "OnProgress", To = "Blocked", Reason = pipeline.HoldReason });
        Update(pipeline, wiwiet, "2026-09-28T08:40", "Runner gagal konek ke staging");
        Note(pipeline, ActivityKind.Comment, syaikhan, "2026-09-28T08:55", "@Ahmad bisa dicek apakah runner boleh lewat proxy sementara?", ahmad);
        Note(pipeline, ActivityKind.Internal, syaikhan, "2026-09-28T09:02", "Kalau firewall belum dibuka Rabu, eskalasi ke manajer infrastruktur klien.");
        Note(pipeline, ActivityKind.Comment, budi, "2026-09-28T09:30", "Tim kami sedang memproses permintaan firewall-nya, estimasi Rabu.");

        // Migrasi Data Center: contoh kecil
        Add(migrasi, migrasi, 1, "Inventaris server lama", Priority.High, WorkStatus.Done, "2026-09-14", "2026-09-18", [syaikhan, manto], ["Infra"]);
        Add(migrasi, migrasi, 2, "Migrasi database utama", Priority.Critical, WorkStatus.OnProgress, "2026-09-24", "2026-10-02", [syaikhan, galih], ["Database"]);
        Add(migrasi, migrasi, 3, "Uji failover", Priority.High, WorkStatus.NotStarted, "2026-10-05", "2026-10-09", [rama], ["QA"]);
        Add(migrasi, migrasi, 4, "Cutover akhir pekan", Priority.Critical, WorkStatus.NotStarted, "2026-10-10", "2026-10-11", [syaikhan, wiwiet], ["Infra"]);
        migrasi.NextTaskNumber = 5;

        return timeline;
    }
}
