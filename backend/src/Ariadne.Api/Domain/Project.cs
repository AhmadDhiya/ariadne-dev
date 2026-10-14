namespace Ariadne.Api.Domain;

/// <summary>
/// Proyek bertingkat: proyek root (kedalaman 0), sub-proyek (1), sub-sub-proyek (2). Maksimal 3 level.
/// Izin dan nomor task berlaku per proyek root.
/// </summary>
public sealed class Project
{
    public const int MaxDepth = 2;

    public Guid Id { get; set; }

    /// <summary>Kosong untuk proyek root.</summary>
    public Guid? ParentId { get; set; }

    /// <summary>Proyek root-nya; untuk proyek root adalah dirinya sendiri. Mempercepat pemeriksaan izin.</summary>
    public Guid RootId { get; set; }

    public int Depth { get; set; }

    public string Name { get; set; } = "";

    /// <summary>Kode proyek (mis. "SEN") untuk ID task; hanya proyek root yang punya.</summary>
    public string? Code { get; set; }

    /// <summary>Nomor task berikutnya; hanya bermakna di proyek root (dipakai mulai Fase 3).</summary>
    public int NextTaskNumber { get; set; } = 1;

    public int SortOrder { get; set; }

    public DateTimeOffset? ArchivedAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}

/// <summary>Keanggotaan di proyek root; izinnya berlaku untuk seluruh sub-proyeknya.</summary>
public sealed class ProjectMember
{
    public Guid ProjectId { get; set; }

    public Guid UserId { get; set; }

    public ProjectRole Role { get; set; }

    public DateTimeOffset AddedAt { get; set; }

    public Project? Project { get; set; }

    public AppUser? User { get; set; }
}
