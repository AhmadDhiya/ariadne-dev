using Ariadne.Api.Auth;
using Ariadne.Api.Domain;
using Ariadne.Api.Features.Notifications;
using Ariadne.Api.Infrastructure.Clock;
using Ariadne.Api.Infrastructure.Data;
using Ariadne.Api.Infrastructure.Web;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Ariadne.Api.Features.Tasks;

/// <summary>
/// Timeline aktivitas sebuah task: update, komentar, catatan internal, dan log otomatis.
/// Catatan Internal TIDAK PERNAH keluar ke Tamu dari endpoint ini (docs/domain.md).
/// </summary>
internal static class ActivityEndpoints
{
    private const int DefaultPageSize = 30;
    private const int MaxPageSize = 100;
    private const int MaxBodyLength = 5000;
    private const int MaxMentions = 20;

    public static IEndpointRouteBuilder MapActivityEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/tasks/{id:guid}/activities");
        group.MapGet("", List);
        group.MapPost("", Create);
        group.MapPatch("/{activityId:guid}", Update);
        group.MapDelete("/{activityId:guid}", Delete);
        return app;
    }

    private static async Task<IResult> List(
        Guid id,
        [FromQuery] long? before,
        [FromQuery] int? limit,
        HttpContext http,
        AccessService accessService,
        AppDbContext db,
        CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var task = await db.Tasks.AsNoTracking().SingleOrDefaultAsync(t => t.Id == id, ct) ?? throw new NotFoundException();
        access.EnsureCanViewProject(task.RootProjectId);

        var size = limit ?? DefaultPageSize;
        if (size is < 1 or > MaxPageSize)
        {
            throw new ValidationFailedException("limit", $"Jumlah per halaman 1 sampai {MaxPageSize}.");
        }

        var query = db.Activities.AsNoTracking().Where(a => a.TaskId == id);
        if (!access.CanSeeInternal(task.RootProjectId))
        {
            query = query.Where(a => a.Kind != ActivityKind.Internal);
        }

        if (before is { } cursor)
        {
            query = query.Where(a => a.Seq < cursor);
        }

        var page = await query.OrderByDescending(a => a.Seq).Take(size + 1).Select(Projection).ToListAsync(ct);
        var more = page.Count > size;
        if (more)
        {
            page.RemoveAt(page.Count - 1);
        }

        var items = await ToItemsAsync(db, task.RootProjectId, page, ct);
        return Results.Ok(new ActivityPage(items, more ? page[^1].Seq : null));
    }

    private static async Task<IResult> Create(
        Guid id,
        CreateActivityRequest request,
        HttpContext http,
        AccessService accessService,
        AppDbContext db,
        IClock clock,
        Notifier notifier,
        CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var task = await db.Tasks.AsNoTracking().SingleOrDefaultAsync(t => t.Id == id, ct) ?? throw new NotFoundException();
        var root = task.RootProjectId;
        access.EnsureCanViewProject(root); // yang tidak boleh melihat selalu mendapat 404, apa pun isi permintaannya

        var kind = Validate.Enum<ActivityKind>("kind", request.Kind, "Jenis");
        if (kind == ActivityKind.Log)
        {
            throw new ValidationFailedException("kind", "Log hanya dibuat otomatis oleh sistem.");
        }

        EnsureCanWrite(access, root, kind);

        var body = Validate.Text("body", request.Body, MaxBodyLength, "Isi");
        var mentions = await CheckMentionsAsync(db, root, kind, body, request.MentionUserIds, ct);

        var activity = new Activity
        {
            Id = Guid.NewGuid(),
            TaskId = task.Id,
            RootProjectId = root,
            AuthorId = access.UserId,
            Kind = kind,
            Body = body,
            CreatedAt = clock.UtcNow,
        };
        foreach (var person in mentions)
        {
            activity.Mentions.Add(new Mention { ActivityId = activity.Id, UserId = person.Id, DisplayName = person.Name });
        }

        db.Activities.Add(activity);
        notifier.Mentioned(activity, mentions.Select(m => m.Id));
        await db.SaveOrConflictAsync("Entri tidak bisa disimpan karena bentrok. Coba lagi.", ct);
        await notifier.SendPendingAsync(ct);

        var saved = await db.Activities.AsNoTracking().Where(a => a.Id == activity.Id).Select(Projection).SingleAsync(ct);
        var item = (await ToItemsAsync(db, root, [saved], ct))[0];
        return Results.Created($"/api/tasks/{id}/activities", item);
    }

    private static async Task<IResult> Update(
        Guid id,
        Guid activityId,
        UpdateActivityRequest request,
        HttpContext http,
        AccessService accessService,
        AppDbContext db,
        IClock clock,
        Notifier notifier,
        CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var activity = await FindAsync(db, access, id, activityId, track: true, ct);
        var root = activity.RootProjectId;
        if (activity.AuthorId != access.UserId)
        {
            throw new ForbiddenException(); // hanya penulisnya yang boleh mengubah
        }

        EnsureCanWrite(access, root, activity.Kind);
        var body = Validate.Text("body", request.Body, MaxBodyLength, "Isi");
        var mentions = await CheckMentionsAsync(db, root, activity.Kind, body, request.MentionUserIds, ct);

        var wanted = mentions.Select(m => m.Id).ToHashSet();
        var unchanged = body == activity.Body && wanted.SetEquals(activity.Mentions.Select(m => m.UserId));
        if (!unchanged)
        {
            activity.Body = body;
            var removed = activity.Mentions.Where(m => !wanted.Contains(m.UserId)).Select(m => m.UserId).ToList();
            activity.Mentions.RemoveAll(m => !wanted.Contains(m.UserId));
            var added = mentions.Where(p => activity.Mentions.All(m => m.UserId != p.Id)).ToList();
            foreach (var person in added)
            {
                activity.Mentions.Add(new Mention { ActivityId = activity.Id, UserId = person.Id, DisplayName = person.Name });
            }

            // Yang baru ditandai mendapat notifikasi; yang tidak lagi ditandai kehilangan notifikasinya
            notifier.Mentioned(activity, added.Select(p => p.Id));
            activity.EditedAt = clock.UtcNow;
            await db.SaveOrConflictAsync("Entri tidak bisa disimpan karena bentrok. Coba lagi.", ct);
            await notifier.ForgetMentionsAsync(activity.Id, removed, ct);
            await notifier.SendPendingAsync(ct);
        }

        var saved = await db.Activities.AsNoTracking().Where(a => a.Id == activityId).Select(Projection).SingleAsync(ct);
        return Results.Ok((await ToItemsAsync(db, root, [saved], ct))[0]);
    }

    private static async Task<IResult> Delete(
        Guid id,
        Guid activityId,
        HttpContext http,
        AccessService accessService,
        AppDbContext db,
        IClock clock,
        Notifier notifier,
        CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var activity = await FindAsync(db, access, id, activityId, track: true, ct);
        var root = activity.RootProjectId;

        // Penulisnya, atau Pengelola proyek (menjaga ruang diskusi); anggota lain tidak boleh menghapus tulisan orang
        if (activity.AuthorId == access.UserId)
        {
            EnsureCanWrite(access, root, activity.Kind);
        }
        else if (access.RoleIn(root) != ProjectRole.Pengelola)
        {
            throw new ForbiddenException();
        }

        activity.DeletedAt = clock.UtcNow;
        await db.SaveOrConflictAsync("Entri tidak bisa dihapus karena bentrok. Coba lagi.", ct);
        await notifier.ForgetActivityAsync(activity.Id, ct);
        return Results.NoContent();
    }

    /// <summary>
    /// Entri yang boleh dilihat pemanggil, untuk diubah atau dihapus. Yang tidak boleh dilihat (task di proyek lain,
    /// catatan Internal bagi Tamu, entri task lain, Log) tidak dibedakan dari "tidak ada": 404.
    /// </summary>
    private static async Task<Activity> FindAsync(AppDbContext db, UserAccess access, Guid taskId, Guid activityId, bool track, CancellationToken ct)
    {
        var task = await db.Tasks.AsNoTracking().SingleOrDefaultAsync(t => t.Id == taskId, ct) ?? throw new NotFoundException();
        access.EnsureCanViewProject(task.RootProjectId);

        var query = track ? db.Activities.Include(a => a.Mentions) : db.Activities.AsNoTracking();
        var activity = await query.SingleOrDefaultAsync(a => a.Id == activityId && a.TaskId == taskId, ct) ?? throw new NotFoundException();
        if (activity.Kind == ActivityKind.Internal && !access.CanSeeInternal(task.RootProjectId))
        {
            throw new NotFoundException();
        }

        if (activity.Kind == ActivityKind.Log)
        {
            throw new ValidationFailedException("kind", "Catatan otomatis tidak bisa diubah atau dihapus.");
        }

        return activity;
    }

    /// <summary>Update dan Internal: Pengelola dan Anggota. Komentar biasa: semua anggota proyek termasuk Tamu.</summary>
    private static void EnsureCanWrite(UserAccess access, Guid root, ActivityKind kind)
    {
        if (kind == ActivityKind.Comment)
        {
            access.EnsureCanComment(root);
        }
        else
        {
            access.EnsureCanEditTasks(root);
        }
    }

    /// <summary>
    /// Orang yang ditandai harus anggota aktif proyek ini, "@Nama" harus benar-benar ada di teks, dan catatan Internal
    /// tidak boleh menandai Tamu (Tamu akan tahu ada catatan yang tidak boleh ia lihat).
    /// </summary>
    private static async Task<List<MentionedPerson>> CheckMentionsAsync(AppDbContext db, Guid root, ActivityKind kind, string body, IReadOnlyList<Guid>? requested, CancellationToken ct)
    {
        var ids = (requested ?? []).Distinct().ToList();
        if (ids.Count > MaxMentions)
        {
            throw new ValidationFailedException("mentionUserIds", $"Tandai paling banyak {MaxMentions} orang.");
        }

        if (ids.Count == 0)
        {
            return [];
        }

        var people = await db.ProjectMembers.AsNoTracking()
            .Where(m => m.ProjectId == root && ids.Contains(m.UserId) && m.User!.IsActive)
            .Select(m => new MentionedPerson(m.UserId, m.User!.DisplayName, m.Role))
            .ToListAsync(ct);
        if (people.Count != ids.Count)
        {
            throw new ValidationFailedException("mentionUserIds", "Yang ditandai harus anggota aktif proyek ini.");
        }

        if (kind == ActivityKind.Internal && people.Any(p => p.Role == ProjectRole.Tamu))
        {
            throw new ValidationFailedException("mentionUserIds", "Catatan internal tidak boleh menandai Tamu.");
        }

        if (people.Any(p => !body.Contains($"@{p.Name}", StringComparison.Ordinal)))
        {
            throw new ValidationFailedException("mentionUserIds", "Nama yang ditandai harus tertulis di teks sebagai @Nama.");
        }

        return people;
    }

    private sealed record MentionedPerson(Guid Id, string Name, ProjectRole Role);

    private sealed record ActivityRow(
        Guid Id,
        long Seq,
        ActivityKind Kind,
        Guid AuthorId,
        string AuthorName,
        string? Body,
        List<MentionItem> Mentions,
        LogKind? LogKind,
        ActivityData? Data,
        DateTimeOffset CreatedAt,
        DateTimeOffset? EditedAt);

    private static readonly System.Linq.Expressions.Expression<Func<Activity, ActivityRow>> Projection = a => new ActivityRow(
        a.Id,
        a.Seq,
        a.Kind,
        a.AuthorId,
        a.Author!.DisplayName,
        a.Body,
        a.Mentions.Select(m => new MentionItem(m.UserId, m.DisplayName)).ToList(),
        a.LogKind,
        a.Data,
        a.CreatedAt,
        a.EditedAt);

    private static async Task<List<ActivityItem>> ToItemsAsync(AppDbContext db, Guid root, List<ActivityRow> rows, CancellationToken ct)
    {
        var authorIds = rows.Select(r => r.AuthorId).Distinct().ToList();
        var guests = (await db.ProjectMembers.AsNoTracking()
                .Where(m => m.ProjectId == root && m.Role == ProjectRole.Tamu && authorIds.Contains(m.UserId))
                .Select(m => m.UserId)
                .ToListAsync(ct))
            .ToHashSet();

        return
        [
            .. rows.Select(r => new ActivityItem(
                r.Id,
                r.Kind,
                r.AuthorId,
                r.AuthorName,
                guests.Contains(r.AuthorId),
                r.Body,
                [.. r.Mentions.OrderBy(m => m.Name, StringComparer.Ordinal)],
                r.LogKind,
                r.Data,
                r.CreatedAt,
                r.EditedAt)),
        ];
    }
}
