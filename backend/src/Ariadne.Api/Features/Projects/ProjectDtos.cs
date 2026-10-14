using Ariadne.Api.Domain;

namespace Ariadne.Api.Features.Projects;

/// <summary>Satu simpul pohon proyek untuk sidebar (daftar datar; frontend menyusunnya lewat ParentId).</summary>
public sealed record ProjectNode(Guid Id, Guid? ParentId, Guid RootId, int Depth, string Name, string? Code, int SortOrder);

public sealed record ProjectCrumb(Guid Id, string Name);

public sealed record ProjectMemberCounts(int Total, int Pengelola, int Anggota, int Tamu);

public sealed record ProjectDetail(
    Guid Id,
    Guid? ParentId,
    Guid RootId,
    int Depth,
    string Name,
    string? Code,
    IReadOnlyList<ProjectCrumb> Path,
    ProjectRole? MyRole,
    bool CanManage,
    ProjectMemberCounts MemberCounts,
    IReadOnlyList<string> MemberNames);

public sealed record CreateProjectRequest(string? Name, string? Code);

public sealed record CreateSubProjectRequest(string? Name);

public sealed record UpdateProjectRequest(string? Name, int? SortOrder);

/// <summary>Email dikosongkan bila yang bertanya adalah Tamu.</summary>
public sealed record ProjectMemberItem(Guid UserId, string DisplayName, string? Email, ProjectRole Role, bool IsGuest, string Status, DateTimeOffset AddedAt);

public sealed record AddProjectMemberRequest(Guid UserId, string? Role);

public sealed record UpdateProjectMemberRequest(string? Role);
