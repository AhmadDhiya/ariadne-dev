namespace Ariadne.Api.Domain;

/// <summary>Jenis entri aktivitas task (docs/domain.md). Log dibuat otomatis oleh sistem, tiga lainnya ditulis orang.</summary>
public enum ActivityKind
{
    /// <summary>Laporan progres ("Tambah update"). Yang terbaru tampil di kolom "Update terakhir".</summary>
    Update,

    /// <summary>Komentar biasa; terlihat oleh semua anggota proyek termasuk Tamu.</summary>
    Comment,

    /// <summary>Catatan internal tim. TIDAK PERNAH dikirim ke Tamu.</summary>
    Internal,

    /// <summary>Catatan otomatis: status, PIC, tanggal, task dibuat, sub-task ditambah.</summary>
    Log,
}

/// <summary>Apa yang tercatat pada entri Log.</summary>
public enum LogKind
{
    TaskCreated,
    StatusChanged,
    AssigneesChanged,
    DatesChanged,
    SubtaskAdded,
}

/// <summary>
/// Satu entri di timeline aktivitas sebuah task. Log otomatis tidak pernah diubah atau dihapus. Update, komentar, dan
/// catatan internal hanya bisa diubah oleh penulisnya; penulisnya atau Pengelola proyek bisa menghapusnya (disembunyikan,
/// bukan hilang). Ikut tersembunyi bila task-nya dihapus.
/// </summary>
public sealed class Activity
{
    public Guid Id { get; set; }

    /// <summary>Nomor urut penyisipan (identity database): urutan timeline yang pasti dan dasar paging, tanpa risiko waktu kembar.</summary>
    public long Seq { get; set; }

    public Guid TaskId { get; set; }

    /// <summary>Proyek root task: dasar pemeriksaan izin tanpa harus memuat task-nya.</summary>
    public Guid RootProjectId { get; set; }

    public Guid AuthorId { get; set; }

    public ActivityKind Kind { get; set; }

    /// <summary>Isi teks (Update, Comment, Internal). Kosong untuk Log.</summary>
    public string? Body { get; set; }

    /// <summary>Hanya untuk Log.</summary>
    public LogKind? LogKind { get; set; }

    /// <summary>Data terstruktur entri Log (status lama → baru, PIC lama → baru, tanggal lama → baru).</summary>
    public ActivityData? Data { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    /// <summary>Terakhir diubah oleh penulisnya; kosong bila tidak pernah diubah. Teks sebelumnya tidak disimpan.</summary>
    public DateTimeOffset? EditedAt { get; set; }

    /// <summary>Dihapus = disembunyikan di semua tampilan, tetapi barisnya tetap ada (sama seperti task).</summary>
    public DateTimeOffset? DeletedAt { get; set; }

    public ProjectTask? Task { get; set; }

    public AppUser? Author { get; set; }

    public List<Mention> Mentions { get; set; } = [];
}

/// <summary>Orang yang ditandai (@nama) dalam sebuah entri. Nama disimpan agar sorotan di teks tetap cocok walau nama berubah.</summary>
public sealed class Mention
{
    public Guid ActivityId { get; set; }

    public Guid UserId { get; set; }

    public string DisplayName { get; set; } = "";

    public Activity? Activity { get; set; }

    public AppUser? User { get; set; }
}

/// <summary>Isi terstruktur entri Log; hanya bagian yang relevan dengan jenisnya yang terisi.</summary>
public sealed record ActivityData
{
    /// <summary>StatusChanged: nama status (WorkStatus) sebelum dan sesudah.</summary>
    public string? From { get; init; }

    public string? To { get; init; }

    /// <summary>StatusChanged ke status tertahan: alasan yang dicatat.</summary>
    public string? Reason { get; init; }

    /// <summary>AssigneesChanged: nama PIC yang ditambahkan dan dicopot.</summary>
    public IReadOnlyList<string>? Added { get; init; }

    public IReadOnlyList<string>? Removed { get; init; }

    /// <summary>DatesChanged: tanggal (yyyy-MM-dd) sebelum dan sesudah; null = kosong.</summary>
    public string? FromStart { get; init; }

    public string? FromDue { get; init; }

    public string? ToStart { get; init; }

    public string? ToDue { get; init; }

    /// <summary>SubtaskAdded: kunci dan judul sub-task ("SEN-122").</summary>
    public string? Key { get; init; }

    public string? Title { get; init; }
}
