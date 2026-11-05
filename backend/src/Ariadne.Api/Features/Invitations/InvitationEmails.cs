using System.Net;
using Ariadne.Api.Domain;
using Ariadne.Api.Infrastructure.Email;

namespace Ariadne.Api.Features.Invitations;

/// <summary>
/// Isi email undangan. Semua nilai dari pengguna (nama, nama proyek, pesan) di-encode ke HTML (pedoman C5).
/// Token ditaruh di bagian "#" tautan supaya tidak terkirim ke server atau tercatat di log akses.
/// </summary>
internal static class InvitationEmails
{
    public static string AcceptLink(string baseUrl, string token) =>
        $"{baseUrl.TrimEnd('/')}/undangan#token={Uri.EscapeDataString(token)}";

    public static string ProjectLink(string baseUrl, Guid projectId) =>
        $"{baseUrl.TrimEnd('/')}/proyek/{projectId}/tabel";

    public static EmailMessage Invite(string to, string inviter, string project, ProjectRole role, string? message, string link) =>
        Build(
            to,
            $"Undangan ke {project} di Ariadne",
            $"{inviter} mengundang Anda ke proyek {project} di Ariadne sebagai {role}.",
            message,
            $"Klik tautan di bawah untuk membuat nama dan password, lalu buka proyeknya. Tautan berlaku {Invitation.Lifetime.Days} hari dan hanya bisa dipakai sekali.",
            "Terima undangan",
            link,
            "Jika Anda tidak mengenal pengirimnya, abaikan email ini.");

    public static EmailMessage Added(string to, string inviter, string project, ProjectRole role, string? message, string link) =>
        Build(
            to,
            $"Anda ditambahkan ke {project}",
            $"{inviter} menambahkan Anda ke proyek {project} di Ariadne sebagai {role}.",
            message,
            "Masuk dengan akun Ariadne Anda seperti biasa untuk membukanya.",
            "Buka proyek",
            link,
            "");

    private static EmailMessage Build(string to, string subject, string intro, string? quote, string body, string action, string link, string outro)
    {
        var text = $"Halo,\n\n{intro}\n\n"
            + (quote is null ? "" : $"Pesan: \"{quote}\"\n\n")
            + $"{body}\n\n{action}: {link}\n"
            + (outro.Length > 0 ? $"\n{outro}\n" : "");
        var html =
            "<p>Halo,</p>"
            + $"<p>{WebUtility.HtmlEncode(intro)}</p>"
            + (quote is null ? "" : $"<blockquote>{WebUtility.HtmlEncode(quote)}</blockquote>")
            + $"<p>{WebUtility.HtmlEncode(body)}</p>"
            + $"<p><a href=\"{WebUtility.HtmlEncode(link)}\">{WebUtility.HtmlEncode(action)}</a></p>"
            + (outro.Length > 0 ? $"<p>{WebUtility.HtmlEncode(outro)}</p>" : "");
        return new EmailMessage(to, subject, text, html);
    }
}
