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
