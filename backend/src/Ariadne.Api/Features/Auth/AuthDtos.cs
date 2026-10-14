using Ariadne.Api.Domain;

namespace Ariadne.Api.Features.Auth;

public sealed record LoginRequest(string? Email, string? Password, bool RememberMe);

public sealed record ForgotPasswordRequest(string? Email);

public sealed record ResetPasswordRequest(string? Email, string? Token, string? NewPassword);

public sealed record UpdateMeRequest(string? DisplayName, string? Theme);

public sealed record ChangePasswordRequest(string? CurrentPassword, string? NewPassword);

public sealed record TeamRef(Guid Id, string Name, TeamRole Role);

/// <summary>Data diri pengguna yang sedang login; dipakai frontend untuk menentukan menu dan tampilan.</summary>
public sealed record MeResponse(
    Guid Id,
    string Email,
    string DisplayName,
    bool IsAdmin,
    bool IsSupervisor,
    bool IsGuestOnly,
    string? Theme,
    IReadOnlyList<TeamRef> Teams);

public sealed record MessageResponse(string Message);
