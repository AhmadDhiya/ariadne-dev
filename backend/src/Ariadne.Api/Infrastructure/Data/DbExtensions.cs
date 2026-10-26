using Ariadne.Api.Infrastructure.Web;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Ariadne.Api.Infrastructure.Data;

internal static class DbExtensions
{
    /// <summary>
    /// Menyimpan perubahan; bila melanggar indeks unik (mis. dua orang membuat tim bernama sama bersamaan),
    /// hasilnya 409 dengan pesan yang jelas, bukan error 500 (pedoman E3).
    /// </summary>
    public static async Task SaveOrConflictAsync(this AppDbContext db, string conflictMessage, CancellationToken ct)
    {
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException exception) when (exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            throw new ConflictException(conflictMessage);
        }
    }
}
