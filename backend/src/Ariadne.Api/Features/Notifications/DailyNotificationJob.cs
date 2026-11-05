using System.Globalization;
using Ariadne.Api.Domain;
using Ariadne.Api.Infrastructure.Clock;
using Ariadne.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Ariadne.Api.Features.Notifications;

/// <summary>
/// Job harian pukul 07.00 WIB (docs/domain.md): notifikasi "tenggat besok" dan "terlambat" untuk setiap PIC, lalu satu
/// email ringkasan per orang. Aman dijalankan berkali-kali di hari yang sama: notifikasi punya kunci pencegah dobel
/// (unik per penerima) dan email hanya untuk notifikasi yang belum pernah dikirim. Dua job yang berjalan bersamaan
/// (mis. dua salinan API) antre lewat kunci di database.
/// </summary>
internal sealed class DailyNotificationJob(AppDbContext db, IClock clock, Notifier notifier)
{
    /// <summary>Angka sembarang yang tetap: nama kunci pg_advisory_xact_lock untuk job ini.</summary>
    private const long LockKey = 7_000_928;

    public sealed record Result(int Created, int Emailed);

    /// <summary>Kunci pencegah dobel: satu notifikasi per jenis, per task, per hari, per penerima.</summary>
    public static string DedupeKey(NotificationKind kind, Guid taskId, DateOnly day) =>
        string.Create(CultureInfo.InvariantCulture, $"{kind}:{taskId:N}:{day:yyyy-MM-dd}");

    public async Task<Result> RunAsync(CancellationToken ct)
    {
        var today = clock.Today;
        var tomorrow = today.AddDays(1);
        var now = clock.UtcNow;

        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        await db.Database.ExecuteSqlAsync($"SELECT pg_advisory_xact_lock({LockKey})", ct);

        // PIC aktif yang masih anggota proyeknya, task belum Done (Rutin tidak punya tenggat), proyek tidak diarsipkan
        var due = await db.TaskAssignees.AsNoTracking()
            .Where(a => a.User!.IsActive
                && a.Task!.Project!.ArchivedAt == null
                && a.Task.Status != WorkStatus.Done
                && a.Task.Status != WorkStatus.Rutin
                && a.Task.DueDate != null
                && a.Task.DueDate <= tomorrow
                && a.Task.DueDate != today
                && db.ProjectMembers.Any(m => m.ProjectId == a.Task.RootProjectId && m.UserId == a.UserId))
            .Select(a => new { a.UserId, a.TaskId, a.Task!.RootProjectId, DueDate = a.Task.DueDate!.Value, a.Task.Status })
            .ToListAsync(ct);

        var wanted = due.Select(d =>
        {
            var kind = d.DueDate == tomorrow ? NotificationKind.DueTomorrow : NotificationKind.Overdue;
            return new Notification
            {
                Id = Guid.NewGuid(),
                RecipientId = d.UserId,
                Kind = kind,
                TaskId = d.TaskId,
                RootProjectId = d.RootProjectId,
                LateDays = TaskRules.LateDays(d.DueDate, d.Status, today),
                CreatedAt = now,
                DedupeKey = DedupeKey(kind, d.TaskId, today),
            };
        }).ToList();

        var keys = wanted.Select(w => w.DedupeKey).ToList();
        var existing = (await db.Notifications.IgnoreQueryFilters().AsNoTracking()
            .Where(n => n.DedupeKey != null && keys.Contains(n.DedupeKey))
            .Select(n => new { n.RecipientId, n.DedupeKey })
            .ToListAsync(ct))
            .Select(n => (n.RecipientId, n.DedupeKey))
            .ToHashSet();
        var created = wanted.Where(w => !existing.Contains((w.RecipientId, w.DedupeKey))).ToList();
        db.Notifications.AddRange(created);
        await db.SaveChangesAsync(ct);

        // Ringkasan email: notifikasi job hari ini yang belum pernah dikirim (termasuk dari jalannya job sebelumnya yang
        // berhenti sebelum sempat mengirim)
        var suffix = string.Create(CultureInfo.InvariantCulture, $":{today:yyyy-MM-dd}");
        var unsent = await db.Notifications.AsNoTracking()
            .Where(n => (n.Kind == NotificationKind.DueTomorrow || n.Kind == NotificationKind.Overdue)
                && n.EmailedAt == null
                && n.DedupeKey != null
                && n.DedupeKey.EndsWith(suffix))
            .Select(n => n.Id)
            .ToListAsync(ct);
        var deliveries = await notifier.PrepareAsync(unsent, digest: true, ct);

        // Email baru masuk antrean setelah tanda "sudah dikirim" tersimpan: job yang gagal di tengah tidak mengirim dobel
        await transaction.CommitAsync(ct);
        await notifier.SendAsync(deliveries, ct);
        return new Result(created.Count, deliveries.Sum(d => d.Items.Count));
    }
}

/// <summary>
/// Menjalankan DailyNotificationJob setiap hari pukul 07.00 WIB, dan sekali saat API menyala bila sudah lewat 07.00
/// (supaya restart pagi hari tidak melewatkan satu hari; dobel dicegah oleh job itu sendiri). Bisa dimatikan dengan
/// Notifications:DailyJob=false (dipakai test, yang menjalankan job secara langsung).
/// </summary>
internal sealed partial class DailyNotificationService(IServiceScopeFactory scopes, IClock clock, TimeProvider time, ILogger<DailyNotificationService> logger) : BackgroundService
{
    public static readonly TimeOnly RunAt = new(7, 0);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (LocalTime() >= RunAt)
        {
            await RunOnceAsync(stoppingToken);
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            var wait = RunAt.ToTimeSpan() - LocalTime().ToTimeSpan();
            if (wait <= TimeSpan.Zero)
            {
                wait += TimeSpan.FromDays(1);
            }

            await Task.Delay(wait, time, stoppingToken);
            await RunOnceAsync(stoppingToken);
        }
    }

    private TimeOnly LocalTime() => TimeOnly.FromDateTime(TimeZoneInfo.ConvertTime(clock.UtcNow, clock.TimeZone).DateTime);

    private async Task RunOnceAsync(CancellationToken ct)
    {
        try
        {
            await using var scope = scopes.CreateAsyncScope();
            var result = await scope.ServiceProvider.GetRequiredService<DailyNotificationJob>().RunAsync(ct);
            LogRan(logger, result.Created, result.Emailed);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            // API sedang berhenti
        }
#pragma warning disable CA1031 // Job gagal (mis. database sesaat tidak terjangkau) tidak boleh mematikan API; dicoba lagi besok atau saat restart
        catch (Exception exception)
#pragma warning restore CA1031
        {
            LogFailed(logger, exception.GetType().Name);
        }
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Notifikasi harian: {Created} dibuat, {Emailed} dikirim lewat email")]
    private static partial void LogRan(ILogger logger, int created, int emailed);

    [LoggerMessage(Level = LogLevel.Error, Message = "Notifikasi harian gagal ({ErrorType})")]
    private static partial void LogFailed(ILogger logger, string errorType);
}

internal static class NotificationSetup
{
    public static IServiceCollection AddAriadneNotifications(this IServiceCollection services, IConfiguration config)
    {
        services.AddScoped<Notifier>();
        services.AddScoped<DailyNotificationJob>();
        services.AddScoped<INotificationChannel, EmailNotificationChannel>();
        if (config.GetValue("Notifications:DailyJob", defaultValue: true))
        {
            services.AddHostedService<DailyNotificationService>();
        }

        return services;
    }
}
