using Ariadne.Api.Auth;
using Ariadne.Api.Domain;
using Ariadne.Api.Infrastructure.Clock;
using Ariadne.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Ariadne.Api.Features.Notifications;

/// <summary>
/// Membuat notifikasi dari aksi orang (mention, penugasan, pemindahan). Notifikasi hanya ditambahkan ke konteks, jadi
/// tersimpan dalam SaveChanges yang sama dengan aksinya: aksi gagal = tidak ada notifikasi. Setelah tersimpan,
/// SendPendingAsync mengirim email segera. Orang tidak pernah diberi notifikasi atas aksinya sendiri.
/// </summary>
internal sealed class Notifier(AppDbContext db, IClock clock, IEnumerable<INotificationChannel> channels)
{
    private readonly List<Guid> _pending = [];

    public void Mentioned(Activity activity, IEnumerable<Guid> userIds)
    {
        foreach (var userId in userIds.Distinct().Where(u => u != activity.AuthorId))
        {
            Add(NotificationKind.Mention, userId, activity.TaskId, activity.RootProjectId, activity.AuthorId, activity.Id);
        }
    }

    /// <summary>Ditugaskan sebagai PIC; `log` = catatan otomatis TaskCreated atau AssigneesChanged dari aksi yang sama.</summary>
    public void Assigned(Activity log, IEnumerable<Guid> userIds)
    {
        foreach (var userId in userIds.Distinct().Where(u => u != log.AuthorId))
        {
            Add(NotificationKind.Assigned, userId, log.TaskId, log.RootProjectId, log.AuthorId, log.Id);
        }
    }

    /// <summary>Task dipindahkan ke `toUserId`; `log` = catatan otomatis TaskMoved (berisi nama PIC lama).</summary>
    public void Moved(Activity log, Guid toUserId)
    {
        if (toUserId != log.AuthorId)
        {
            Add(NotificationKind.Moved, toUserId, log.TaskId, log.RootProjectId, log.AuthorId, log.Id);
        }
    }

    /// <summary>Orang yang tidak lagi disebut setelah entri diubah tidak perlu lagi melihat notifikasinya.</summary>
    public Task ForgetMentionsAsync(Guid activityId, IReadOnlyCollection<Guid> userIds, CancellationToken ct) =>
        userIds.Count == 0
            ? Task.CompletedTask
            : db.Notifications.IgnoreQueryFilters()
                .Where(n => n.ActivityId == activityId && n.Kind == NotificationKind.Mention && userIds.Contains(n.RecipientId))
                .ExecuteDeleteAsync(ct);

    /// <summary>Entri yang dihapus ikut menghapus notifikasinya (isi entri itu tidak boleh lagi terbaca lewat notifikasi).</summary>
    public Task ForgetActivityAsync(Guid activityId, CancellationToken ct) =>
        db.Notifications.IgnoreQueryFilters().Where(n => n.ActivityId == activityId).ExecuteDeleteAsync(ct);

    /// <summary>Dipanggil SETELAH SaveChanges berhasil: mengirim email segera untuk notifikasi yang baru dibuat.</summary>
    public async Task SendPendingAsync(CancellationToken ct)
    {
        if (_pending.Count == 0)
        {
            return;
        }

        var ids = _pending.ToList();
        _pending.Clear();
        await SendAsync(await PrepareAsync(ids, digest: false, ct), ct);
    }

    /// <summary>Mengirim hasil PrepareAsync lewat semua saluran.</summary>
    public async Task SendAsync(IReadOnlyList<NotificationDelivery> deliveries, CancellationToken ct)
    {
        foreach (var delivery in deliveries)
        {
            foreach (var channel in channels)
            {
                await channel.DeliverAsync(delivery, ct);
            }
        }
    }

    /// <summary>
    /// Menyiapkan pengiriman notifikasi ini, dikelompokkan per penerima, dan menandainya "sudah dikirim". Hak melihat
    /// diperiksa dengan aturan yang sama seperti lonceng: akun nonaktif dan notifikasi yang tidak boleh lagi dilihat
    /// dilewati. Tanda disimpan DULU, baru SendAsync mengirim: bila penyimpanan gagal, tidak ada email yang terkirim.
    /// </summary>
    public async Task<List<NotificationDelivery>> PrepareAsync(IReadOnlyList<Guid> ids, bool digest, CancellationToken ct)
    {
        var recipients = await db.Notifications.AsNoTracking()
            .Where(n => ids.Contains(n.Id) && n.EmailedAt == null)
            .Select(n => new { n.RecipientId, n.Recipient!.Email, n.Recipient.DisplayName })
            .Distinct()
            .ToListAsync(ct);
        var deliveries = new List<NotificationDelivery>();
        var sent = new List<Guid>();
        foreach (var recipient in recipients)
        {
            var access = await AccessService.ForUserAsync(db, recipient.RecipientId, ct);
            if (access is null || recipient.Email is null)
            {
                continue;
            }

            var query = db.Notifications.AsNoTracking()
                .Where(n => ids.Contains(n.Id) && n.EmailedAt == null)
                .VisibleTo(access)
                .OrderByDescending(n => n.LateDays)
                .ThenBy(n => n.CreatedAt)
                .ThenBy(n => n.Seq);
            var items = await NotificationQueries.ItemsAsync(db, query, ct);
            if (items.Count == 0)
            {
                continue;
            }

            deliveries.Add(new NotificationDelivery(recipient.Email, recipient.DisplayName, clock.Today, digest, items));
            sent.AddRange(items.Select(i => i.Id));
        }

        if (sent.Count > 0)
        {
            var now = clock.UtcNow;
            await db.Notifications.IgnoreQueryFilters().Where(n => sent.Contains(n.Id)).ExecuteUpdateAsync(s => s.SetProperty(n => n.EmailedAt, now), ct);
        }

        return deliveries;
    }

    private void Add(NotificationKind kind, Guid recipientId, Guid taskId, Guid rootProjectId, Guid actorId, Guid activityId)
    {
        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            RecipientId = recipientId,
            Kind = kind,
            TaskId = taskId,
            RootProjectId = rootProjectId,
            ActorId = actorId,
            ActivityId = activityId,
            CreatedAt = clock.UtcNow,
        };
        db.Notifications.Add(notification);
        _pending.Add(notification.Id);
    }
}
