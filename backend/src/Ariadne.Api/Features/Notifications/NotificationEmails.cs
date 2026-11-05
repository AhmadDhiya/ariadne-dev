using System.Globalization;
using System.Net;
using System.Reflection;
using Ariadne.Api.Domain;
using Ariadne.Api.Infrastructure.Email;

namespace Ariadne.Api.Features.Notifications;

/// <summary>
/// Isi email notifikasi: satu email segera untuk mention, penugasan, dan pemindahan; satu ringkasan harian untuk
/// tenggat besok dan terlambat. Kalimatnya sama dengan panel lonceng. Semua nilai dari pengguna di-encode ke HTML
/// (pedoman C5). Ikon status disisipkan sebagai PNG (cid), bukan tautan gambar luar.
/// </summary>
internal static class NotificationEmails
{
    private static readonly string[] Months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

    public static string TaskLink(string baseUrl, NotificationItem item) =>
        $"{baseUrl.TrimEnd('/')}/proyek/{item.ProjectId}/tabel?task={Uri.EscapeDataString(item.TaskKey)}";

    /// <summary>"28 Sep", sesuai format tanggal aplikasi.</summary>
    public static string ShortDate(DateOnly date) => $"{date.Day} {Months[date.Month - 1]}";

    /// <summary>Label jenis, pelaku (ditebalkan), dan sisa kalimat; sama dengan panel lonceng.</summary>
    public static (string Label, string Who, string Text) Sentence(NotificationItem item) => item.Kind switch
    {
        NotificationKind.Mention => ("Di-mention", item.ActorName ?? "", $"menyebut Anda di {item.TaskKey}"),
        NotificationKind.Assigned => ("Task baru ditugaskan", item.ActorName ?? "", $"menugaskan {item.TaskKey} ke Anda"),
        NotificationKind.Moved => ("Task dipindahkan", item.ActorName ?? "", item.FromName is { } from ? $"memindahkan {item.TaskKey} dari {from} ke Anda" : $"memindahkan {item.TaskKey} ke Anda"),
        NotificationKind.DueTomorrow => ("Tenggat besok", item.TaskKey, item.DueDate is { } due ? $"jatuh tempo besok, {ShortDate(due)}" : "jatuh tempo besok"),
        NotificationKind.Overdue => ("Terlambat", item.TaskKey, $"lewat tenggat {item.LateDays} hari"),
        _ => ("Notifikasi", "", item.TaskKey),
    };

    /// <summary>Baris keterangan di bawah kalimat: kutipan untuk mention, judul dan jalur proyek untuk yang lain.</summary>
    public static string Detail(NotificationItem item)
    {
        if (item.Kind == NotificationKind.Mention)
        {
            return $"“{item.Excerpt}”";
        }

        var detail = $"{item.TaskTitle} · {string.Join(" / ", item.Path)}";
        return item.Kind == NotificationKind.Assigned && item.StartDate is { } start ? $"{detail} · mulai {ShortDate(start)}" : detail;
    }

    public static EmailMessage Immediate(string to, string recipientName, NotificationItem item, string baseUrl)
    {
        var (label, who, text) = Sentence(item);
        var subject = $"{who} {text}";
        var link = TaskLink(baseUrl, item);
        var textBody = $"Halo {recipientName},\n\n{label}: {who} {text}.\n{Detail(item)}\n\nBuka task: {link}\n\n{Footer}\n";
        var html =
            $"<p>Halo {E(recipientName)},</p>"
            + $"<p style=\"margin:0 0 4px;color:#5b6472;font-size:13px\">{E(label)}</p>"
            + $"<p style=\"margin:0 0 4px\"><b>{E(who)}</b> {E(text)}</p>"
            + $"<p style=\"margin:0 0 16px;color:#5b6472\">{E(Detail(item))}</p>"
            + StatusLine(item)
            + $"<p><a href=\"{E(link)}\">Buka task</a></p>"
            + $"<p style=\"color:#5b6472;font-size:12px\">{E(Footer)}</p>";
        return new EmailMessage(to, subject, textBody, html) { Images = Icons([item]) };
    }

    public static EmailMessage Digest(string to, string recipientName, DateOnly today, IReadOnlyList<NotificationItem> items, string baseUrl)
    {
        var dueTomorrow = items.Where(i => i.Kind == NotificationKind.DueTomorrow).ToList();
        var overdue = items.Where(i => i.Kind == NotificationKind.Overdue).ToList();
        var parts = new List<string>();
        if (overdue.Count > 0)
        {
            parts.Add($"{overdue.Count} terlambat");
        }

        if (dueTomorrow.Count > 0)
        {
            parts.Add($"{dueTomorrow.Count} jatuh tempo besok");
        }

        var subject = $"Ringkasan task {ShortDate(today)}: {string.Join(", ", parts)}";
        var text = new System.Text.StringBuilder($"Halo {recipientName},\n\nTask Anda yang perlu perhatian hari ini:\n");
        var html = new System.Text.StringBuilder($"<p>Halo {E(recipientName)},</p><p>Task Anda yang perlu perhatian hari ini:</p>");
        foreach (var (title, group) in new[] { ("Terlambat", overdue), ("Tenggat besok", dueTomorrow) })
        {
            if (group.Count == 0)
            {
                continue;
            }

            text.Append(CultureInfo.InvariantCulture, $"\n{title}\n");
            html.Append(CultureInfo.InvariantCulture, $"<h3 style=\"margin:16px 0 8px;font-size:14px\">{E(title)}</h3><ul style=\"padding:0;list-style:none\">");
            foreach (var item in group)
            {
                var (_, who, sentence) = Sentence(item);
                var link = TaskLink(baseUrl, item);
                text.Append(CultureInfo.InvariantCulture, $"- {who} {sentence} ({StatusName(item.Status)}): {Detail(item)}\n  {link}\n");
                html.Append(CultureInfo.InvariantCulture, $"<li style=\"margin:0 0 12px\"><a href=\"{E(link)}\"><b>{E(who)}</b></a> {E(sentence)}<br>")
                    .Append(StatusInline(item.Status))
                    .Append(CultureInfo.InvariantCulture, $" <span style=\"color:#5b6472\">· {E(Detail(item))}</span></li>");
            }

            html.Append("</ul>");
        }

        text.Append(CultureInfo.InvariantCulture, $"\n{Footer}\n");
        html.Append(CultureInfo.InvariantCulture, $"<p style=\"color:#5b6472;font-size:12px\">{E(Footer)}</p>");
        return new EmailMessage(to, subject, text.ToString(), html.ToString()) { Images = Icons(items) };
    }

    private const string Footer = "Email ini dikirim otomatis oleh Ariadne. Notifikasi yang sama juga ada di lonceng di aplikasi.";

    private static string StatusLine(NotificationItem item) =>
        $"<p style=\"margin:0 0 16px\">{E(item.TaskTitle)} · {StatusInline(item.Status)}</p>";

    /// <summary>Status selalu ikon + teks, tidak pernah hanya warna (brand book).</summary>
    private static string StatusInline(WorkStatus status) =>
        $"<img src=\"cid:{IconName(status)}\" width=\"16\" height=\"16\" alt=\"\" style=\"vertical-align:-3px\"> {E(StatusName(status))}";

    public static string StatusName(WorkStatus status) => status switch
    {
        WorkStatus.NotStarted => "Not Started",
        WorkStatus.OnProgress => "On Progress",
        WorkStatus.Fixing => "Fixing",
        WorkStatus.Blocked => "Blocked",
        WorkStatus.OnHold => "On Hold",
        WorkStatus.OnRequest => "On Request",
        WorkStatus.Done => "Done",
        WorkStatus.Rutin => "Rutin",
        _ => status.ToString(),
    };

    private static string IconName(WorkStatus status) => status switch
    {
        WorkStatus.NotStarted => "status-not-started",
        WorkStatus.OnProgress => "status-progress",
        WorkStatus.Fixing => "status-fixing",
        WorkStatus.Blocked => "status-blocked",
        WorkStatus.OnHold => "status-hold",
        WorkStatus.OnRequest => "status-request",
        WorkStatus.Done => "status-done",
        _ => "status-routine",
    };

    private static List<EmailImage> Icons(IEnumerable<NotificationItem> items) =>
        [.. items.Select(i => IconName(i.Status)).Distinct().Select(name => new EmailImage(name, $"{name}.png", Png(name)))];

    private static byte[] Png(string name)
    {
        using var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream($"EmailIcons.{name}.png")
            ?? throw new InvalidOperationException($"Ikon email {name} tidak ada di assembly.");
        using var copy = new MemoryStream();
        stream.CopyTo(copy);
        return copy.ToArray();
    }

    private static string E(string value) => WebUtility.HtmlEncode(value);
}
