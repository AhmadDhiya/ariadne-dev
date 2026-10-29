using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Ariadne.Api.Infrastructure.Web;

/// <summary>
/// Kesalahan yang sengaja dikembalikan ke pengguna dengan status tertentu. Dilempar dari logika izin dan
/// validasi supaya endpoint tidak penuh cabang if; ApiExceptionHandler mengubahnya menjadi ProblemDetails.
/// </summary>
public class ApiException(int status, string title) : Exception(title)
{
    public int Status { get; } = status;

    public string Title { get; } = title;
}

/// <summary>Tidak berhak melakukan aksi ini (403).</summary>
public sealed class ForbiddenException() : ApiException(StatusCodes.Status403Forbidden, "Anda tidak punya izin untuk aksi ini.");

/// <summary>
/// Data tidak ada, ATAU Anda tidak boleh mengetahui keberadaannya (404). Sengaja memakai pesan yang sama
/// untuk keduanya supaya orang tidak bisa menebak isi proyek atau tim milik orang lain.
/// </summary>
public sealed class NotFoundException() : ApiException(StatusCodes.Status404NotFound, "Data tidak ditemukan.");

/// <summary>Bentrok dengan data yang sudah ada, mis. kode proyek kembar (409).</summary>
public sealed class ConflictException(string title) : ApiException(StatusCodes.Status409Conflict, title);

/// <summary>Input tidak valid (400), dengan daftar pesan per kolom.</summary>
public sealed class ValidationFailedException(IDictionary<string, string[]> errors)
    : ApiException(StatusCodes.Status400BadRequest, "Data yang dikirim tidak valid.")
{
    public IDictionary<string, string[]> Errors { get; } = errors;

    public ValidationFailedException(string field, string message)
        : this(new Dictionary<string, string[]> { [field] = [message] })
    {
    }
}

internal sealed class ApiExceptionHandler(IProblemDetailsService problemDetails) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken cancellationToken)
    {
        // Permintaan rusak (mis. parameter wajib hilang, JSON tidak terbaca) = salah pemanggil, bukan server (400)
        var api = exception switch
        {
            ApiException known => known,
            BadHttpRequestException => new ApiException(StatusCodes.Status400BadRequest, "Permintaan tidak dapat dibaca."),
            _ => null,
        };
        if (api is null)
        {
            return false; // kesalahan tak terduga: ditangani penanganan umum (tanpa detail teknis di luar Development)
        }

        context.Response.StatusCode = api.Status;
        ProblemDetails body = api is ValidationFailedException validation
            ? new ValidationProblemDetails(validation.Errors) { Status = api.Status, Title = api.Title }
            : new ProblemDetails { Status = api.Status, Title = api.Title };

        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = context,
            ProblemDetails = body,
            Exception = null, // jangan bawa detail exception ke respons
        });
    }
}
