using Ariadne.Api.Domain;

namespace Ariadne.Api.Features.Tasks;

public sealed record MentionItem(Guid UserId, string Name);

/// <summary>
/// Satu entri timeline. Teks (Body) dan sorotan @nama (Mentions) terpisah: teks disimpan apa adanya, tidak pernah
/// sebagai HTML, dan layar menyorot bagian "@Nama" yang cocok dengan Mentions.
/// </summary>
public sealed record ActivityItem(
    Guid Id,
    ActivityKind Kind,
    Guid AuthorId,
    string AuthorName,
    bool AuthorIsGuest,
    string? Body,
    IReadOnlyList<MentionItem> Mentions,
    LogKind? LogKind,
    ActivityData? Data,
    DateTimeOffset CreatedAt,
    DateTimeOffset? EditedAt);

/// <summary>Satu halaman timeline, terbaru dulu. NextBefore diisi bila masih ada entri yang lebih lama.</summary>
public sealed record ActivityPage(IReadOnlyList<ActivityItem> Items, long? NextBefore);

/// <summary>Entri baru. Kind: Update, Comment, atau Internal (Log hanya dibuat sistem).</summary>
public sealed record CreateActivityRequest(string? Kind, string? Body, IReadOnlyList<Guid>? MentionUserIds);

/// <summary>Teks dan orang yang ditandai setelah diubah; jenis entri tidak bisa diganti.</summary>
public sealed record UpdateActivityRequest(string? Body, IReadOnlyList<Guid>? MentionUserIds);
