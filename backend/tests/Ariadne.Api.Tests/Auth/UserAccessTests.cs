using Ariadne.Api.Auth;
using Ariadne.Api.Domain;
using Ariadne.Api.Infrastructure.Web;

namespace Ariadne.Api.Tests.Auth;

/// <summary>Aturan izin murni, tanpa database: dasar dari semua pemeriksaan di endpoint.</summary>
public sealed class UserAccessTests
{
    private static readonly Guid TeamA = Guid.NewGuid();
    private static readonly Guid ProjectA = Guid.NewGuid();
    private static readonly Guid ProjectB = Guid.NewGuid();

    private static UserAccess Access(
        bool admin = false,
        TeamRole? team = null,
        ProjectRole? projectA = null)
    {
        var teams = team is { } t ? new Dictionary<Guid, TeamRole> { [TeamA] = t } : [];
        var projects = projectA is { } p ? new Dictionary<Guid, ProjectRole> { [ProjectA] = p } : [];
        return new UserAccess(Guid.NewGuid(), admin, teams, projects);
    }

    [Fact]
    public void Guests_are_people_whose_only_connection_is_being_a_guest_of_a_project()
    {
        Assert.True(Access(projectA: ProjectRole.Tamu).IsGuestOnly);
        Assert.False(Access().IsGuestOnly); // orang internal baru tanpa proyek
        Assert.False(Access(projectA: ProjectRole.Anggota).IsGuestOnly);
        Assert.False(Access(admin: true, projectA: ProjectRole.Tamu).IsGuestOnly);
        Assert.False(Access(team: TeamRole.Anggota, projectA: ProjectRole.Tamu).IsGuestOnly);
    }

    [Fact]
    public void Admins_view_and_manage_every_project_but_members_only_their_own()
    {
        var admin = Access(admin: true);
        var manager = Access(projectA: ProjectRole.Pengelola);
        var member = Access(projectA: ProjectRole.Anggota);

        Assert.True(admin.CanViewProject(ProjectB) && admin.CanManageProject(ProjectB));
        Assert.True(manager.CanViewProject(ProjectA) && manager.CanManageProject(ProjectA));
        Assert.True(member.CanViewProject(ProjectA) && !member.CanManageProject(ProjectA));
        Assert.False(manager.CanViewProject(ProjectB));
    }

    [Fact]
    public void Not_being_allowed_to_see_is_404_and_being_allowed_to_see_but_not_change_is_403()
    {
        var member = Access(projectA: ProjectRole.Anggota);

        Assert.Throws<NotFoundException>(() => member.EnsureCanViewProject(ProjectB));
        Assert.Throws<NotFoundException>(() => member.EnsureCanManageProject(ProjectB));
        Assert.Throws<ForbiddenException>(() => member.EnsureCanManageProject(ProjectA));
        member.EnsureCanViewProject(ProjectA);
    }

    [Fact]
    public void Only_supervisors_and_admins_manage_a_team()
    {
        Assert.True(Access(team: TeamRole.Supervisor).CanManageTeam(TeamA));
        Assert.False(Access(team: TeamRole.Anggota).CanManageTeam(TeamA));
        Assert.True(Access(team: TeamRole.Anggota).CanViewTeam(TeamA));
        Assert.True(Access(admin: true).CanManageTeam(TeamA));
        Assert.False(Access().CanViewTeam(TeamA));
        Assert.Throws<NotFoundException>(() => Access().EnsureCanViewTeam(TeamA));
        Assert.Throws<ForbiddenException>(() => Access(team: TeamRole.Anggota).EnsureCanManageTeam(TeamA));
    }

    [Fact]
    public void Looking_up_people_is_for_admins_supervisors_and_managers()
    {
        Access(admin: true).EnsureCanLookupUsers();
        Access(team: TeamRole.Supervisor).EnsureCanLookupUsers();
        Access(projectA: ProjectRole.Pengelola).EnsureCanLookupUsers();
        Assert.Throws<ForbiddenException>(() => Access(team: TeamRole.Anggota).EnsureCanLookupUsers());
        Assert.Throws<ForbiddenException>(() => Access(projectA: ProjectRole.Anggota).EnsureCanLookupUsers());
        Assert.Throws<ForbiddenException>(() => Access(projectA: ProjectRole.Tamu).EnsureCanLookupUsers());
    }

    [Fact]
    public void Admin_only_actions_reject_everyone_else()
    {
        Access(admin: true).EnsureAdmin();
        Assert.Throws<ForbiddenException>(() => Access(team: TeamRole.Supervisor, projectA: ProjectRole.Pengelola).EnsureAdmin());
    }
}
