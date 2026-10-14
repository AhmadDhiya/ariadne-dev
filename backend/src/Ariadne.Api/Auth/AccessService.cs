using System.Security.Claims;
using Ariadne.Api.Domain;
using Ariadne.Api.Infrastructure.Data;
using Ariadne.Api.Infrastructure.Web;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Ariadne.Api.Auth;

/// <summary>Memuat UserAccess untuk pengguna yang sedang login (sekali per permintaan).</summary>
public sealed class AccessService(AppDbContext db)
{
    private UserAccess? _current;

    public async Task<UserAccess> CurrentAsync(ClaimsPrincipal principal, CancellationToken cancellationToken)
    {
        if (_current is not null)
        {
            return _current;
        }

        var id = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(id, out var userId))
        {
            throw new ApiException(StatusCodes.Status401Unauthorized, "Silakan masuk.");
        }

        var user = await db.Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new { u.IsAdmin, u.IsActive })
            .SingleOrDefaultAsync(cancellationToken);
        if (user is not { IsActive: true })
        {
            throw new ApiException(StatusCodes.Status401Unauthorized, "Silakan masuk.");
        }

        var teams = await db.TeamMembers.AsNoTracking()
            .Where(m => m.UserId == userId)
            .ToDictionaryAsync(m => m.TeamId, m => m.Role, cancellationToken);
        var projects = await db.ProjectMembers.AsNoTracking()
            .Where(m => m.UserId == userId)
            .ToDictionaryAsync(m => m.ProjectId, m => m.Role, cancellationToken);

        _current = new UserAccess(userId, user.IsAdmin, teams, projects);
        return _current;
    }
}

internal static class UserManagerExtensions
{
    /// <summary>Mengubah hasil Identity yang gagal (mis. password terlalu pendek) menjadi kesalahan validasi.</summary>
    public static void ThrowIfFailed(this IdentityResult result, string field)
    {
        if (result.Succeeded)
        {
            return;
        }

        throw new ValidationFailedException(
            field,
            string.Join(" ", result.Errors.Select(e => TranslateError(e.Code, e.Description))));
    }

    // Pesan Identity berbahasa Inggris; yang paling sering muncul diterjemahkan.
    private static string TranslateError(string code, string description) => code switch
    {
        "PasswordTooShort" => "Password minimal 12 karakter.",
        "DuplicateEmail" or "DuplicateUserName" => "Email ini sudah terdaftar.",
        "InvalidEmail" or "InvalidUserName" => "Format email tidak valid.",
        "PasswordMismatch" => "Password saat ini salah.",
        _ => description,
    };
}
