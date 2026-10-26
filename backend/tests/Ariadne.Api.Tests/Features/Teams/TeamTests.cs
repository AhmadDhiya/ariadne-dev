using System.Net;
using Ariadne.Api.Domain;
using Ariadne.Api.Features.Teams;
using Ariadne.Api.Tests.Infrastructure;

namespace Ariadne.Api.Tests.Features.Teams;

public sealed class TeamTests(WorldFixture fx) : IClassFixture<WorldFixture>
{
    private TestApp App => fx.App;

    private World W => fx.World;

    private async Task<Guid> NewTeamAsync()
    {
        var admin = await App.ClientAsync(W.Admin);
        var response = await admin.PostApiAsync("/api/teams", new { name = $"Tim {Guid.NewGuid():N}" });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.ReadAsync<TeamSummary>()).Id;
    }

    [Fact]
    public async Task People_only_see_the_teams_they_belong_to_and_admins_see_all()
    {
        var admin = await (await (await App.ClientAsync(W.Admin)).GetApiAsync("/api/teams")).ReadAsync<List<TeamSummary>>();
        var supervisor = await (await (await App.ClientAsync(W.Supervisor)).GetApiAsync("/api/teams")).ReadAsync<List<TeamSummary>>();
        var member = await (await (await App.ClientAsync(W.Member)).GetApiAsync("/api/teams")).ReadAsync<List<TeamSummary>>();
        var outsider = await (await (await App.ClientAsync(W.Outsider)).GetApiAsync("/api/teams")).ReadAsync<List<TeamSummary>>();

        Assert.Contains(admin, t => t.Id == W.TeamA);
        Assert.Contains(admin, t => t.Id == W.TeamB);
        Assert.Equal([W.TeamA], supervisor.Select(t => t.Id));
        Assert.Equal([W.TeamA], member.Select(t => t.Id));
        Assert.Empty(outsider);
    }

    [Fact]
    public async Task Team_list_summarises_members_with_supervisors_first()
    {
        var supervisor = await App.ClientAsync(W.Supervisor);

        var team = Assert.Single(await (await supervisor.GetApiAsync("/api/teams")).ReadAsync<List<TeamSummary>>());

        Assert.Equal(2, team.MemberCount);
        Assert.Equal(["Supervisor"], team.Supervisors);
        Assert.Equal(["Supervisor", "Anggota"], team.MemberNames);
    }

    [Fact]
    public async Task Client_guests_cannot_see_any_team_information()
    {
        var guest = await App.ClientAsync(W.Guest);

        Assert.Equal(HttpStatusCode.Forbidden, (await guest.GetApiAsync("/api/teams")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await guest.GetApiAsync($"/api/teams/{W.TeamA}")).StatusCode);
    }

    [Fact]
    public async Task Team_detail_is_hidden_from_people_outside_the_team()
    {
        foreach (var user in new[] { W.OtherSupervisor, W.Outsider, W.Manager })
        {
            var client = await App.ClientAsync(user);
            Assert.Equal(HttpStatusCode.NotFound, (await client.GetApiAsync($"/api/teams/{W.TeamA}")).StatusCode);
        }

        Assert.Equal(HttpStatusCode.NotFound, (await (await App.ClientAsync(W.Admin)).GetApiAsync($"/api/teams/{Guid.NewGuid()}")).StatusCode);
    }

    [Fact]
    public async Task Team_detail_shows_members_other_teams_and_only_projects_the_viewer_may_see()
    {
        // Tim sendiri supaya tidak mengubah Tim A yang dipakai test lain
        var first = await NewTeamAsync();
        var second = await NewTeamAsync();
        var admin = await App.ClientAsync(W.Admin);
        var overseer = await App.CreateUserAsync("Pengawas"); // bukan anggota proyek Alpha
        var both = await App.CreateUserAsync("Dua Tim");
        await admin.PostApiAsync($"/api/teams/{first}/members", new { userId = overseer.Id, role = "Supervisor" });
        await admin.PostApiAsync($"/api/teams/{first}/members", new { userId = W.Member.Id, role = "Anggota" }); // anggota proyek Alpha
        await admin.PostApiAsync($"/api/teams/{first}/members", new { userId = both.Id, role = "Anggota" });
        await admin.PostApiAsync($"/api/teams/{second}/members", new { userId = both.Id, role = "Anggota" });
        var secondName = (await (await admin.GetApiAsync($"/api/teams/{second}")).ReadAsync<TeamDetail>()).Name;

        var asAdmin = await (await admin.GetApiAsync($"/api/teams/{first}")).ReadAsync<TeamDetail>();
        var asOverseer = await (await (await App.ClientAsync(overseer)).GetApiAsync($"/api/teams/{first}")).ReadAsync<TeamDetail>();

        Assert.True(asAdmin.CanManage);
        Assert.Equal(TeamRole.Supervisor, asAdmin.Members[0].Role); // supervisor selalu di atas
        Assert.Equal([secondName], Assert.Single(asAdmin.Members, m => m.UserId == both.Id).OtherTeams);
        Assert.Equal("Pengawas", Assert.Single(asAdmin.Supervisors));
        // Alpha diikuti anggota tim; pengawas bukan anggota Alpha, jadi tidak boleh tahu namanya
        Assert.Contains("Alpha", asAdmin.Projects);
        Assert.DoesNotContain("Alpha", asOverseer.Projects);
        Assert.True(asOverseer.CanManage);
    }

    [Fact]
    public async Task Members_of_a_team_cannot_manage_it_unless_they_supervise_it()
    {
        var member = await App.ClientAsync(W.Member);
        var detail = await (await member.GetApiAsync($"/api/teams/{W.TeamA}")).ReadAsync<TeamDetail>();

        Assert.False(detail.CanManage);
        Assert.Equal(HttpStatusCode.Forbidden, (await member.PostApiAsync($"/api/teams/{W.TeamA}/members", new { userId = W.Outsider.Id, role = "Anggota" })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await member.PatchApiAsync($"/api/teams/{W.TeamA}", new { name = "Diubah" })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await member.DeleteApiAsync($"/api/teams/{W.TeamA}/members/{W.Supervisor.Id}")).StatusCode);
    }

    [Fact]
    public async Task A_supervisor_manages_their_own_team_but_not_another_one()
    {
        var teamId = await NewTeamAsync();
        var admin = await App.ClientAsync(W.Admin);
        var supervised = await App.CreateUserAsync("Pengawas Baru");
        var candidate = await App.CreateUserAsync("Calon");
        await admin.PostApiAsync($"/api/teams/{teamId}/members", new { userId = supervised.Id, role = "Supervisor" });
        var client = await App.LoginAsync(supervised);

        var add = await client.PostApiAsync($"/api/teams/{teamId}/members", new { userId = candidate.Id, role = "Anggota" });
        var promote = await client.PatchApiAsync($"/api/teams/{teamId}/members/{candidate.Id}", new { role = "Supervisor" });
        var rename = await client.PatchApiAsync($"/api/teams/{teamId}", new { name = $"Ganti {Guid.NewGuid():N}" });
        var remove = await client.DeleteApiAsync($"/api/teams/{teamId}/members/{candidate.Id}");
        var otherTeam = await client.PostApiAsync($"/api/teams/{W.TeamB}/members", new { userId = candidate.Id, role = "Anggota" });

        Assert.Equal(HttpStatusCode.NoContent, add.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, promote.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, rename.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, remove.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, otherTeam.StatusCode); // tim lain: keberadaannya pun dirahasiakan
    }

    [Fact]
    public async Task Only_admins_create_teams_and_names_must_be_unique()
    {
        var admin = await App.ClientAsync(W.Admin);
        var name = $"Tim Unik {Guid.NewGuid():N}";

        Assert.Equal(HttpStatusCode.Created, (await admin.PostApiAsync("/api/teams", new { name })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostApiAsync("/api/teams", new { name })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostApiAsync("/api/teams", new { name = "   " })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostApiAsync("/api/teams", new { name = new string('x', 101) })).StatusCode);

        foreach (var user in new[] { W.Supervisor, W.Member, W.Manager, W.Guest, W.Outsider })
        {
            var client = await App.ClientAsync(user);
            Assert.Equal(HttpStatusCode.Forbidden, (await client.PostApiAsync("/api/teams", new { name = "Tim Gelap" })).StatusCode);
        }
    }

    [Fact]
    public async Task Adding_members_checks_role_user_and_duplicates()
    {
        var teamId = await NewTeamAsync();
        var admin = await App.ClientAsync(W.Admin);
        var person = await App.CreateUserAsync("Anggota Baru");
        var inactive = await App.CreateUserAsync("Nonaktif", isActive: false);

        Assert.Equal(HttpStatusCode.NoContent, (await admin.PostApiAsync($"/api/teams/{teamId}/members", new { userId = person.Id, role = "Anggota" })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostApiAsync($"/api/teams/{teamId}/members", new { userId = person.Id, role = "Supervisor" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostApiAsync($"/api/teams/{teamId}/members", new { userId = W.Outsider.Id, role = "Raja" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostApiAsync($"/api/teams/{teamId}/members", new { userId = Guid.NewGuid(), role = "Anggota" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostApiAsync($"/api/teams/{teamId}/members", new { userId = inactive.Id, role = "Anggota" })).StatusCode);
        // Peran harus persis "Supervisor"/"Anggota", bukan angka atau huruf kecil
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostApiAsync($"/api/teams/{teamId}/members", new { userId = W.Outsider.Id, role = "supervisor" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostApiAsync($"/api/teams/{teamId}/members", new { userId = W.Outsider.Id, role = "0" })).StatusCode);
    }

    [Fact]
    public async Task Client_guests_cannot_join_internal_teams()
    {
        var teamId = await NewTeamAsync();
        var admin = await App.ClientAsync(W.Admin);

        var response = await admin.PostApiAsync($"/api/teams/{teamId}/members", new { userId = W.Guest.Id, role = "Anggota" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("userId", (await response.ReadAsync<ProblemBody>()).Errors!.Keys);
    }

    [Fact]
    public async Task Member_roles_can_change_and_members_can_be_removed()
    {
        var teamId = await NewTeamAsync();
        var admin = await App.ClientAsync(W.Admin);
        var person = await App.CreateUserAsync("Berubah");
        await admin.PostApiAsync($"/api/teams/{teamId}/members", new { userId = person.Id, role = "Anggota" });

        Assert.Equal(HttpStatusCode.NoContent, (await admin.PatchApiAsync($"/api/teams/{teamId}/members/{person.Id}", new { role = "Supervisor" })).StatusCode);
        var detail = await (await admin.GetApiAsync($"/api/teams/{teamId}")).ReadAsync<TeamDetail>();
        Assert.Equal(TeamRole.Supervisor, Assert.Single(detail.Members).Role);

        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteApiAsync($"/api/teams/{teamId}/members/{person.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.DeleteApiAsync($"/api/teams/{teamId}/members/{person.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.PatchApiAsync($"/api/teams/{teamId}/members/{person.Id}", new { role = "Anggota" })).StatusCode);
    }

    [Fact]
    public async Task Removing_someone_from_a_team_takes_their_team_rights_away_immediately()
    {
        var teamId = await NewTeamAsync();
        var admin = await App.ClientAsync(W.Admin);
        var person = await App.CreateUserAsync("Dikeluarkan");
        await admin.PostApiAsync($"/api/teams/{teamId}/members", new { userId = person.Id, role = "Supervisor" });
        var client = await App.LoginAsync(person);
        Assert.Equal(HttpStatusCode.OK, (await client.GetApiAsync($"/api/teams/{teamId}")).StatusCode);

        await admin.DeleteApiAsync($"/api/teams/{teamId}/members/{person.Id}");

        Assert.Equal(HttpStatusCode.NotFound, (await client.GetApiAsync($"/api/teams/{teamId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PostApiAsync($"/api/teams/{teamId}/members", new { userId = W.Outsider.Id, role = "Anggota" })).StatusCode);
    }
}
