namespace Ariadne.Api.Domain;

/// <summary>Peran seseorang di dalam sebuah tim (docs/domain.md).</summary>
public enum TeamRole
{
    Supervisor,
    Anggota,
}

/// <summary>Peran seseorang di sebuah proyek root; berlaku untuk seluruh sub-proyeknya.</summary>
public enum ProjectRole
{
    Pengelola,
    Anggota,
    Tamu,
}

/// <summary>
/// Status task (docs/domain.md). Namanya WorkStatus karena TaskStatus sudah dipakai .NET.
/// Urutan nilai = urutan tampil di menu status.
/// </summary>
public enum WorkStatus
{
    NotStarted,
    OnProgress,
    Fixing,
    Blocked,
    OnHold,
    OnRequest,
    Done,
    Rutin,
}

/// <summary>Prioritas task; urutan nilai = urutan penting (Critical paling atas).</summary>
public enum Priority
{
    Critical,
    High,
    Medium,
    Low,
}
