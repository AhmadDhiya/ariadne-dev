namespace Ariadne.Api.Domain;

public sealed class Team
{
    public Guid Id { get; set; }

    public string Name { get; set; } = "";

    public DateTimeOffset CreatedAt { get; set; }

    public List<TeamMember> Members { get; set; } = [];
}

public sealed class TeamMember
{
    public Guid TeamId { get; set; }

    public Guid UserId { get; set; }

    public TeamRole Role { get; set; }

    public DateTimeOffset AddedAt { get; set; }

    public Team? Team { get; set; }

    public AppUser? User { get; set; }
}
