using System.Net.Mail;

namespace Ariadne.Api.Infrastructure.Web;

/// <summary>Pemeriksaan input yang berulang. Validasi sebenarnya selalu di server (pedoman C3).</summary>
public static class Validate
{
    /// <summary>Teks wajib diisi dan tidak melebihi batas; mengembalikan teks yang sudah dirapikan.</summary>
    public static string Text(string field, string? value, int maxLength, string label)
    {
        var trimmed = value?.Trim() ?? "";
        if (trimmed.Length == 0)
        {
            throw new ValidationFailedException(field, $"{label} wajib diisi.");
        }

        if (trimmed.Length > maxLength)
        {
            throw new ValidationFailedException(field, $"{label} maksimal {maxLength} karakter.");
        }

        return trimmed;
    }

    public static string Email(string field, string? value)
    {
        var trimmed = Text(field, value, 254, "Email");
        if (!MailAddress.TryCreate(trimmed, out var address) || address.Address != trimmed || !trimmed.Contains('.', StringComparison.Ordinal))
        {
            throw new ValidationFailedException(field, "Format email tidak valid.");
        }

        return trimmed;
    }

    /// <summary>
    /// Nilai harus persis salah satu nama enum ("Pengelola"). Angka ("0") dan huruf kecil ditolak: Enum.TryParse
    /// menerima angka apa pun, termasuk yang bukan nama peran, jadi tidak dipakai langsung.
    /// </summary>
    public static TEnum Enum<TEnum>(string field, string? value, string label)
        where TEnum : struct, Enum
    {
        if (value is null || !System.Enum.GetNames<TEnum>().Contains(value, StringComparer.Ordinal))
        {
            throw new ValidationFailedException(field, $"{label} tidak dikenal.");
        }

        return System.Enum.Parse<TEnum>(value);
    }
}
