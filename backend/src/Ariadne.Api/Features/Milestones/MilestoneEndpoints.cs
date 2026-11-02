using Ariadne.Api.Auth;
using Ariadne.Api.Domain;
using Ariadne.Api.Features.Tasks;
using Ariadne.Api.Infrastructure.Clock;
using Ariadne.Api.Infrastructure.Data;
using Ariadne.Api.Infrastructure.Web;
using Microsoft.EntityFrameworkCore;

namespace Ariadne.Api.Features.Milestones;

/// <summary>Milestone yang ditampilkan: jalur proyeknya ("Sentul / SLMS") ikut supaya daftar tidak perlu mencari nama proyek.</summary>
public sealed record MilestoneItem(Guid Id, Guid ProjectId, IReadOnlyList<string> Path, string Name, DateOnly Date, bool IsDone);

public sealed record CreateMilestoneRequest(string? Name, DateOnly? Date);

/// <summary>Yang null = tidak diubah. ProjectId boleh dipindah ke sub-proyek lain di proyek root yang sama.</summary>
public sealed record UpdateMilestoneRequest(string? Name, DateOnly? Date, bool? IsDone, Guid? ProjectId);

/// <summary>
/// Milestone proyek: semua anggota (termasuk Tamu) melihat; hanya Pengelola proyek dan Admin yang membuat, mengubah, dan
/// menghapus (docs/domain.md, "Kelola proyek, sub-proyek, milestone"). Dihapus = benar-benar dihapus; tidak ada riwayat terkait.
/// </summary>
internal static class MilestoneEndpoints
{
    public static IEndpointRouteBuilder MapMilestoneEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/projects/{id:guid}/milestones", List);
        app.MapPost("/api/projects/{id:guid}/milestones", Create);
        var group = app.MapGroup("/api/milestones");
        group.MapPatch("/{id:guid}", Update);
        group.MapDelete("/{id:guid}", Delete);
        return app;
    }

    private static async Task<IResult> List(Guid id, HttpContext http, AccessService accessService, AppDbContext db, CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var project = await ActiveProjectAsync(db, id, ct);
        access.EnsureCanViewProject(project.RootId);

        var subtree = await SubtreeAsync(db, project, ct);
        var milestones = await db.Milestones.AsNoTracking()
            .Where(m => subtree.Contains(m.ProjectId))
            .OrderBy(m => m.Date)
            .ThenBy(m => m.Name)
            .ToListAsync(ct);
        return Results.Ok(await ItemsAsync(db, milestones, ct));
    }

    private static async Task<IResult> Create(Guid id, CreateMilestoneRequest request, HttpContext http, AccessService accessService, AppDbContext db, IClock clock, CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var project = await ActiveProjectAsync(db, id, ct);
        access.EnsureCanManageProject(project.RootId);

        var milestone = new Milestone
        {
            Id = Guid.NewGuid(),
            ProjectId = project.Id,
            RootProjectId = project.RootId,
            Name = Validate.Text("name", request.Name, 100, "Nama milestone"),
            Date = CheckDate(request.Date),
            CreatedAt = clock.UtcNow,
        };
        db.Milestones.Add(milestone);
        await db.SaveChangesAsync(ct);
        return Results.Created($"/api/milestones/{milestone.Id}", (await ItemsAsync(db, [milestone], ct))[0]);
    }

    private static async Task<IResult> Update(Guid id, UpdateMilestoneRequest request, HttpContext http, AccessService accessService, AppDbContext db, CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var milestone = await FindAsync(db, id, ct);
        access.EnsureCanManageProject(milestone.RootProjectId);

        if (request.Name is not null)
        {
            milestone.Name = Validate.Text("name", request.Name, 100, "Nama milestone");
        }

        if (request.Date is not null)
        {
            milestone.Date = CheckDate(request.Date);
        }

        if (request.IsDone is { } done)
        {
            milestone.IsDone = done;
        }

        if (request.ProjectId is { } target && target != milestone.ProjectId)
        {
            var project = await db.Projects.AsNoTracking().SingleOrDefaultAsync(p => p.Id == target && p.RootId == milestone.RootProjectId && p.ArchivedAt == null, ct)
                ?? throw new ValidationFailedException("projectId", "Sub-proyek tujuan tidak ditemukan di proyek ini.");
            milestone.ProjectId = project.Id;
        }

        await db.SaveChangesAsync(ct);
        return Results.Ok((await ItemsAsync(db, [milestone], ct))[0]);
    }

    private static async Task<IResult> Delete(Guid id, HttpContext http, AccessService accessService, AppDbContext db, CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var milestone = await FindAsync(db, id, ct);
        access.EnsureCanManageProject(milestone.RootProjectId);

        db.Milestones.Remove(milestone);
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    /// <summary>Milestone di proyek yang sudah diarsipkan dianggap tidak ada (404), seperti task-nya.</summary>
    private static async Task<Milestone> FindAsync(AppDbContext db, Guid id, CancellationToken ct)
    {
        var milestone = await db.Milestones.SingleOrDefaultAsync(m => m.Id == id, ct) ?? throw new NotFoundException();
        if (await db.Projects.AnyAsync(p => p.Id == milestone.ProjectId && p.ArchivedAt != null, ct))
        {
            throw new NotFoundException();
        }

        return milestone;
    }

    private static DateOnly CheckDate(DateOnly? date)
    {
        if (date is not { } value)
        {
            throw new ValidationFailedException("date", "Tanggal wajib diisi.");
        }

        if (value < new DateOnly(2000, 1, 1) || value > new DateOnly(2100, 12, 31))
        {
            throw new ValidationFailedException("date", "Tanggal tidak masuk akal.");
        }

        return value;
    }

    private static async Task<Project> ActiveProjectAsync(AppDbContext db, Guid id, CancellationToken ct) =>
        await db.Projects.AsNoTracking().SingleOrDefaultAsync(p => p.Id == id && p.ArchivedAt == null, ct) ?? throw new NotFoundException();

    /// <summary>Id proyek ini beserta semua sub-proyeknya yang belum diarsipkan.</summary>
    public static async Task<HashSet<Guid>> SubtreeAsync(AppDbContext db, Project project, CancellationToken ct)
    {
        var family = await db.Projects.AsNoTracking()
            .Where(p => p.RootId == project.RootId && p.ArchivedAt == null)
            .Select(p => new { p.Id, p.ParentId })
            .ToListAsync(ct);
        return TaskQueries.Subtree(family.Select(p => (p.Id, p.ParentId)), project.Id);
    }

    /// <summary>Mengubah entitas menjadi tampilan dengan jalur proyek (satu query nama proyek untuk semuanya).</summary>
    public static async Task<List<MilestoneItem>> ItemsAsync(AppDbContext db, IReadOnlyCollection<Milestone> milestones, CancellationToken ct)
    {
        if (milestones.Count == 0)
        {
            return [];
        }

        var roots = milestones.Select(m => m.RootProjectId).Distinct().ToList();
        var family = (await db.Projects.AsNoTracking().Where(p => roots.Contains(p.RootId)).Select(p => new { p.Id, p.ParentId, p.Name }).ToListAsync(ct)).ToDictionary(p => p.Id);

        List<string> PathOf(Guid projectId)
        {
            var path = new List<string>();
            for (Guid? at = projectId; at is { } id && family.TryGetValue(id, out var node); at = node.ParentId)
            {
                path.Insert(0, node.Name);
            }

            return path;
        }

        return [.. milestones.Select(m => new MilestoneItem(m.Id, m.ProjectId, PathOf(m.ProjectId), m.Name, m.Date, m.IsDone))];
    }
}
