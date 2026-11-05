namespace Ariadne.Api.Domain;

public enum InvitationStatus
{
    Menunggu,
    Diterima,
    Dibatalkan,
}

/// <summary>
/// Undangan lewat email ke proyek root (docs/domain.md). Orang yang belum punya akun membuka tautan di email,
/// mengisi nama dan password sekali, lalu menjadi anggota dengan peran di undangan. Yang disimpan hanya hash
/// token; token aslinya hanya ada di email.
/// </summary>
public sealed class Invitation
{
    /// <summary>Lama berlaku tautan undangan.</summary>
    public static readonly TimeSpan Lifetime = TimeSpan.FromDays(7);

    public Guid Id { get; set; }

    /// <summary>Proyek root tujuan.</summary>
    public Guid ProjectId { get; set; }

    public string Email { get; set; } = "";

    /// <summary>Email huruf besar (seperti Identity) supaya satu email hanya punya satu undangan aktif per proyek.</summary>
    public string NormalizedEmail { get; set; } = "";

    public ProjectRole Role { get; set; }

    /// <summary>SHA-256 dari token dalam bentuk heksadesimal.</summary>
    public string TokenHash { get; set; } = "";

    public string? Message { get; set; }

    public Guid InvitedById { get; set; }

    public InvitationStatus Status { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset ExpiresAt { get; set; }

    /// <summary>Waktu diterima atau dibatalkan.</summary>
    public DateTimeOffset? ResolvedAt { get; set; }

    public Guid? AcceptedUserId { get; set; }

    public Project? Project { get; set; }

    public AppUser? InvitedBy { get; set; }
}
