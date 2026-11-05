using Ariadne.Api.Auth;
using Ariadne.Api.Domain;
using Ariadne.Api.Features.Tasks;
using Ariadne.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Ariadne.Api.Features.Notifications;

/// <summary>
/// Satu notifikasi siap tampil. Kalimatnya ("Syaikhan menyebut Anda di SEN-115") disusun di layar dari data ini;
/// email menyusunnya di NotificationEmails. ProjectId = proyek root (tujuan tautan ke tabel proyek).
/// </summary>
public sealed record NotificationItem(
    Guid Id,
    NotificationKind Kind,
    Guid TaskId,
    string TaskKey,
    string TaskTitle,
    WorkStatus Status,
    Guid ProjectId,
    IReadOnlyList<string> Path,
    string? ActorName,
    string? FromName,
    string? Excerpt,
    DateOnly? StartDate,
    DateOnly? DueDate,
    int LateDays,
    DateTimeOffset CreatedAt,
    bool Read);

/// <summary>
/// Satu halaman daftar notifikasi. Next = penanda halaman berikutnya (kosong bila sudah habis). Today = hari ini menurut
/// server, dasar pengelompokan "Hari ini" / "Kemarin" di layar.
/// </summary>
public sealed record NotificationPage(IReadOnlyList<NotificationItem> Items, int Unread, string? Next, DateOnly Today);

public sealed record UnreadCountResponse(int Count);

internal static class NotificationQueries
{
    private const int ExcerptLength = 120;

    /// <summary>
    /// Notifikasi milik pengguna ini yang MASIH boleh ia lihat: hak diperiksa ulang setiap kali dibaca, karena peran bisa
    /// berubah setelah notifikasi dibuat (dikeluarkan dari proyek, atau kini hanya Tamu). Tamu tidak pernah menerima
    /// apa pun yang berasal dari catatan Internal. Proyek yang diarsipkan dan task yang dihapus ikut tersembunyi.
    /// </summary>
    public static IQueryable<Notification> VisibleTo(this IQueryable<Notification> query, UserAccess access)
    {
        var me = access.UserId;
        query = query.Where(n => n.RecipientId == me && n.Task!.Project!.ArchivedAt == null);
        if (!access.IsAdmin)
        {
            var roots = access.Projects.Keys.ToList();
            query = query.Where(n => roots.Contains(n.RootProjectId));
        }

        var guestRoots = access.Projects.Where(p => p.Value == ProjectRole.Tamu).Select(p => p.Key).ToList();
        if (guestRoots.Count > 0)
        {
            query = query.Where(n => !(guestRoots.Contains(n.RootProjectId) && n.Activity != null && n.Activity.Kind == ActivityKind.Internal));
        }

        return query;
    }

    private sealed record Row(
        Guid Id,
        NotificationKind Kind,
        Guid TaskId,
        Guid RootProjectId,
        Guid ProjectId,
        int Number,
        string Title,
        WorkStatus Status,
        DateOnly? StartDate,
        DateOnly? DueDate,
        string? Actor,
        string? Body,
        ActivityData? Data,
        int LateDays,
        DateTimeOffset CreatedAt,
        DateTimeOffset? ReadAt);

    /// <summary>Mengubah notifikasi (sudah disaring dan diurutkan) menjadi butir siap tampil.</summary>
    public static async Task<List<NotificationItem>> ItemsAsync(AppDbContext db, IQueryable<Notification> query, CancellationToken ct)
    {
        var rows = await query
            .Select(n => new Row(
                n.Id,
                n.Kind,
                n.TaskId,
                n.RootProjectId,
                n.Task!.ProjectId,
                n.Task.Number,
                n.Task.Title,
                n.Task.Status,
                n.Task.StartDate,
                n.Task.DueDate,
                n.Actor == null ? null : n.Actor.DisplayName,
                n.Activity == null ? null : n.Activity.Body,
                n.Activity == null ? null : n.Activity.Data,
                n.LateDays,
                n.CreatedAt,
                n.ReadAt))
            .ToListAsync(ct);
        if (rows.Count == 0)
        {
            return [];
        }

        var codes = await TaskQueries.RootCodesAsync(db, rows.Select(r => r.RootProjectId), ct);
        var paths = await TaskQueries.ProjectPathsAsync(db, rows.Select(r => r.RootProjectId), rows.Select(r => r.ProjectId), ct);
        return [.. rows.Select(r => new NotificationItem(
            r.Id,
            r.Kind,
            r.TaskId,
            $"{codes[r.RootProjectId]}-{r.Number}",
            r.Title,
            r.Status,
            r.RootProjectId,
            paths[r.ProjectId],
            r.Actor,
            r.Kind == NotificationKind.Moved ? r.Data?.Removed?.FirstOrDefault() : null,
            r.Kind == NotificationKind.Mention ? Excerpt(r.Body) : null,
            r.StartDate,
            r.DueDate,
            r.LateDays,
            r.CreatedAt,
            r.ReadAt is not null))];
    }

    private static string? Excerpt(string? body)
    {
        if (body is null)
        {
            return null;
        }

        var text = body.ReplaceLineEndings(" ").Trim();
        return text.Length > ExcerptLength ? text[..ExcerptLength] + "…" : text;
    }
}
