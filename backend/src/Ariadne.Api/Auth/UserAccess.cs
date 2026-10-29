using Ariadne.Api.Domain;
using Ariadne.Api.Infrastructure.Web;

namespace Ariadne.Api.Auth;

/// <summary>
/// Gambaran lengkap hak seorang pengguna pada saat ini (dibaca dari database setiap permintaan, jadi
/// perubahan keanggotaan langsung berlaku). SEMUA aturan izin ada di sini (docs/domain.md, tabel
/// "Peran dan izin"); endpoint hanya memanggil metode Ensure…, tidak punya aturan sendiri (pedoman B11).
/// </summary>
public sealed class UserAccess(
    Guid userId,
    bool isAdmin,
    IReadOnlyDictionary<Guid, TeamRole> teams,
    IReadOnlyDictionary<Guid, ProjectRole> projects)
{
    public Guid UserId { get; } = userId;

    public bool IsAdmin { get; } = isAdmin;

    /// <summary>Tim yang diikuti, beserta peran di tim itu.</summary>
    public IReadOnlyDictionary<Guid, TeamRole> Teams { get; } = teams;

    /// <summary>Proyek root yang diikuti, beserta peran di proyek itu.</summary>
    public IReadOnlyDictionary<Guid, ProjectRole> Projects { get; } = projects;

    public IReadOnlyList<Guid> SupervisedTeamIds =>
        [.. Teams.Where(t => t.Value == TeamRole.Supervisor).Select(t => t.Key)];

    public bool IsSupervisor => Teams.Any(t => t.Value == TeamRole.Supervisor);

    /// <summary>
    /// Tamu murni: hanya punya peran Tamu di proyek, bukan admin, tidak ikut tim mana pun. Tamu tidak
    /// melihat daftar tim, pengguna lain, atau Pengaturan.
    /// </summary>
    public bool IsGuestOnly => !IsAdmin && Teams.Count == 0 && Projects.Count > 0 && Projects.Values.All(r => r == ProjectRole.Tamu);

    /// <summary>Peran di proyek root; null bila bukan anggota.</summary>
    public ProjectRole? RoleIn(Guid rootProjectId) => Projects.TryGetValue(rootProjectId, out var role) ? role : null;

    /// <summary>
    /// Admin melihat dan mengelola semua proyek (perlu untuk mengatur anggota), tetapi tidak otomatis
    /// boleh mengubah task: itu hanya untuk Pengelola dan Anggota proyek.
    /// </summary>
    public bool CanViewProject(Guid rootProjectId) => IsAdmin || Projects.ContainsKey(rootProjectId);

    /// <summary>Membuat, mengubah, dan menghapus task: hanya Pengelola dan Anggota proyek (bukan Tamu, bukan Admin yang tidak ikut proyek).</summary>
    public bool CanEditTasks(Guid rootProjectId) => RoleIn(rootProjectId) is ProjectRole.Pengelola or ProjectRole.Anggota;

    /// <summary>Komentar biasa dan @mention: semua anggota proyek termasuk Tamu (Admin yang tidak ikut proyek hanya melihat).</summary>
    public bool CanComment(Guid rootProjectId) => RoleIn(rootProjectId) is not null;

    /// <summary>
    /// Catatan Internal tidak pernah ditunjukkan ke Tamu proyek itu, di endpoint mana pun. Admin yang tidak ikut
    /// proyek boleh melihatnya (ia bukan Tamu); Admin yang kebetulan Tamu di proyek itu diperlakukan sebagai Tamu.
    /// </summary>
    public bool CanSeeInternal(Guid rootProjectId) => RoleIn(rootProjectId) is not ProjectRole.Tamu;

    public bool CanManageProject(Guid rootProjectId) => IsAdmin || RoleIn(rootProjectId) == ProjectRole.Pengelola;

    public bool CanViewTeam(Guid teamId) => IsAdmin || Teams.ContainsKey(teamId);

    public bool CanManageTeam(Guid teamId) => IsAdmin || (Teams.TryGetValue(teamId, out var role) && role == TeamRole.Supervisor);

    public void EnsureAdmin()
    {
        if (!IsAdmin)
        {
            throw new ForbiddenException();
        }
    }

    /// <summary>Tidak boleh melihat = 404 (keberadaannya dirahasiakan); boleh melihat tapi tidak boleh mengelola = 403.</summary>
    public void EnsureCanViewProject(Guid rootProjectId)
    {
        if (!CanViewProject(rootProjectId))
        {
            throw new NotFoundException();
        }
    }

    public void EnsureCanManageProject(Guid rootProjectId)
    {
        EnsureCanViewProject(rootProjectId);
        if (!CanManageProject(rootProjectId))
        {
            throw new ForbiddenException();
        }
    }

    public void EnsureCanEditTasks(Guid rootProjectId)
    {
        EnsureCanViewProject(rootProjectId);
        if (!CanEditTasks(rootProjectId))
        {
            throw new ForbiddenException();
        }
    }

    public void EnsureCanComment(Guid rootProjectId)
    {
        EnsureCanViewProject(rootProjectId);
        if (!CanComment(rootProjectId))
        {
            throw new ForbiddenException();
        }
    }

    public void EnsureCanViewTeam(Guid teamId)
    {
        if (!CanViewTeam(teamId))
        {
            throw new NotFoundException();
        }
    }

    public void EnsureCanManageTeam(Guid teamId)
    {
        EnsureCanViewTeam(teamId);
        if (!CanManageTeam(teamId))
        {
            throw new ForbiddenException();
        }
    }

    /// <summary>Daftar tim, pencarian orang, dan sejenisnya hanya untuk orang internal, bukan Tamu.</summary>
    public void EnsureNotGuestOnly()
    {
        if (IsGuestOnly)
        {
            throw new ForbiddenException();
        }
    }

    /// <summary>Mencari orang untuk ditambahkan ke tim atau proyek: Admin, Supervisor, atau Pengelola.</summary>
    public void EnsureCanLookupUsers()
    {
        if (!IsAdmin && !IsSupervisor && !Projects.Values.Any(r => r == ProjectRole.Pengelola))
        {
            throw new ForbiddenException();
        }
    }
}
