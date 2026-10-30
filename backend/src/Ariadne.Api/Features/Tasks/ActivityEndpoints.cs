using Ariadne.Api.Auth;
using Ariadne.Api.Domain;
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
        CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var task = await db.Tasks.AsNoTracking().SingleOrDefaultAsync(t => t.Id == id, ct) ?? throw new NotFoundException();
        var root = task.RootProjectId;
        access.EnsureCanViewProject(root); // yang tidak boleh melihat selalu mendapat 404, apa pun isi permintaannya

        var kind = Validate.Enum<ActivityKind>("kind", request.Kind, "Jenis");
        switch (kind)
        {
            case ActivityKind.Log:
                throw new ValidationFailedException("kind", "Log hanya dibuat otomatis oleh sistem.");
            case ActivityKind.Comment:
                access.EnsureCanComment(root);
                break;
            default: // Update dan Internal: hanya Pengelola dan Anggota proyek
                access.EnsureCanEditTasks(root);
                break;
        }

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
        await db.SaveOrConflictAsync("Entri tidak bisa disimpan karena bentrok. Coba lagi.", ct);

        var saved = await db.Activities.AsNoTracking().Where(a => a.Id == activity.Id).Select(Projection).SingleAsync(ct);
        var item = (await ToItemsAsync(db, root, [saved], ct))[0];
        return Results.Created($"/api/tasks/{id}/activities", item);
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
        DateTimeOffset CreatedAt);

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
        a.CreatedAt);

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
                r.CreatedAt)),
        ];
    }
}
