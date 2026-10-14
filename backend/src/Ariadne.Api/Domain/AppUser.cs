using Microsoft.AspNetCore.Identity;

namespace Ariadne.Api.Domain;

/// <summary>
/// Pengguna aplikasi. Login memakai email + password lewat ASP.NET Core Identity; email juga menjadi
/// nama pengguna. Peran per tim dan per proyek disimpan terpisah (TeamMember, ProjectMember).
/// </summary>
public sealed class AppUser : IdentityUser<Guid>
{
    public string DisplayName { get; set; } = "";

    /// <summary>Admin aplikasi: kelola pengguna, tim, dan proyek.</summary>
    public bool IsAdmin { get; set; }

    /// <summary>Pilihan tema ("light" / "dark"); kosong = ikuti sistem.</summary>
    public string? Theme { get; set; }

    /// <summary>Pengguna nonaktif tidak bisa masuk; datanya tetap ada.</summary>
    public bool IsActive { get; set; } = true;

    public DateTimeOffset CreatedAt { get; set; }
}
