namespace Ariadne.Api.Features.Users;

public sealed record UserSummary(
    Guid Id,
    string Email,
    string DisplayName,
    bool IsAdmin,
    bool IsActive,
    bool IsGuest,
    DateTimeOffset CreatedAt,
    IReadOnlyList<string> Teams);

public sealed record CreateUserRequest(string? Email, string? DisplayName, bool IsAdmin);

public sealed record UpdateUserRequest(string? DisplayName, bool? IsAdmin, bool? IsActive);

/// <summary>Hasil pencarian orang untuk ditambahkan ke tim atau proyek.</summary>
public sealed record UserLookupItem(Guid Id, string DisplayName, string Email, string? Hint);
