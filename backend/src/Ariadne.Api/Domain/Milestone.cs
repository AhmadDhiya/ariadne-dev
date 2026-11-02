namespace Ariadne.Api.Domain;

/// <summary>
/// Tonggak penting proyek ("UAT SLMS · 5 Okt"): satu tanggal, milik proyek atau sub-proyek, bisa ditandai selesai.
/// Hanya Pengelola proyek dan Admin yang mengelolanya; semua anggota (termasuk Tamu) melihatnya.
/// </summary>
public sealed class Milestone
{
    public Guid Id { get; set; }

    /// <summary>Proyek atau sub-proyek tempat milestone berada.</summary>
    public Guid ProjectId { get; set; }

    /// <summary>Proyek root-nya: dasar izin.</summary>
    public Guid RootProjectId { get; set; }

    public string Name { get; set; } = "";

    public DateOnly Date { get; set; }

    public bool IsDone { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}
