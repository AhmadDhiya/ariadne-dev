using System.Text.Json;
using System.Text.Json.Serialization;
using Ariadne.Api.Domain;
using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Ariadne.Api.Infrastructure.Data;

/// <summary>
/// Database aplikasi. Tabel pengguna memakai Identity tanpa tabel peran: peran kita
/// (Admin, Supervisor, Pengelola, Anggota, Tamu) disimpan di kolom dan tabel keanggotaan sendiri.
/// </summary>
public sealed class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityUserContext<AppUser, Guid>(options), IDataProtectionKeyContext
{
    /// <summary>Kunci enkripsi cookie login; disimpan di database supaya login tetap berlaku setelah restart.</summary>
    public DbSet<DataProtectionKey> DataProtectionKeys => Set<DataProtectionKey>();

    public DbSet<Team> Teams => Set<Team>();

    public DbSet<TeamMember> TeamMembers => Set<TeamMember>();

    public DbSet<Project> Projects => Set<Project>();

    public DbSet<ProjectMember> ProjectMembers => Set<ProjectMember>();

    public DbSet<ProjectTask> Tasks => Set<ProjectTask>();

    public DbSet<TaskAssignee> TaskAssignees => Set<TaskAssignee>();

    public DbSet<Label> Labels => Set<Label>();

    public DbSet<TaskLabel> TaskLabels => Set<TaskLabel>();

    public DbSet<Activity> Activities => Set<Activity>();

    public DbSet<Mention> Mentions => Set<Mention>();

    public DbSet<Milestone> Milestones => Set<Milestone>();

    public DbSet<Invitation> Invitations => Set<Invitation>();

    private static readonly JsonSerializerOptions DataJson = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<AppUser>(user =>
        {
            user.ToTable("users");
            user.Property(u => u.DisplayName).HasMaxLength(100).IsRequired();
            user.Property(u => u.Theme).HasMaxLength(10);
            user.Property(u => u.Email).HasMaxLength(254).IsRequired();
            // Email unik tanpa membedakan huruf besar/kecil (Identity menyimpan versi huruf besar di sini)
            user.HasIndex(u => u.NormalizedEmail).IsUnique();
            user.ToTable(t => t.HasCheckConstraint("ck_users_theme", "theme IS NULL OR theme IN ('light', 'dark')"));
        });
        builder.Entity<IdentityUserClaim<Guid>>().ToTable("user_claims");
        builder.Entity<IdentityUserLogin<Guid>>().ToTable("user_logins");
        builder.Entity<IdentityUserToken<Guid>>().ToTable("user_tokens");

        builder.Entity<Team>(team =>
        {
            team.ToTable("teams");
            team.HasKey(t => t.Id);
            team.Property(t => t.Name).HasMaxLength(100).IsRequired();
            team.HasIndex(t => t.Name).IsUnique();
        });

        builder.Entity<TeamMember>(member =>
        {
            member.ToTable("team_members");
            member.HasKey(m => new { m.TeamId, m.UserId });
            member.Property(m => m.Role).HasConversion<string>().HasMaxLength(20);
            member.HasOne(m => m.Team).WithMany(t => t.Members).HasForeignKey(m => m.TeamId).OnDelete(DeleteBehavior.Cascade);
            member.HasOne(m => m.User).WithMany().HasForeignKey(m => m.UserId).OnDelete(DeleteBehavior.Restrict);
            member.HasIndex(m => m.UserId);
        });

        builder.Entity<Project>(project =>
        {
            project.ToTable("projects", t =>
            {
                t.HasCheckConstraint("ck_projects_depth", "depth BETWEEN 0 AND 2");
                // Root: tanpa induk, kedalaman 0, punya kode, dan root-nya diri sendiri
                t.HasCheckConstraint("ck_projects_root_shape", "(parent_id IS NULL) = (depth = 0)");
                t.HasCheckConstraint("ck_projects_code_only_on_root", "(parent_id IS NULL) = (code IS NOT NULL)");
                t.HasCheckConstraint("ck_projects_root_is_self", "parent_id IS NOT NULL OR root_id = id");
            });
            project.HasKey(p => p.Id);
            project.Property(p => p.Name).HasMaxLength(100).IsRequired();
            project.Property(p => p.Code).HasMaxLength(6);
            project.HasIndex(p => p.Code).IsUnique();
            project.HasIndex(p => p.ParentId);
            project.HasIndex(p => p.RootId);
            project.HasOne<Project>().WithMany().HasForeignKey(p => p.ParentId).OnDelete(DeleteBehavior.Restrict);
            project.HasOne<Project>().WithMany().HasForeignKey(p => p.RootId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<ProjectMember>(member =>
        {
            member.ToTable("project_members");
            member.HasKey(m => new { m.ProjectId, m.UserId });
            member.Property(m => m.Role).HasConversion<string>().HasMaxLength(20);
            member.HasOne(m => m.Project).WithMany().HasForeignKey(m => m.ProjectId).OnDelete(DeleteBehavior.Cascade);
            member.HasOne(m => m.User).WithMany().HasForeignKey(m => m.UserId).OnDelete(DeleteBehavior.Restrict);
            member.HasIndex(m => m.UserId);
        });

        builder.Entity<ProjectTask>(task =>
        {
            task.ToTable("tasks", t =>
            {
                // Status tertahan <=> ada alasan dan waktu mulai tertahan; di luar itu semuanya kosong (aturan domain, dijaga juga di database)
                t.HasCheckConstraint(
                    "ck_tasks_hold_shape",
                    "(status IN ('Blocked', 'OnHold', 'OnRequest') AND hold_reason IS NOT NULL AND length(btrim(hold_reason)) > 0 AND held_since IS NOT NULL) "
                    + "OR (status NOT IN ('Blocked', 'OnHold', 'OnRequest') AND hold_reason IS NULL AND waiting_on_user_id IS NULL AND waiting_on_text IS NULL AND held_since IS NULL)");
                t.HasCheckConstraint("ck_tasks_dates", "start_date IS NULL OR due_date IS NULL OR start_date <= due_date");
                t.HasCheckConstraint("ck_tasks_waiting_one", "waiting_on_user_id IS NULL OR waiting_on_text IS NULL");
                t.HasCheckConstraint("ck_tasks_not_own_parent", "parent_task_id IS NULL OR parent_task_id <> id");
            });
            task.HasKey(t => t.Id);
            task.Property(t => t.Title).HasMaxLength(200).IsRequired();
            task.Property(t => t.Description).HasMaxLength(5000);
            task.Property(t => t.Status).HasConversion<string>().HasMaxLength(20);
            task.Property(t => t.Priority).HasConversion<string>().HasMaxLength(20);
            task.Property(t => t.HoldReason).HasMaxLength(1000);
            task.Property(t => t.WaitingOnText).HasMaxLength(200);
            task.Property(t => t.Version).IsRowVersion();
            task.HasIndex(t => t.ProjectId);
            task.HasIndex(t => new { t.RootProjectId, t.Number }).IsUnique();
            task.HasIndex(t => t.ParentTaskId);
            task.HasIndex(t => t.DueDate);
            task.HasIndex(t => t.Status);
            task.HasOne(t => t.Project).WithMany().HasForeignKey(t => t.ProjectId).OnDelete(DeleteBehavior.Restrict);
            task.HasOne<Project>().WithMany().HasForeignKey(t => t.RootProjectId).OnDelete(DeleteBehavior.Restrict);
            task.HasOne<ProjectTask>().WithMany().HasForeignKey(t => t.ParentTaskId).OnDelete(DeleteBehavior.Restrict);
            task.HasOne<AppUser>().WithMany().HasForeignKey(t => t.CreatedById).OnDelete(DeleteBehavior.Restrict);
            task.HasOne<AppUser>().WithMany().HasForeignKey(t => t.WaitingOnUserId).OnDelete(DeleteBehavior.Restrict);
            // Task yang dihapus disembunyikan di semua query kecuali sengaja memakai IgnoreQueryFilters
            task.HasQueryFilter(t => t.DeletedAt == null);
        });

        builder.Entity<TaskAssignee>(assignee =>
        {
            assignee.ToTable("task_assignees");
            assignee.HasKey(a => new { a.TaskId, a.UserId });
            assignee.HasOne(a => a.Task).WithMany(t => t.Assignees).HasForeignKey(a => a.TaskId).OnDelete(DeleteBehavior.Cascade);
            assignee.HasOne(a => a.User).WithMany().HasForeignKey(a => a.UserId).OnDelete(DeleteBehavior.Restrict);
            assignee.HasIndex(a => a.UserId);
            assignee.HasQueryFilter(a => a.Task!.DeletedAt == null);
        });

        builder.Entity<Label>(label =>
        {
            label.ToTable("labels");
            label.HasKey(l => l.Id);
            label.Property(l => l.Name).HasMaxLength(40).IsRequired();
            label.HasOne<Project>().WithMany().HasForeignKey(l => l.RootProjectId).OnDelete(DeleteBehavior.Cascade);
            label.Property(l => l.NormalizedName).HasMaxLength(40).IsRequired();
            // Unik per proyek root tanpa membedakan huruf besar/kecil (NormalizedName = huruf kecil)
            label.HasIndex(l => new { l.RootProjectId, l.NormalizedName }).IsUnique();
        });

        builder.Entity<TaskLabel>(taskLabel =>
        {
            taskLabel.ToTable("task_labels");
            taskLabel.HasKey(l => new { l.TaskId, l.LabelId });
            taskLabel.HasOne(l => l.Task).WithMany(t => t.Labels).HasForeignKey(l => l.TaskId).OnDelete(DeleteBehavior.Cascade);
            taskLabel.HasOne(l => l.Label).WithMany().HasForeignKey(l => l.LabelId).OnDelete(DeleteBehavior.Cascade);
            taskLabel.HasIndex(l => l.LabelId);
            taskLabel.HasQueryFilter(l => l.Task!.DeletedAt == null);
        });

        builder.Entity<Activity>(activity =>
        {
            activity.ToTable("activities", t =>
            {
                // Log: punya jenis log dan tanpa teks. Selain Log: punya teks, tanpa jenis log dan data (aturan domain, dijaga juga di database)
                t.HasCheckConstraint(
                    "ck_activities_shape",
                    "(kind = 'Log' AND log_kind IS NOT NULL AND body IS NULL) "
                    + "OR (kind <> 'Log' AND log_kind IS NULL AND data IS NULL AND body IS NOT NULL AND length(btrim(body)) > 0)");
            });
            activity.HasKey(a => a.Id);
            activity.Property(a => a.Seq).ValueGeneratedOnAdd().UseIdentityByDefaultColumn();
            activity.HasIndex(a => a.Seq).IsUnique();
            activity.Property(a => a.Kind).HasConversion<string>().HasMaxLength(20);
            activity.Property(a => a.LogKind).HasConversion<string>().HasMaxLength(30);
            activity.Property(a => a.Body).HasMaxLength(5000);
            activity.Property(a => a.Data)
                .HasColumnType("jsonb")
                .HasConversion(
                    data => JsonSerializer.Serialize(data, DataJson),
                    json => JsonSerializer.Deserialize<ActivityData>(json, DataJson));
            // Timeline satu task, terbaru dulu, tanpa mengurutkan ulang
            activity.HasIndex(a => new { a.TaskId, a.Seq });
            activity.HasIndex(a => new { a.TaskId, a.Kind, a.CreatedAt });
            activity.HasOne(a => a.Task).WithMany().HasForeignKey(a => a.TaskId).OnDelete(DeleteBehavior.Cascade);
            activity.HasOne<Project>().WithMany().HasForeignKey(a => a.RootProjectId).OnDelete(DeleteBehavior.Restrict);
            activity.HasOne(a => a.Author).WithMany().HasForeignKey(a => a.AuthorId).OnDelete(DeleteBehavior.Restrict);
            activity.HasQueryFilter(a => a.Task!.DeletedAt == null && a.DeletedAt == null);
        });

        builder.Entity<Milestone>(milestone =>
        {
            milestone.ToTable("milestones");
            milestone.HasKey(m => m.Id);
            milestone.Property(m => m.Name).HasMaxLength(100).IsRequired();
            milestone.HasIndex(m => new { m.RootProjectId, m.Date });
            milestone.HasIndex(m => m.ProjectId);
            milestone.HasOne<Project>().WithMany().HasForeignKey(m => m.ProjectId).OnDelete(DeleteBehavior.Restrict);
            milestone.HasOne<Project>().WithMany().HasForeignKey(m => m.RootProjectId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Invitation>(invitation =>
        {
            invitation.ToTable("invitations", t =>
            {
                // Diterima <=> ada akun penerima; Menunggu <=> belum diselesaikan
                t.HasCheckConstraint("ck_invitations_accepted", "(status = 'Diterima') = (accepted_user_id IS NOT NULL)");
                t.HasCheckConstraint("ck_invitations_resolved", "(status = 'Menunggu') = (resolved_at IS NULL)");
            });
            invitation.HasKey(i => i.Id);
            invitation.Property(i => i.Email).HasMaxLength(254).IsRequired();
            invitation.Property(i => i.NormalizedEmail).HasMaxLength(254).IsRequired();
            invitation.Property(i => i.Role).HasConversion<string>().HasMaxLength(20);
            invitation.Property(i => i.Status).HasConversion<string>().HasMaxLength(20);
            invitation.Property(i => i.TokenHash).HasMaxLength(64).IsFixedLength().IsRequired();
            invitation.Property(i => i.Message).HasMaxLength(500);
            invitation.HasIndex(i => i.TokenHash).IsUnique();
            // Satu undangan yang masih menunggu per email per proyek (mengundang ulang menggantikan yang lama)
            invitation.HasIndex(i => new { i.ProjectId, i.NormalizedEmail }).IsUnique().HasFilter("status = 'Menunggu'");
            invitation.HasOne(i => i.Project).WithMany().HasForeignKey(i => i.ProjectId).OnDelete(DeleteBehavior.Cascade);
            invitation.HasOne(i => i.InvitedBy).WithMany().HasForeignKey(i => i.InvitedById).OnDelete(DeleteBehavior.Restrict);
            invitation.HasOne<AppUser>().WithMany().HasForeignKey(i => i.AcceptedUserId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Mention>(mention =>
        {
            mention.ToTable("mentions");
            mention.HasKey(m => new { m.ActivityId, m.UserId });
            mention.Property(m => m.DisplayName).HasMaxLength(100).IsRequired();
            mention.HasOne(m => m.Activity).WithMany(a => a.Mentions).HasForeignKey(m => m.ActivityId).OnDelete(DeleteBehavior.Cascade);
            mention.HasOne(m => m.User).WithMany().HasForeignKey(m => m.UserId).OnDelete(DeleteBehavior.Restrict);
            mention.HasIndex(m => m.UserId);
            mention.HasQueryFilter(m => m.Activity!.Task!.DeletedAt == null && m.Activity.DeletedAt == null);
        });
    }
}
