using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace Ariadne.Api.Infrastructure.Email;

public sealed record EmailMessage(string To, string Subject, string TextBody, string HtmlBody);

/// <summary>
/// Pengirim email aplikasi. Dibuat sebagai interface supaya test bisa menangkap email (mis. tautan reset
/// password) tanpa SMTP sungguhan.
/// </summary>
public interface IAppEmailSender
{
    /// <summary>Mengirim email. Mengembalikan false bila gagal (sudah dicatat di log); tidak melempar.</summary>
    Task<bool> SendAsync(EmailMessage message, CancellationToken cancellationToken);
}

public sealed class EmailOptions
{
    public string Host { get; set; } = "localhost";

    public int Port { get; set; } = 10251;

    /// <summary>None (Mailpit lokal), StartTls, atau SslOnConnect; mengikuti nama enum MailKit.</summary>
    public string Security { get; set; } = "Auto";

    public string? Username { get; set; }

    public string? Password { get; set; }

    public string FromAddress { get; set; } = "ariadne@localhost";

    public string FromName { get; set; } = "Ariadne";
}

internal sealed partial class SmtpEmailSender(IOptions<EmailOptions> options, ILogger<SmtpEmailSender> logger) : IAppEmailSender
{
    public async Task<bool> SendAsync(EmailMessage message, CancellationToken cancellationToken)
    {
        var config = options.Value;
        try
        {
            var mime = new MimeMessage();
            mime.From.Add(new MailboxAddress(config.FromName, config.FromAddress));
            mime.To.Add(MailboxAddress.Parse(message.To));
            mime.Subject = message.Subject;
            mime.Body = new BodyBuilder { TextBody = message.TextBody, HtmlBody = message.HtmlBody }.ToMessageBody();

            using var client = new SmtpClient();
            var security = Enum.TryParse<SecureSocketOptions>(config.Security, ignoreCase: true, out var parsed)
                ? parsed
                : SecureSocketOptions.Auto;
            await client.ConnectAsync(config.Host, config.Port, security, cancellationToken);
            if (!string.IsNullOrEmpty(config.Username))
            {
                await client.AuthenticateAsync(config.Username, config.Password ?? "", cancellationToken);
            }

            await client.SendAsync(mime, cancellationToken);
            await client.DisconnectAsync(quit: true, cancellationToken);
            return true;
        }
#pragma warning disable CA1031 // Gagal kirim email tidak boleh menggagalkan aksi pengguna; dicatat lalu dilaporkan lewat nilai kembalian
        catch (Exception exception)
#pragma warning restore CA1031
        {
            // Hanya jenis kesalahan dan server tujuan; tanpa alamat penerima atau isi email (pedoman I5)
            LogSendFailed(logger, exception.GetType().Name, config.Host, config.Port);
            return false;
        }
    }

    [LoggerMessage(Level = LogLevel.Error, Message = "Email gagal dikirim ({ErrorType}) ke SMTP {Host}:{Port}")]
    private static partial void LogSendFailed(ILogger logger, string errorType, string host, int port);
}
