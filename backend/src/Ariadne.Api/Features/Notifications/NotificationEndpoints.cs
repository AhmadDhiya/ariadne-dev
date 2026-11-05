using System.Globalization;
using Ariadne.Api.Auth;
using Ariadne.Api.Domain;
using Ariadne.Api.Infrastructure.Clock;
using Ariadne.Api.Infrastructure.Data;
using Ariadne.Api.Infrastructure.Web;
using Microsoft.EntityFrameworkCore;

namespace Ariadne.Api.Features.Notifications;

/// <summary>
/// Lonceng dan halaman "Semua notifikasi". Setiap orang hanya pernah melihat notifikasinya sendiri, dan hanya yang
/// masih boleh ia lihat (NotificationQueries.VisibleTo). Notifikasi orang lain selalu 404.
/// </summary>
internal static class NotificationEndpoints
{
    private const int DefaultLimit = 20;
    private const int MaxLimit = 50;

    public static IEndpointRouteBuilder MapNotificationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/notifications");
        group.MapGet("/", List);
        group.MapGet("/unread-count", UnreadCount);
        group.MapPost("/{id:guid}/read", Read);
        group.MapPost("/read-all", ReadAll);
        return app;
    }

    private static async Task<IResult> List(string? filter, string? before, int? limit, HttpContext http, AccessService accessService, AppDbContext db, IClock clock, CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var take = Math.Clamp(limit ?? DefaultLimit, 1, MaxLimit);
        var visible = db.Notifications.AsNoTracking().VisibleTo(access);
        var query = (filter ?? "all") switch
        {
            "all" => visible,
            "unread" => visible.Where(n => n.ReadAt == null),
            "mentions" => visible.Where(n => n.Kind == NotificationKind.Mention),
            _ => throw new ValidationFailedException("filter", "Pilihan filter: all, unread, atau mentions."),
        };

        if (before is not null)
        {
            var (at, seq) = ParseCursor(before);
            query = query.Where(n => n.CreatedAt < at || (n.CreatedAt == at && n.Seq < seq));
        }

        var page = query.OrderByDescending(n => n.CreatedAt).ThenByDescending(n => n.Seq).Take(take + 1);
        var cursors = await page.Select(n => new { n.CreatedAt, n.Seq }).ToListAsync(ct);
        var items = await NotificationQueries.ItemsAsync(db, page.Take(take), ct);
        var next = cursors.Count > take ? Cursor(cursors[take - 1].CreatedAt, cursors[take - 1].Seq) : null;
        var unread = await visible.CountAsync(n => n.ReadAt == null, ct);
        return Results.Ok(new NotificationPage(items, unread, next, clock.Today));
    }

    private static async Task<IResult> UnreadCount(HttpContext http, AccessService accessService, AppDbContext db, CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var count = await db.Notifications.AsNoTracking().VisibleTo(access).CountAsync(n => n.ReadAt == null, ct);
        return Results.Ok(new UnreadCountResponse(count));
    }

    private static async Task<IResult> Read(Guid id, HttpContext http, AccessService accessService, AppDbContext db, IClock clock, CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var notification = await db.Notifications.VisibleTo(access).SingleOrDefaultAsync(n => n.Id == id, ct) ?? throw new NotFoundException();
        notification.ReadAt ??= clock.UtcNow;
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private static async Task<IResult> ReadAll(HttpContext http, AccessService accessService, AppDbContext db, IClock clock, CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var now = clock.UtcNow;
        var ids = await db.Notifications.AsNoTracking().VisibleTo(access).Where(n => n.ReadAt == null).Select(n => n.Id).ToListAsync(ct);
        if (ids.Count > 0)
        {
            await db.Notifications.Where(n => ids.Contains(n.Id) && n.ReadAt == null).ExecuteUpdateAsync(s => s.SetProperty(n => n.ReadAt, now), ct);
        }

        return Results.NoContent();
    }

    // Penanda halaman: waktu (tick UTC) dan nomor urut notifikasi terakhir di halaman sebelumnya
    private static string Cursor(DateTimeOffset at, long seq) =>
        string.Create(CultureInfo.InvariantCulture, $"{at.UtcTicks}-{seq}");

    private static (DateTimeOffset At, long Seq) ParseCursor(string value)
    {
        var parts = value.Split('-');
        if (parts.Length == 2
            && long.TryParse(parts[0], NumberStyles.None, CultureInfo.InvariantCulture, out var ticks)
            && long.TryParse(parts[1], NumberStyles.None, CultureInfo.InvariantCulture, out var seq)
            && ticks >= DateTimeOffset.MinValue.UtcTicks && ticks <= DateTimeOffset.MaxValue.UtcTicks)
        {
            return (new DateTimeOffset(ticks, TimeSpan.Zero), seq);
        }

        throw new ValidationFailedException("before", "Penanda halaman tidak valid.");
    }
}
