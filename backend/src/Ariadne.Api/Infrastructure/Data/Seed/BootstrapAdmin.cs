using Ariadne.Api.Domain;
using Ariadne.Api.Infrastructure.Clock;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Ariadne.Api.Infrastructure.Data.Seed;

/// <summary>
/// Membuat admin pertama saat database masih tanpa pengguna, di lingkungan mana pun (termasuk produksi),
/// lewat Bootstrap:AdminEmail dan Bootstrap:AdminPassword dari environment variable. Tanpa ini aplikasi
/// yang baru dipasang tidak punya cara masuk. Setelah ada pengguna, pengaturannya diabaikan.
/// </summary>
internal static partial class BootstrapAdmin
{
    public static async Task CreateIfConfiguredAsync(this WebApplication app)
    {
        var email = app.Configuration["Bootstrap:AdminEmail"];
        var password = app.Configuration["Bootstrap:AdminPassword"];
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            return;
        }

        await using var scope = app.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        if (await db.Users.AnyAsync())
        {
            return;
        }

        var users = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();
        var clock = scope.ServiceProvider.GetRequiredService<IClock>();
        var admin = new AppUser
        {
            Id = Guid.NewGuid(),
            UserName = email,
            Email = email,
            EmailConfirmed = true,
            DisplayName = "Admin",
            IsAdmin = true,
            IsActive = true,
            CreatedAt = clock.UtcNow,
        };

        var result = await users.CreateAsync(admin, password);
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger(nameof(BootstrapAdmin));
        if (!result.Succeeded)
        {
            // Hanya kode galat (mis. PasswordTooShort); tidak pernah mencatat email atau password
            LogFailed(logger, string.Join(",", result.Errors.Select(e => e.Code)));
            return;
        }

        LogCreated(logger);
    }

    [LoggerMessage(Level = LogLevel.Information, Message = "Admin pertama dibuat dari Bootstrap:AdminEmail")]
    private static partial void LogCreated(ILogger logger);

    [LoggerMessage(Level = LogLevel.Error, Message = "Admin pertama gagal dibuat: {ErrorCodes}")]
    private static partial void LogFailed(ILogger logger, string errorCodes);
}
