namespace Ariadne.Api.Domain;

/// <summary>
/// Satu task. Disebut ProjectTask karena Task sudah dipakai .NET. Task punya paling banyak satu tingkat
/// sub-task (sub-task tidak boleh punya sub-task). Dihapus = disembunyikan (DeletedAt), bukan hilang.
/// </summary>
public sealed class ProjectTask
{
    public Guid Id { get; set; }

    /// <summary>Proyek atau sub-proyek tempat task berada.</summary>
    public Guid ProjectId { get; set; }

    /// <summary>Proyek root-nya: dasar izin dan nomor task.</summary>
    public Guid RootProjectId { get; set; }

    /// <summary>Nomor berjalan per proyek root (115 → SEN-115).</summary>
    public int Number { get; set; }

    public Guid? ParentTaskId { get; set; }

    public string Title { get; set; } = "";

    public string? Description { get; set; }

    public WorkStatus Status { get; set; }

    public Priority Priority { get; set; }

    public DateOnly? StartDate { get; set; }

    public DateOnly? DueDate { get; set; }

    /// <summary>Wajib bila status tertahan (Blocked, OnHold, OnRequest); kosong bila tidak.</summary>
    public string? HoldReason { get; set; }

    /// <summary>"Menunggu siapa": orang di proyek ini, atau teks bebas (mis. "Klien, tim IT"). Paling banyak salah satu.</summary>
    public Guid? WaitingOnUserId { get; set; }

    public string? WaitingOnText { get; set; }

    /// <summary>Diisi otomatis saat task masuk status tertahan.</summary>
    public DateTimeOffset? HeldSince { get; set; }

    public int SortOrder { get; set; }

    public Guid CreatedById { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    public DateTimeOffset? DeletedAt { get; set; }

    /// <summary>Penanda versi baris (kolom sistem xmin PostgreSQL): dua orang menyimpan bersamaan tidak saling menimpa diam-diam.</summary>
    public uint Version { get; set; }

    public Project? Project { get; set; }

    public List<TaskAssignee> Assignees { get; set; } = [];

    public List<TaskLabel> Labels { get; set; } = [];
}

/// <summary>PIC (penanggung jawab); satu task boleh punya banyak.</summary>
public sealed class TaskAssignee
{
    public Guid TaskId { get; set; }

    public Guid UserId { get; set; }

    public ProjectTask? Task { get; set; }

    public AppUser? User { get; set; }
}

/// <summary>Label milik satu proyek root; namanya unik tanpa membedakan huruf besar/kecil.</summary>
public sealed class Label
{
    public Guid Id { get; set; }

    public Guid RootProjectId { get; set; }

    public string Name { get; set; } = "";

    /// <summary>Nama dalam huruf kecil; dasar keunikan dan pencarian.</summary>
    public string NormalizedName { get; set; } = "";
}

public sealed class TaskLabel
{
    public Guid TaskId { get; set; }

    public Guid LabelId { get; set; }

    public ProjectTask? Task { get; set; }

    public Label? Label { get; set; }
}
