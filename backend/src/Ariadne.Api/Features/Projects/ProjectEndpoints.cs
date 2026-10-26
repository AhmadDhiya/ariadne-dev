using System.Text.RegularExpressions;
using Ariadne.Api.Auth;
using Ariadne.Api.Domain;
using Ariadne.Api.Infrastructure.Clock;
using Ariadne.Api.Infrastructure.Data;
using Ariadne.Api.Infrastructure.Web;
using Microsoft.EntityFrameworkCore;

namespace Ariadne.Api.Features.Projects;

internal static partial class ProjectEndpoints
{
    public static IEndpointRouteBuilder MapProjectEndpoints(this IEndpointRouteBuilder app)
    {
        var projects = app.MapGroup("/api/projects");
        projects.MapGet("/tree", Tree);
        projects.MapPost("", CreateRoot);
        projects.MapGet("/{id:guid}", Get);
        projects.MapPost("/{id:guid}/children", CreateChild);
        projects.MapPatch("/{id:guid}", Update);
        projects.MapPost("/{id:guid}/archive", Archive);

        var members = projects.MapGroup("/{id:guid}/members");
        members.MapGet("", ListMembers);
        members.MapPost("", AddMember);
        members.MapPatch("/{userId:guid}", ChangeMemberRole);
        members.MapDelete("/{userId:guid}", RemoveMember);
        return app;
    }

    [GeneratedRegex("^[A-Z][A-Z0-9]{1,5}$")]
    private static partial Regex CodePattern();

    private static async Task<IResult> Tree(HttpContext http, AccessService accessService, AppDbContext db, CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);

        var query = db.Projects.AsNoTracking().Where(p => p.ArchivedAt == null);
        if (!access.IsAdmin)
        {
            var roots = access.Projects.Keys.ToList();
            query = query.Where(p => roots.Contains(p.RootId));
        }

        var nodes = await query
            .OrderBy(p => p.Depth).ThenBy(p => p.SortOrder).ThenBy(p => p.Name)
            .Select(p => new ProjectNode(p.Id, p.ParentId, p.RootId, p.Depth, p.Name, p.Code, p.SortOrder))
            .ToListAsync(ct);
        return Results.Ok(nodes);
    }

    private static async Task<IResult> Get(Guid id, HttpContext http, AccessService accessService, AppDbContext db, CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var project = await FindAsync(id, db, ct);
        access.EnsureCanViewProject(project.RootId);

        var family = await db.Projects.AsNoTracking().Where(p => p.RootId == project.RootId).ToDictionaryAsync(p => p.Id, ct);
        var path = new List<ProjectCrumb>();
        for (var current = project; ; current = family[current.ParentId.Value])
        {
            path.Insert(0, new ProjectCrumb(current.Id, current.Name));
            if (current.ParentId is null)
            {
                break;
            }
        }

        var members = await db.ProjectMembers.AsNoTracking()
            .Where(m => m.ProjectId == project.RootId)
            .Select(m => new { m.Role, m.AddedAt, m.User!.DisplayName })
            .ToListAsync(ct);
        var counts = new ProjectMemberCounts(
            members.Count,
            members.Count(m => m.Role == ProjectRole.Pengelola),
            members.Count(m => m.Role == ProjectRole.Anggota),
            members.Count(m => m.Role == ProjectRole.Tamu));
        var names = members.OrderBy(m => m.Role).ThenBy(m => m.AddedAt).ThenBy(m => m.DisplayName, StringComparer.Ordinal).Select(m => m.DisplayName).ToList();

        return Results.Ok(new ProjectDetail(
            project.Id,
            project.ParentId,
            project.RootId,
            project.Depth,
            project.Name,
            project.Code ?? family[project.RootId].Code,
            path,
            access.RoleIn(project.RootId),
            access.CanManageProject(project.RootId),
            counts,
            names));
    }

    private static async Task<IResult> CreateRoot(CreateProjectRequest request, HttpContext http, AccessService accessService, AppDbContext db, IClock clock, CancellationToken ct)
    {
        (await accessService.CurrentAsync(http.User, ct)).EnsureAdmin();
        var name = Validate.Text("name", request.Name, 100, "Nama proyek");
        var code = (request.Code ?? "").Trim().ToUpperInvariant();
        if (!CodePattern().IsMatch(code))
        {
            throw new ValidationFailedException("code", "Kode proyek 2–6 karakter: huruf besar dan angka, diawali huruf (mis. SEN).");
        }

        var id = Guid.NewGuid();
        var nextOrder = await db.Projects.Where(p => p.Depth == 0).Select(p => (int?)p.SortOrder).MaxAsync(ct) ?? 0;
        db.Projects.Add(new Project
        {
            Id = id,
            RootId = id, // proyek root adalah root dirinya sendiri
            Depth = 0,
            Name = name,
            Code = code,
            SortOrder = nextOrder + 1,
            CreatedAt = clock.UtcNow,
        });
        await db.SaveOrConflictAsync("Kode proyek sudah dipakai.", ct);
        return Results.Created($"/api/projects/{id}", new ProjectNode(id, null, id, 0, name, code, nextOrder + 1));
    }

    private static async Task<IResult> CreateChild(Guid id, CreateSubProjectRequest request, HttpContext http, AccessService accessService, AppDbContext db, IClock clock, CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var parent = await FindAsync(id, db, ct);
        access.EnsureCanManageProject(parent.RootId);
        var name = Validate.Text("name", request.Name, 100, "Nama sub-proyek");

        if (parent.ArchivedAt is not null)
        {
            throw new ValidationFailedException("name", "Proyek yang diarsipkan tidak bisa diberi sub-proyek.");
        }

        if (parent.Depth >= Project.MaxDepth)
        {
            throw new ValidationFailedException("name", "Kedalaman proyek maksimal 3 level (proyek, sub-proyek, sub-sub-proyek).");
        }

        var siblingMax = await db.Projects.Where(p => p.ParentId == parent.Id).Select(p => (int?)p.SortOrder).MaxAsync(ct) ?? 0;
        var child = new Project
        {
            Id = Guid.NewGuid(),
            ParentId = parent.Id,
            RootId = parent.RootId,
            Depth = parent.Depth + 1,
            Name = name,
            SortOrder = siblingMax + 1,
            CreatedAt = clock.UtcNow,
        };
        db.Projects.Add(child);
        await db.SaveChangesAsync(ct);
        return Results.Created($"/api/projects/{child.Id}", new ProjectNode(child.Id, child.ParentId, child.RootId, child.Depth, child.Name, null, child.SortOrder));
    }

    private static async Task<IResult> Update(Guid id, UpdateProjectRequest request, HttpContext http, AccessService accessService, AppDbContext db, CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var project = await db.Projects.SingleOrDefaultAsync(p => p.Id == id, ct) ?? throw new NotFoundException();
        access.EnsureCanManageProject(project.RootId);

        if (request.Name is not null)
        {
            project.Name = Validate.Text("name", request.Name, 100, "Nama proyek");
        }

        if (request.SortOrder is { } order)
        {
            project.SortOrder = order;
        }

        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private static async Task<IResult> Archive(Guid id, HttpContext http, AccessService accessService, AppDbContext db, IClock clock, CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var project = await FindAsync(id, db, ct);
        access.EnsureCanManageProject(project.RootId);

        // Mengarsipkan proyek ikut mengarsipkan seluruh sub-proyeknya
        var family = await db.Projects.Where(p => p.RootId == project.RootId).ToListAsync(ct);
        var subtree = new HashSet<Guid> { project.Id };
        bool grew;
        do
        {
            var before = subtree.Count;
            foreach (var p in family.Where(p => p.ParentId is { } parentId && subtree.Contains(parentId)))
            {
                subtree.Add(p.Id);
            }

            grew = subtree.Count > before;
        }
        while (grew);

        foreach (var p in family.Where(p => subtree.Contains(p.Id) && p.ArchivedAt is null))
        {
            p.ArchivedAt = clock.UtcNow;
        }

        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    // ---------- anggota proyek (berlaku untuk proyek root dan seluruh sub-proyeknya) ----------

    private static async Task<IResult> ListMembers(Guid id, HttpContext http, AccessService accessService, AppDbContext db, CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var project = await FindAsync(id, db, ct);
        access.EnsureCanViewProject(project.RootId);

        // Tamu tidak melihat email orang lain (pedoman B6)
        var seesEmails = access.IsAdmin || access.RoleIn(project.RootId) != ProjectRole.Tamu;
        var members = await db.ProjectMembers.AsNoTracking()
            .Where(m => m.ProjectId == project.RootId)
            .Select(m => new { m.UserId, m.User!.DisplayName, m.User.Email, m.Role, m.AddedAt })
            .ToListAsync(ct);

        var items = members
            .OrderBy(m => m.Role).ThenBy(m => m.AddedAt).ThenBy(m => m.DisplayName, StringComparer.Ordinal)
            .Select(m => new ProjectMemberItem(m.UserId, m.DisplayName, seesEmails ? m.Email : null, m.Role, m.Role == ProjectRole.Tamu, "Aktif", m.AddedAt));
        return Results.Ok(items);
    }

    private static async Task<IResult> AddMember(Guid id, AddProjectMemberRequest request, HttpContext http, AccessService accessService, AppDbContext db, IClock clock, CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var project = await FindAsync(id, db, ct);
        access.EnsureCanManageProject(project.RootId);
        var role = Validate.Enum<ProjectRole>("role", request.Role, "Peran");

        if (!await db.Users.AnyAsync(u => u.Id == request.UserId && u.IsActive, ct))
        {
            throw new ValidationFailedException("userId", "Pengguna tidak ditemukan.");
        }

        db.ProjectMembers.Add(new ProjectMember { ProjectId = project.RootId, UserId = request.UserId, Role = role, AddedAt = clock.UtcNow });
        await db.SaveOrConflictAsync("Orang ini sudah menjadi anggota proyek.", ct);
        return Results.NoContent();
    }

    private static async Task<IResult> ChangeMemberRole(Guid id, Guid userId, UpdateProjectMemberRequest request, HttpContext http, AccessService accessService, AppDbContext db, CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var project = await FindAsync(id, db, ct);
        access.EnsureCanManageProject(project.RootId);
        var role = Validate.Enum<ProjectRole>("role", request.Role, "Peran");

        var member = await db.ProjectMembers.SingleOrDefaultAsync(m => m.ProjectId == project.RootId && m.UserId == userId, ct) ?? throw new NotFoundException();
        member.Role = role;
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private static async Task<IResult> RemoveMember(Guid id, Guid userId, HttpContext http, AccessService accessService, AppDbContext db, CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var project = await FindAsync(id, db, ct);
        access.EnsureCanManageProject(project.RootId);

        var member = await db.ProjectMembers.SingleOrDefaultAsync(m => m.ProjectId == project.RootId && m.UserId == userId, ct) ?? throw new NotFoundException();
        db.ProjectMembers.Remove(member);
        await db.SaveChangesAsync(ct);
        return Results.NoContent();
    }

    private static async Task<Project> FindAsync(Guid id, AppDbContext db, CancellationToken ct) =>
        await db.Projects.AsNoTracking().SingleOrDefaultAsync(p => p.Id == id, ct) ?? throw new NotFoundException();
}
