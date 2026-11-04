using Ariadne.Api.Domain;

namespace Ariadne.Api.Features.Invitations;

public sealed record CreateInvitationsRequest(IReadOnlyList<string>? Emails, string? Role, string? Message);

public enum InviteOutcome
{
    /// <summary>Belum punya akun: email undangan dikirim.</summary>
    Diundang,

    /// <summary>Sudah punya akun aktif: langsung menjadi anggota dan diberi tahu lewat email.</summary>
    Ditambahkan,

    SudahAnggota,

    /// <summary>Akun ada tetapi dinonaktifkan Admin: tidak diundang.</summary>
    AkunNonaktif,
}

public sealed record InviteResult(string Email, InviteOutcome Outcome);

/// <summary>Undangan yang masih menunggu, untuk tabel Anggota (hanya Pengelola dan Admin).</summary>
public sealed record InvitationItem(Guid Id, string Email, ProjectRole Role, string InvitedBy, DateTimeOffset CreatedAt, DateTimeOffset ExpiresAt, bool Expired);

public sealed record UpdateInvitationRequest(string? Role);

public sealed record InvitationTokenRequest(string? Token);

/// <summary>Isi halaman terima undangan. HasAccount: email itu sudah punya akun, jadi cukup masuk seperti biasa.</summary>
public sealed record InvitationPreview(string Email, Guid ProjectId, string ProjectName, ProjectRole Role, string InvitedBy, string? Message, bool HasAccount);

public sealed record AcceptInvitationRequest(string? Token, string? DisplayName, string? Password);

/// <summary>SignedIn false = email sudah punya akun; keanggotaan sudah ditambahkan, orangnya masuk dengan password lamanya.</summary>
public sealed record AcceptInvitationResponse(bool SignedIn, Guid ProjectId);
