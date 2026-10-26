using System.Net;
using Ariadne.Api.Domain;
using Ariadne.Api.Features.Projects;
using Ariadne.Api.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace Ariadne.Api.Tests.Features.Projects;

public sealed class ProjectTests(WorldFixture fx) : IClassFixture<WorldFixture>
{
    private TestApp App => fx.App;

    private World W => fx.World;

    private static string NewCode() => "T" + Guid.NewGuid().ToString("N")[..5].ToUpperInvariant();

    private async Task<ProjectNode> NewRootAsync()
    {
        var admin = await App.ClientAsync(W.Admin);
        var response = await admin.PostApiAsync("/api/projects", new { name = $"Proyek {Guid.NewGuid():N}", code = NewCode() });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return await response.ReadAsync<ProjectNode>();
    }

    private async Task<List<ProjectNode>> TreeAsync(TestUser user) =>
        await (await (await App.ClientAsync(user)).GetApiAsync("/api/projects/tree")).ReadAsync<List<ProjectNode>>();

    // ---------- pohon sidebar ----------

    [Fact]
    public async Task The_tree_only_contains_projects_the_person_belongs_to()
    {
        var manager = await TreeAsync(W.Manager);
        var guest = await TreeAsync(W.Guest);
        var otherManager = await TreeAsync(W.OtherManager);
        var outsider = await TreeAsync(W.Outsider);

        // Test lain boleh menambah sub-proyek di Alpha, jadi yang diperiksa: proyek bawaan ada, dan HANYA keluarga Alpha yang terlihat
        var visible = manager.Select(p => p.Id).ToHashSet();
        Assert.All(new[] { W.ProjectAlpha, W.ProjectAlphaChild, W.ProjectAlphaGrandchild }, id => Assert.Contains(id, visible));
        Assert.All(manager, node => Assert.Equal(W.ProjectAlpha, node.RootId));
        Assert.Contains(guest, p => p.Id == W.ProjectAlpha); // Tamu melihat proyek yang diundang
        Assert.DoesNotContain(guest, p => p.RootId == W.ProjectBeta);
        Assert.DoesNotContain(otherManager, p => p.RootId == W.ProjectAlpha);
        Assert.Contains(otherManager, p => p.Id == W.ProjectBeta);
        Assert.Empty(outsider);
    }

    [Fact]
    public async Task Admins_see_every_project_and_the_tree_is_ordered_parents_first()
    {
        var admin = await TreeAsync(W.Admin);

        Assert.Contains(admin, p => p.Id == W.ProjectAlpha);
        Assert.Contains(admin, p => p.Id == W.ProjectBeta);
        var depths = admin.Select(p => p.Depth).ToList();
        Assert.Equal(depths.Order(), depths); // induk selalu muncul sebelum anak
    }

    [Fact]
    public async Task Archived_projects_leave_the_tree()
    {
        var root = await NewRootAsync();
        var admin = await App.ClientAsync(W.Admin);
        Assert.Contains(await TreeAsync(W.Admin), p => p.Id == root.Id);

        Assert.Equal(HttpStatusCode.NoContent, (await admin.PostApiAsync($"/api/projects/{root.Id}/archive")).StatusCode);

        Assert.DoesNotContain(await TreeAsync(W.Admin), p => p.Id == root.Id);
    }

    [Fact]
    public async Task Archiving_a_project_archives_all_of_its_sub_projects()
    {
        var root = await NewRootAsync();
        var admin = await App.ClientAsync(W.Admin);
        var child = await (await admin.PostApiAsync($"/api/projects/{root.Id}/children", new { name = "Anak" })).ReadAsync<ProjectNode>();
        var grandchild = await (await admin.PostApiAsync($"/api/projects/{child.Id}/children", new { name = "Cucu" })).ReadAsync<ProjectNode>();

        await admin.PostApiAsync($"/api/projects/{child.Id}/archive");
        var afterChild = (await TreeAsync(W.Admin)).Select(p => p.Id).ToHashSet();
        await admin.PostApiAsync($"/api/projects/{root.Id}/archive");
        var afterRoot = (await TreeAsync(W.Admin)).Select(p => p.Id).ToHashSet();

        Assert.Contains(root.Id, afterChild);
        Assert.DoesNotContain(child.Id, afterChild);
        Assert.DoesNotContain(grandchild.Id, afterChild);
        Assert.DoesNotContain(root.Id, afterRoot);
    }

    // ---------- detail ----------

    [Fact]
    public async Task Detail_gives_the_breadcrumb_role_and_member_counts()
    {
        var manager = await App.ClientAsync(W.Manager);

        var detail = await (await manager.GetApiAsync($"/api/projects/{W.ProjectAlphaGrandchild}")).ReadAsync<ProjectDetail>();

        Assert.Equal(["Alpha", "Modul", "Detail"], detail.Path.Select(c => c.Name));
        Assert.Equal(2, detail.Depth);
        Assert.Equal(W.ProjectAlpha, detail.RootId);
        Assert.Equal("ALP", detail.Code); // kode diwarisi dari proyek root
        Assert.Equal(ProjectRole.Pengelola, detail.MyRole);
        Assert.True(detail.CanManage);
        Assert.Equal(new ProjectMemberCounts(3, 1, 1, 1), detail.MemberCounts);
    }

    [Fact]
    public async Task Detail_is_404_for_projects_the_person_may_not_know_exist()
    {
        foreach (var user in new[] { W.Outsider, W.OtherManager, W.Supervisor })
        {
            var client = await App.ClientAsync(user);
            Assert.Equal(HttpStatusCode.NotFound, (await client.GetApiAsync($"/api/projects/{W.ProjectAlpha}")).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await client.GetApiAsync($"/api/projects/{W.ProjectAlphaChild}")).StatusCode);
        }

        // Id yang memang tidak ada memberi jawaban yang sama, supaya keberadaan proyek tidak bisa ditebak
        var nobody = await App.ClientAsync(W.Outsider);
        Assert.Equal(HttpStatusCode.NotFound, (await nobody.GetApiAsync($"/api/projects/{Guid.NewGuid()}")).StatusCode);
    }

    [Fact]
    public async Task Guests_can_open_the_project_but_cannot_manage_it()
    {
        var guest = await App.ClientAsync(W.Guest);

        var detail = await (await guest.GetApiAsync($"/api/projects/{W.ProjectAlpha}")).ReadAsync<ProjectDetail>();

        Assert.Equal(ProjectRole.Tamu, detail.MyRole);
        Assert.False(detail.CanManage);
    }

    [Fact]
    public async Task Admins_can_open_any_project_without_being_a_member()
    {
        var admin = await App.ClientAsync(W.Admin);

        var detail = await (await admin.GetApiAsync($"/api/projects/{W.ProjectBeta}")).ReadAsync<ProjectDetail>();

        Assert.Null(detail.MyRole);
        Assert.True(detail.CanManage);
    }

    // ---------- membuat proyek ----------

    [Fact]
    public async Task Only_admins_create_root_projects()
    {
        foreach (var user in new[] { W.Supervisor, W.Member, W.Manager, W.Guest, W.Outsider })
        {
            var client = await App.ClientAsync(user);
            Assert.Equal(HttpStatusCode.Forbidden, (await client.PostApiAsync("/api/projects", new { name = "Gelap", code = NewCode() })).StatusCode);
        }

        var root = await NewRootAsync();
        Assert.Equal(0, root.Depth);
        Assert.Equal(root.Id, root.RootId);
        Assert.Null(root.ParentId);
    }

    [Theory]
    [InlineData("sen2", true)] // otomatis menjadi huruf besar
    [InlineData("A", false)] // terlalu pendek
    [InlineData("TERLALUPANJANG", false)]
    [InlineData("1ABC", false)] // harus diawali huruf
    [InlineData("AB-C", false)]
    [InlineData("", false)]
    public async Task Project_codes_follow_the_format(string code, bool valid)
    {
        var admin = await App.ClientAsync(W.Admin);
        var unique = valid ? code + Guid.NewGuid().ToString("N")[..2].ToUpperInvariant() : code;
        if (valid && unique.Length > 6)
        {
            unique = unique[..6];
        }

        var response = await admin.PostApiAsync("/api/projects", new { name = "Format", code = unique });

        Assert.Equal(valid ? HttpStatusCode.Created : HttpStatusCode.BadRequest, response.StatusCode);
        if (!valid)
        {
            Assert.Contains("code", (await response.ReadAsync<ProblemBody>()).Errors!.Keys);
        }
    }

    [Fact]
    public async Task Project_codes_are_unique()
    {
        var admin = await App.ClientAsync(W.Admin);

        var response = await admin.PostApiAsync("/api/projects", new { name = "Kembar", code = "alp" });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Sub_projects_nest_at_most_three_levels_deep()
    {
        var root = await NewRootAsync();
        var admin = await App.ClientAsync(W.Admin);

        var child = await (await admin.PostApiAsync($"/api/projects/{root.Id}/children", new { name = "Level 2" })).ReadAsync<ProjectNode>();
        var grandchild = await (await admin.PostApiAsync($"/api/projects/{child.Id}/children", new { name = "Level 3" })).ReadAsync<ProjectNode>();
        var tooDeep = await admin.PostApiAsync($"/api/projects/{grandchild.Id}/children", new { name = "Level 4" });

        Assert.Equal(1, child.Depth);
        Assert.Equal(2, grandchild.Depth);
        Assert.Equal(root.Id, grandchild.RootId);
        Assert.Equal(HttpStatusCode.BadRequest, tooDeep.StatusCode);
        Assert.Contains("maksimal 3 level", (await tooDeep.ReadAsync<ProblemBody>()).Errors!["name"][0], StringComparison.Ordinal);
    }

    [Fact]
    public async Task Managers_create_sub_projects_but_members_and_guests_cannot()
    {
        var manager = await App.ClientAsync(W.Manager);
        var created = await manager.PostApiAsync($"/api/projects/{W.ProjectAlphaChild}/children", new { name = $"Dibuat Pengelola {Guid.NewGuid():N}" });

        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await (await App.ClientAsync(W.Member)).PostApiAsync($"/api/projects/{W.ProjectAlpha}/children", new { name = "Tidak Boleh" })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await (await App.ClientAsync(W.Guest)).PostApiAsync($"/api/projects/{W.ProjectAlpha}/children", new { name = "Tidak Boleh" })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await (await App.ClientAsync(W.OtherManager)).PostApiAsync($"/api/projects/{W.ProjectAlpha}/children", new { name = "Orang Lain" })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await (await App.ClientAsync(W.Outsider)).PostApiAsync($"/api/projects/{W.ProjectAlpha}/children", new { name = "Orang Luar" })).StatusCode);
    }

    [Fact]
    public async Task Names_are_validated_and_trimmed()
    {
        var manager = await App.ClientAsync(W.Manager);

        var blank = await manager.PostApiAsync($"/api/projects/{W.ProjectAlpha}/children", new { name = "   " });
        var tooLong = await manager.PostApiAsync($"/api/projects/{W.ProjectAlpha}/children", new { name = new string('x', 101) });
        var ok = await manager.PostApiAsync($"/api/projects/{W.ProjectAlpha}/children", new { name = "  Rapi  " });

        Assert.Equal(HttpStatusCode.BadRequest, blank.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, tooLong.StatusCode);
        Assert.Equal("Rapi", (await ok.ReadAsync<ProjectNode>()).Name);
    }

    [Fact]
    public async Task Projects_can_be_renamed_by_managers_only()
    {
        var root = await NewRootAsync();
        var admin = await App.ClientAsync(W.Admin);
        var manager = await App.CreateUserAsync("Pengelola Rename");
        await admin.PostApiAsync($"/api/projects/{root.Id}/members", new { userId = manager.Id, role = "Pengelola" });
        var member = await App.CreateUserAsync("Anggota Rename");
        await admin.PostApiAsync($"/api/projects/{root.Id}/members", new { userId = member.Id, role = "Anggota" });

        Assert.Equal(HttpStatusCode.NoContent, (await (await App.LoginAsync(manager)).PatchApiAsync($"/api/projects/{root.Id}", new { name = "Nama Baru" })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await (await App.LoginAsync(member)).PatchApiAsync($"/api/projects/{root.Id}", new { name = "Bajakan" })).StatusCode);
        var detail = await (await admin.GetApiAsync($"/api/projects/{root.Id}")).ReadAsync<ProjectDetail>();
        Assert.Equal("Nama Baru", detail.Name);
    }

    [Fact]
    public async Task The_database_itself_refuses_projects_that_break_the_depth_rules()
    {
        // Lapisan terakhir: bahkan kode yang salah tidak bisa menyimpan proyek level 4 atau root tanpa kode
        await using var scope = App.Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<Ariadne.Api.Infrastructure.Data.AppDbContext>();
        var id = Guid.NewGuid();
        db.Projects.Add(new Project { Id = id, RootId = id, Depth = 3, Name = "Terlalu Dalam", Code = "DEEP", CreatedAt = DateTimeOffset.UtcNow });

        await Assert.ThrowsAsync<Microsoft.EntityFrameworkCore.DbUpdateException>(() => db.SaveChangesAsync(TestContext.Current.CancellationToken));
    }
}
