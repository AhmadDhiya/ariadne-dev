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
    }
}
