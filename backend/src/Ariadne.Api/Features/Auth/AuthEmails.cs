using System.Net;
using Ariadne.Api.Infrastructure.Email;

namespace Ariadne.Api.Features.Auth;

/// <summary>
/// Isi email akun. Semua nilai dari pengguna di-encode ke HTML (pedoman C5). Token ditaruh di bagian
/// "#" tautan: tidak ikut terkirim ke server atau tercatat di log akses.
/// </summary>
internal static class AuthEmails
{
    public static string ResetLink(string baseUrl, string email, string token) =>
        $"{baseUrl.TrimEnd('/')}/reset-password#email={Uri.EscapeDataString(email)}&token={Uri.EscapeDataString(token)}";

    public static EmailMessage ResetPassword(string toEmail, string displayName, string link) =>
        Build(
            toEmail,
            "Atur ulang password Ariadne",
            displayName,
            "Kami menerima permintaan untuk mengatur ulang password akun Ariadne Anda. Klik tautan di bawah untuk memilih password baru. Tautan berlaku 24 jam dan hanya bisa dipakai sekali.",
            "Atur ulang password",
            link,
            "Jika Anda tidak merasa memintanya, abaikan email ini; password Anda tidak berubah.");

    public static EmailMessage Welcome(string toEmail, string displayName, string link) =>
        Build(
            toEmail,
            "Selamat datang di Ariadne",
            displayName,
            "Akun Ariadne Anda sudah dibuat. Klik tautan di bawah untuk memilih password dan mulai memakainya. Tautan berlaku 24 jam; setelah itu Anda bisa meminta tautan baru lewat \"Lupa password?\" di halaman masuk.",
            "Pilih password",
            link,
            "Jika Anda tidak mengenal Ariadne, abaikan email ini.");

    private static EmailMessage Build(string to, string subject, string name, string intro, string action, string link, string outro)
    {
        var text = $"Halo {name},\n\n{intro}\n\n{action}: {link}\n\n{outro}\n";
        var html =
            $"<p>Halo {WebUtility.HtmlEncode(name)},</p>"
            + $"<p>{WebUtility.HtmlEncode(intro)}</p>"
            + $"<p><a href=\"{WebUtility.HtmlEncode(link)}\">{WebUtility.HtmlEncode(action)}</a></p>"
            + $"<p>{WebUtility.HtmlEncode(outro)}</p>";
        return new EmailMessage(to, subject, text, html);
    }
}
