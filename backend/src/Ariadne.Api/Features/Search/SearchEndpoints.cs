using System.Text.RegularExpressions;
using Ariadne.Api.Auth;
using Ariadne.Api.Domain;
using Ariadne.Api.Infrastructure.Data;
using Ariadne.Api.Infrastructure.Web;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Ariadne.Api.Features.Search;

public sealed record SearchTask(Guid Id, string Key, string Title, WorkStatus Status, Guid ProjectId, string Path);

public sealed record SearchProject(Guid Id, string Name, string Path);

/// <summary>Orang beserta satu proyek yang sama-sama mereka ikuti (untuk membuka tabel yang disaring ke orang itu). Tanpa email.</summary>
public sealed record SearchPerson(Guid Id, string Name, Guid ProjectId, string ProjectName);

public sealed record SearchResults(IReadOnlyList<SearchTask> Tasks, IReadOnlyList<SearchProject> Projects, IReadOnlyList<SearchPerson> People);

/// <summary>
/// Pencarian global di topbar: task, proyek, dan orang. Hanya yang boleh dilihat pemanggil: task dan proyek dari proyek
/// yang ia ikuti (Admin: semua), orang hanya rekan di proyek yang sama (Admin: siapa pun). Tamu tidak mencari orang.
/// </summary>
internal static partial class SearchEndpoints
{
    private const int MaxResults = 6;
    private const int MaxQueryLength = 100;

    [GeneratedRegex(@"^(?:([A-Za-z][A-Za-z0-9]{1,5})-)?(\d{1,9})$")]
    private static partial Regex KeyPattern();

    public static IEndpointRouteBuilder MapSearchEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/search", Search);
        return app;
    }

    private static async Task<IResult> Search([FromQuery] string? q, HttpContext http, AccessService accessService, AppDbContext db, CancellationToken ct)
    {
        var access = await accessService.CurrentAsync(http.User, ct);
        var query = q?.Trim() ?? "";
        if (query.Length > MaxQueryLength)
        {
            throw new ValidationFailedException("q", $"Kata pencarian maksimal {MaxQueryLength} karakter.");
        }

        if (query.Length == 0)
        {
            return Results.Ok(new SearchResults([], [], []));
        }

        var pattern = $"%{query.Replace("\\", "\\\\", StringComparison.Ordinal).Replace("%", "\\%", StringComparison.Ordinal).Replace("_", "\\_", StringComparison.Ordinal)}%";
        var admin = access.IsAdmin;
        var roots = access.Projects.Keys.ToList();

        // Nama proyek (untuk jalur "Sentul / Dispatch") dari semua proyek yang boleh dilihat
        var projects = db.Projects.AsNoTracking().Where(p => p.ArchivedAt == null && (admin || roots.Contains(p.RootId)));
        var family = (await projects.Select(p => new { p.Id, p.ParentId, p.Name }).ToListAsync(ct)).ToDictionary(p => p.Id);

        string PathOf(Guid projectId)
        {
            var names = new List<string>();
            for (Guid? id = projectId; id is { } at && family.TryGetValue(at, out var node); id = node.ParentId)
            {
                names.Insert(0, node.Name);
            }

            return string.Join(" / ", names);
        }

        var keyMatch = KeyPattern().Match(query);
        var number = keyMatch.Success ? int.Parse(keyMatch.Groups[2].Value, System.Globalization.CultureInfo.InvariantCulture) : (int?)null;
        var code = keyMatch.Success && keyMatch.Groups[1].Success ? keyMatch.Groups[1].Value.ToUpperInvariant() : null;

        var taskRows = await db.Tasks.AsNoTracking()
            .Where(t => t.Project!.ArchivedAt == null && (admin || roots.Contains(t.RootProjectId)))
            .Where(t => EF.Functions.ILike(t.Title, pattern, "\\")
                || (number != null && t.Number == number && (code == null || db.Projects.Any(p => p.Id == t.RootProjectId && p.Code == code))))
            .OrderByDescending(t => t.UpdatedAt)
            .Take(MaxResults)
            .Select(t => new { t.Id, t.Number, t.Title, t.Status, t.ProjectId, Code = db.Projects.Where(p => p.Id == t.RootProjectId).Select(p => p.Code).First() })
            .ToListAsync(ct);

        var projectRows = await projects
            .Where(p => EF.Functions.ILike(p.Name, pattern, "\\"))
            .OrderBy(p => p.Depth)
            .ThenBy(p => p.Name)
            .Take(MaxResults)
            .Select(p => new SearchProject(p.Id, p.Name, ""))
            .ToListAsync(ct);

        var people = new List<SearchPerson>();
        if (!access.IsGuestOnly)
        {
            var members = await db.ProjectMembers.AsNoTracking()
                .Where(m => (admin || roots.Contains(m.ProjectId)) && m.Project!.ArchivedAt == null && m.User!.IsActive && EF.Functions.ILike(m.User.DisplayName, pattern, "\\"))
                .Select(m => new { m.UserId, m.User!.DisplayName, m.ProjectId, ProjectName = m.Project!.Name })
                .ToListAsync(ct);
            people.AddRange(members
                .GroupBy(m => m.UserId)
                .Select(g => g.OrderBy(m => m.ProjectName, StringComparer.Ordinal).First())
                .OrderBy(m => m.DisplayName, StringComparer.Ordinal)
                .Take(MaxResults)
                .Select(m => new SearchPerson(m.UserId, m.DisplayName, m.ProjectId, m.ProjectName)));
        }

        return Results.Ok(new SearchResults(
            [.. taskRows.Select(t => new SearchTask(t.Id, $"{t.Code}-{t.Number}", t.Title, t.Status, t.ProjectId, PathOf(t.ProjectId)))],
            [.. projectRows.Select(p => p with { Path = PathOf(p.Id) })],
            people));
    }
}
