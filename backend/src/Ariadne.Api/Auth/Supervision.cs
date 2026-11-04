using Ariadne.Api.Domain;
using Ariadne.Api.Infrastructure.Data;
using Ariadne.Api.Infrastructure.Web;
using Microsoft.EntityFrameworkCore;

namespace Ariadne.Api.Auth;

/// <summary>
/// Hak supervisor atas anggota timnya (docs/domain.md): melihat Timeline Tim dan dashboard anggota, mengubah tanggal,
/// dan memindahkan task. Aturannya ada di sini (pedoman B11); endpoint hanya memanggil metode ini.
/// </summary>
internal static class Supervision
{
    /// <summary>Semua pengguna aktif di tim-tim yang dipegang pengguna ini (termasuk dirinya sendiri bila ia anggota tim itu).</summary>
    public static async Task<HashSet<Guid>> SupervisedUserIdsAsync(AppDbContext db, UserAccess access, CancellationToken ct)
    {
        var teams = access.SupervisedTeamIds;
        if (teams.Count == 0)
        {
            return [];
        }

        var ids = await db.TeamMembers.AsNoTracking()
            .Where(m => teams.Contains(m.TeamId) && m.User!.IsActive)
            .Select(m => m.UserId)
            .ToListAsync(ct);
        return [.. ids];
    }

    /// <summary>Boleh membuka dashboard orang ini: diri sendiri, atau anggota tim yang saya pegang. Selain itu 404.</summary>
    public static async Task EnsureCanViewMemberAsync(AppDbContext db, UserAccess access, Guid targetUserId, CancellationToken ct)
    {
        if (targetUserId == access.UserId)
        {
            return;
        }

        if (!(await SupervisedUserIdsAsync(db, access, ct)).Contains(targetUserId))
        {
            throw new NotFoundException();
        }
    }

    /// <summary>
    /// Mengubah tanggal: Pengelola dan Anggota proyek, atau supervisor yang memegang tim salah satu PIC-nya (khusus proyek yang
    /// boleh ia lihat). Tidak boleh melihat sama sekali = 404; boleh melihat tetapi tidak berhak = 403.
    /// </summary>
    public static async Task EnsureCanRescheduleAsync(AppDbContext db, UserAccess access, Guid rootProjectId, IEnumerable<Guid> assigneeIds, CancellationToken ct)
    {
        EnsureCanView(access, rootProjectId);
        if (access.CanEditTasks(rootProjectId) || await SupervisesAnyAsync(db, access, assigneeIds, ct))
        {
            return;
        }

        throw Denied(access, rootProjectId);
    }

    /// <summary>Memindahkan task ke PIC lain: Pengelola proyek, atau supervisor yang memegang tim PIC lama.</summary>
    public static async Task EnsureCanMoveAsync(AppDbContext db, UserAccess access, Guid rootProjectId, Guid fromUserId, CancellationToken ct)
    {
        EnsureCanView(access, rootProjectId);
        if (access.RoleIn(rootProjectId) == ProjectRole.Pengelola || (await SupervisedUserIdsAsync(db, access, ct)).Contains(fromUserId))
        {
            return;
        }

        throw Denied(access, rootProjectId);
    }

    /// <summary>Melihat calon penerima "Pindahkan ke…": Pengelola proyek, atau supervisor yang memegang tim salah satu PIC task.</summary>
    public static async Task EnsureCanSeeMoveCandidatesAsync(AppDbContext db, UserAccess access, Guid rootProjectId, IEnumerable<Guid> assigneeIds, CancellationToken ct)
    {
        EnsureCanView(access, rootProjectId);
        if (access.RoleIn(rootProjectId) == ProjectRole.Pengelola || await SupervisesAnyAsync(db, access, assigneeIds, ct))
        {
            return;
        }

        throw Denied(access, rootProjectId);
    }

    /// <summary>Supervisor hanya mengurus task di proyek yang boleh ia lihat; proyek lain dianggap tidak ada (404).</summary>
    private static void EnsureCanView(UserAccess access, Guid rootProjectId)
    {
        if (!access.CanViewProject(rootProjectId))
        {
            throw new NotFoundException();
        }
    }

    private static ApiException Denied(UserAccess access, Guid rootProjectId) =>
        access.CanViewProject(rootProjectId) ? new ForbiddenException() : new NotFoundException();

    private static async Task<bool> SupervisesAnyAsync(AppDbContext db, UserAccess access, IEnumerable<Guid> userIds, CancellationToken ct)
    {
        var supervised = await SupervisedUserIdsAsync(db, access, ct);
        return userIds.Any(supervised.Contains);
    }
}
