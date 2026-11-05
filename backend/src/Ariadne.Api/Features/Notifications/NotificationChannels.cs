using Ariadne.Api.Infrastructure.Email;

namespace Ariadne.Api.Features.Notifications;

/// <summary>
/// Notifikasi untuk satu penerima yang dikirim lewat saluran di luar aplikasi. Digest = ringkasan harian (tenggat
/// besok dan terlambat); selain itu setiap butir dikirim sendiri-sendiri (mention, penugasan, pemindahan).
/// </summary>
public sealed record NotificationDelivery(string Email, string Name, DateOnly Today, bool Digest, IReadOnlyList<NotificationItem> Items);

/// <summary>
/// Saluran pengiriman notifikasi di luar aplikasi (docs/domain.md). Notifikasi in-app adalah baris di tabel
/// notifications itu sendiri, yang dibaca lonceng; saluran ini untuk tujuan lain. Sekarang hanya email; Telegram
/// (di luar MVP) cukup ditambah sebagai implementasi baru dan didaftarkan di AddAriadneNotifications.
/// </summary>
public interface INotificationChannel
{
    Task DeliverAsync(NotificationDelivery delivery, CancellationToken ct);
}

/// <summary>Email lewat antrean SMTP yang sudah ada (pengiriman berjalan di latar belakang, tidak menahan permintaan).</summary>
internal sealed class EmailNotificationChannel(IEmailOutbox outbox, IConfiguration config) : INotificationChannel
{
    public Task DeliverAsync(NotificationDelivery delivery, CancellationToken ct)
    {
        var baseUrl = config["App:BaseUrl"] ?? "http://localhost:18080";
        if (delivery.Digest)
        {
            outbox.Enqueue(NotificationEmails.Digest(delivery.Email, delivery.Name, delivery.Today, delivery.Items, baseUrl));
        }
        else
        {
            foreach (var item in delivery.Items)
            {
                outbox.Enqueue(NotificationEmails.Immediate(delivery.Email, delivery.Name, item, baseUrl));
            }
        }

        return Task.CompletedTask;
    }
}
