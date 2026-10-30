import { useState } from 'react'
import { Button } from '@/components/atoms/Button'
import { ActivityItem } from '@/components/molecules/ActivityItem'
import { MentionText } from '@/components/molecules/MentionText'
import { EntryEditor } from '@/components/organisms/EntryEditor'
import type { MentionPerson } from '@/components/organisms/MentionTextArea'
import { logLine } from '@/lib/activityText'
import { formatActivityTime } from '@/lib/dates'
import { withoutGuests } from '@/lib/mentions'
import type { ActivityItem as ActivityData } from '@/types/api'
import './ActivityTimeline.css'

/** Aksi yang boleh dilakukan pengguna ini pada satu entri; server tetap memeriksa ulang. */
export interface EntryPermissions {
  canEdit: boolean
  canDelete: boolean
}

export interface ActivityTimelineProps {
  items: ActivityData[]
  /** Hari ini menurut server ("YYYY-MM-DD"), dasar tulisan "Kemarin". */
  today: string
  loading?: boolean
  /** Pesan kesalahan bila timeline gagal dimuat. */
  error?: string
  onRetry?: () => void
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
  /** Tanpa ini tidak ada tombol Ubah/Hapus (mis. tampilan baca saja). */
  permissionsOf?: (item: ActivityData) => EntryPermissions
  /** Anggota proyek, untuk @mention saat mengubah entri. */
  people?: readonly MentionPerson[]
  onEdit?: (item: ActivityData, body: string, mentionUserIds: string[]) => unknown
  onDelete?: (item: ActivityData) => unknown
  /** Pesan kesalahan dari server untuk ubah/hapus terakhir. */
  entryError?: string
}

const KIND = { Update: 'update', Comment: 'comment', Internal: 'internal', Log: 'log' } as const
const FIELD = {
  Update: 'Ubah update',
  Comment: 'Ubah komentar',
  Internal: 'Ubah catatan internal',
  Log: '',
} as const

/**
 * Timeline aktivitas satu task, terbaru dulu: update, komentar, catatan internal, dan log otomatis.
 * Penulisnya bisa mengubah dan menghapus tulisannya sendiri (Pengelola bisa menghapus tulisan siapa pun); log otomatis tidak.
 * Komponen ini hanya menampilkan; catatan internal sudah disaring server dan tidak pernah dikirim ke Tamu.
 */
export function ActivityTimeline({
  items,
  today,
  loading,
  error,
  onRetry,
  hasMore,
  loadingMore,
  onLoadMore,
  permissionsOf,
  people = [],
  onEdit,
  onDelete,
  entryError,
}: ActivityTimelineProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (loading) return <p role="status">Memuat aktivitas…</p>
  if (error) {
    return (
      <div className="ar-timeline-error" role="alert">
        <p>{error}</p>
        {onRetry ? <Button onClick={onRetry}>Coba lagi</Button> : null}
      </div>
    )
  }
  if (items.length === 0) return <p className="ar-timeline-empty">Belum ada aktivitas.</p>

  async function confirmDelete(item: ActivityData) {
    setBusy(true)
    try {
      await onDelete?.(item)
      setDeletingId(null)
    } catch {
      // Konfirmasi tetap terbuka; pesan dari server tampil lewat `entryError`
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ar-timeline">
      {items.map((item) => {
        const time = formatActivityTime(item.createdAt, today)
        if (item.kind === 'Log') {
          const line = logLine(item)
          return (
            <ActivityItem
              key={item.id}
              kind="log"
              author={item.authorName}
              time={time}
              icon={line.icon}
            >
              {line.text}
            </ActivityItem>
          )
        }

        const allowed = permissionsOf?.(item) ?? { canEdit: false, canDelete: false }
        const editing = editingId === item.id && allowed.canEdit
        const deleting = deletingId === item.id && allowed.canDelete
        const mentionable = item.kind === 'Internal' ? withoutGuests(people) : people

        return (
          <ActivityItem
            key={item.id}
            kind={KIND[item.kind]}
            author={item.authorName}
            time={time}
            guest={item.authorIsGuest}
            edited={item.editedAt !== null}
            footer={
              editing ? null : deleting ? (
                <>
                  <span>Hapus {item.kind === 'Update' ? 'update' : 'entri'} ini?</span>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={busy}
                    onClick={() => void confirmDelete(item)}
                  >
                    Ya, hapus
                  </Button>
                  <Button size="sm" disabled={busy} onClick={() => setDeletingId(null)}>
                    Batal
                  </Button>
                  {entryError ? (
                    <span className="ar-timeline-entryerror" role="alert">
                      {entryError}
                    </span>
                  ) : null}
                </>
              ) : allowed.canEdit || allowed.canDelete ? (
                <>
                  {allowed.canEdit ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Ubah tulisan ${item.authorName} pukul ${time}`}
                      onClick={() => {
                        setDeletingId(null)
                        setEditingId(item.id)
                      }}
                    >
                      Ubah
                    </Button>
                  ) : null}
                  {allowed.canDelete ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Hapus tulisan ${item.authorName} pukul ${time}`}
                      onClick={() => {
                        setEditingId(null)
                        setDeletingId(item.id)
                      }}
                    >
                      Hapus
                    </Button>
                  ) : null}
                </>
              ) : null
            }
          >
            {editing ? (
              <EntryEditor
                initialText={item.body ?? ''}
                people={mentionable}
                label={FIELD[item.kind]}
                error={entryError}
                onCancel={() => setEditingId(null)}
                onSave={async (body, mentionUserIds) => {
                  await onEdit?.(item, body, mentionUserIds)
                  setEditingId(null)
                }}
              />
            ) : (
              <MentionText text={item.body ?? ''} names={item.mentions.map((m) => m.name)} />
            )}
          </ActivityItem>
        )
      })}
      {hasMore ? (
        <Button className="ar-timeline-more" disabled={loadingMore} onClick={onLoadMore}>
          {loadingMore ? 'Memuat…' : 'Tampilkan aktivitas lebih lama'}
        </Button>
      ) : null}
    </div>
  )
}
