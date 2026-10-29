using Ariadne.Api.Domain;

namespace Ariadne.Api.Features.Teams;

public sealed record TeamSummary(
    Guid Id,
    string Name,
    int MemberCount,
    IReadOnlyList<string> Supervisors,
    IReadOnlyList<string> MemberNames);

public sealed record TeamMemberItem(Guid UserId, string DisplayName, string Email, TeamRole Role, IReadOnlyList<string> OtherTeams, int ActiveTasks);

public sealed record TeamDetail(
    Guid Id,
    string Name,
    bool CanManage,
    IReadOnlyList<string> Supervisors,
    IReadOnlyList<string> Projects,
    IReadOnlyList<TeamMemberItem> Members);

public sealed record CreateTeamRequest(string? Name);

public sealed record UpdateTeamRequest(string? Name);

public sealed record AddTeamMemberRequest(Guid UserId, string? Role);

public sealed record UpdateTeamMemberRequest(string? Role);
