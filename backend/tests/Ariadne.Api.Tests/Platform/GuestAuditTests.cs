using System.Net;
using Ariadne.Api.Tests.Infrastructure;

namespace Ariadne.Api.Tests.Platform;

/// <summary>
/// Audit izin Tamu (Fase 8): SEMUA endpoint baca di matriks izin dipanggil sebagai Tamu, dan tidak satu pun boleh
/// membawa isi catatan Internal, email orang lain, atau undangan, di bagian jawaban mana pun (bukan hanya di
/// kolom yang diharapkan). Hak ubah Tamu per endpoint sudah dijaga di PermissionMatrixTests (kolom "Tamu").
/// Kelas ini punya database sendiri, jadi data tambahannya tidak mengganggu test lain.
/// </summary>
public sealed class GuestAuditTests(WorldFixture fx) : IClassFixture<WorldFixture>
{
    private const string Marker = "PENANDA-INTERNAL-7f3a";

    private World W => fx.World;

    public static IEnumerable<object[]> ReadEndpoints() =>
        PermissionMatrixTests.Rows.Where(r => r.Method == HttpMethod.Get).Select(r => new object[] { r.Name });

    private async Task SeedSecretsAsync()
    {
        var member = await fx.App.ClientAsync(W.Member);
        var manager = await fx.App.ClientAsync(W.Manager);
        // Catatan Internal yang juga menandai orang, dan undangan dengan pesan: keduanya tidak untuk Tamu
        var note = await member.PostApiAsync($"/api/tasks/{W.TaskAlpha}/activities", new { kind = "Internal", body = $"{Marker} @Pengelola" });
        Assert.Equal(HttpStatusCode.Created, note.StatusCode);
        var invite = await manager.PostApiAsync($"/api/projects/{W.ProjectAlpha}/invitations", new { emails = new[] { "audit-undangan@uji.example" }, role = "Anggota", message = Marker });
        Assert.Equal(HttpStatusCode.OK, invite.StatusCode);
    }

    [Theory]
    [MemberData(nameof(ReadEndpoints))]
    public async Task Guests_never_receive_internal_notes_other_peoples_emails_or_invitations(string rowName)
    {
        await SeedSecretsAsync();
        var row = PermissionMatrixTests.Rows.Single(r => r.Name == rowName);
        var guest = await fx.App.ClientAsync(W.Guest);

        var response = await guest.GetApiAsync(row.Url(W));
        var body = await response.TextAsync();

        Assert.True((int)response.StatusCode < 500, $"{rowName}: {(int)response.StatusCode}");
        Assert.DoesNotContain(Marker, body, StringComparison.Ordinal);
        Assert.DoesNotContain("audit-undangan@uji.example", body, StringComparison.OrdinalIgnoreCase);
        foreach (var other in new[] { W.Admin, W.Member, W.Manager, W.Supervisor, W.Outsider })
        {
            Assert.DoesNotContain(other.Email, body, StringComparison.OrdinalIgnoreCase);
        }
    }

    [Fact]
    public async Task The_audit_actually_sees_the_secret_where_insiders_may()
    {
        // Pembuktian bahwa test di atas tidak lolos hanya karena rahasianya tidak pernah tersimpan
        await SeedSecretsAsync();
        var member = await fx.App.ClientAsync(W.Member);
        var manager = await fx.App.ClientAsync(W.Manager);

        Assert.Contains(Marker, await (await member.GetApiAsync($"/api/tasks/{W.TaskAlpha}/activities")).TextAsync(), StringComparison.Ordinal);
        Assert.Contains("audit-undangan@uji.example", await (await manager.GetApiAsync($"/api/projects/{W.ProjectAlpha}/invitations")).TextAsync(), StringComparison.Ordinal);
        Assert.Contains(W.Member.Email, await (await member.GetApiAsync($"/api/projects/{W.ProjectAlpha}/members")).TextAsync(), StringComparison.Ordinal);
    }
}
