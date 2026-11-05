namespace Ariadne.Api.Domain;

/// <summary>Jenis notifikasi MVP (docs/domain.md, "Notifikasi").</summary>
public enum NotificationKind
{
    /// <summary>Disebut (@nama) di Update, Komentar, atau catatan Internal.</summary>
    Mention,

    /// <summary>Ditugaskan sebagai PIC (task baru atau PIC ditambahkan).</summary>
    Assigned,

    /// <summary>Task dipindahkan ke saya dari PIC lain (dialog "Pindahkan ke…" dengan pilihan kabari).</summary>
    Moved,

    /// <summary>Dibuat job harian 07.00 WIB: task saya jatuh tempo besok.</summary>
    DueTomorrow,

    /// <summary>Dibuat job harian 07.00 WIB: task saya lewat tenggat.</summary>
    Overdue,
}

/// <summary>
/// Satu notifikasi untuk satu penerima. Isi kalimatnya tidak disimpan: disusun saat dibaca dari task dan aktivitas
/// yang dirujuk, supaya hak melihat (mis. Tamu dan catatan Internal) selalu diperiksa ulang dengan keadaan terbaru.
/// </summary>
public sealed class Notification
{
    public Guid Id { get; set; }

    /// <summary>Nomor urut penyisipan (identity database): pemecah urutan bila waktunya sama, dan dasar paging.</summary>
    public long Seq { get; set; }

    public Guid RecipientId { get; set; }

    public NotificationKind Kind { get; set; }

    public Guid TaskId { get; set; }

    /// <summary>Proyek root task: dasar pemeriksaan izin tanpa harus memuat task-nya.</summary>
    public Guid RootProjectId { get; set; }

    /// <summary>Orang yang menyebabkan notifikasi; kosong untuk notifikasi dari job harian.</summary>
    public Guid? ActorId { get; set; }

    /// <summary>Entri yang menyebut (Mention) atau catatan otomatis penugasan/pemindahan.</summary>
    public Guid? ActivityId { get; set; }

    /// <summary>Untuk Terlambat: berapa hari lewat tenggat pada hari notifikasi dibuat.</summary>
    public int LateDays { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset? ReadAt { get; set; }

    /// <summary>Kapan dikirim lewat saluran di luar aplikasi (email). Kosong = belum.</summary>
    public DateTimeOffset? EmailedAt { get; set; }

    /// <summary>
    /// Pencegah dobel untuk notifikasi job harian ("Overdue:{task}:{tanggal}"): unik per penerima, jadi job yang jalan
    /// dua kali di hari yang sama tidak membuat notifikasi kedua. Kosong untuk jenis lain.
    /// </summary>
    public string? DedupeKey { get; set; }

    public AppUser? Recipient { get; set; }

    public AppUser? Actor { get; set; }

    public ProjectTask? Task { get; set; }

    public Activity? Activity { get; set; }
}
