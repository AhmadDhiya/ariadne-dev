using System.Threading.Channels;

namespace Ariadne.Api.Infrastructure.Email;

/// <summary>
/// Antrean email keluar. Endpoint hanya memasukkan email ke antrean (instan) dan pengiriman SMTP berjalan di
/// latar belakang. Ini penting untuk keamanan: bila API menunggu SMTP hanya untuk email yang terdaftar,
/// lamanya respons membocorkan siapa saja yang punya akun (pedoman B9).
/// </summary>
public interface IEmailOutbox
{
    void Enqueue(EmailMessage message);
}

internal sealed class ChannelEmailOutbox : IEmailOutbox
{
    // Antrean berbatas: bila SMTP macet lama, email terlama tidak menumpuk tanpa batas di memori
    private readonly Channel<EmailMessage> _channel = Channel.CreateBounded<EmailMessage>(
        new BoundedChannelOptions(1000) { FullMode = BoundedChannelFullMode.DropOldest, SingleReader = true });

    public ChannelReader<EmailMessage> Reader => _channel.Reader;

    public void Enqueue(EmailMessage message) => _channel.Writer.TryWrite(message);
}

internal sealed class EmailDispatcher(ChannelEmailOutbox outbox, IAppEmailSender sender) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var message in outbox.Reader.ReadAllAsync(stoppingToken))
        {
            // Kegagalan sudah dicatat di sender; satu email gagal tidak menghentikan antrean
            await sender.SendAsync(message, stoppingToken);
        }
    }
}

internal static class EmailSetup
{
    public static IServiceCollection AddAriadneEmail(this IServiceCollection services, IConfiguration config)
    {
        services.Configure<EmailOptions>(config.GetSection("Email"));
        services.AddSingleton<IAppEmailSender, SmtpEmailSender>();
        services.AddSingleton<ChannelEmailOutbox>();
        services.AddSingleton<IEmailOutbox>(sp => sp.GetRequiredService<ChannelEmailOutbox>());
        services.AddHostedService<EmailDispatcher>();
        return services;
    }
}
