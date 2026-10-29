import { Avatar } from '@/components/atoms/Avatar'
import { EditablePopover } from '@/components/molecules/EditablePopover'
import { EditableText } from '@/components/molecules/EditableText'
import { formatShortDateOfInstant } from '@/lib/dates'
import { getStatus, statusFromApi } from '@/lib/status'
import type { TaskRow } from '@/types/api'
import { WaitingEditor, type WaitingValue } from './editors'

export interface HoldValues extends WaitingValue {
  holdReason: string
}

export interface HoldBlockProps {
  task: TaskRow
  canEdit: boolean
  /** Anggota proyek yang bisa ditunggu (semua peran). */
  people: readonly { id: string; name: string }[]
  /** Menyimpan alasan dan/atau "menunggu siapa" tanpa mengubah status. */
  onSave: (values: HoldValues) => Promise<unknown>
  /** Pesan dari server per bidang: holdReason, waitingOnUserId, waitingOnText. */
  fieldErrors?: Record<string, string>
}

/**
 * Kotak alasan di bawah kolom bidang untuk task tertahan (Blocked, On Hold, On Request): alasan wajib dan
 * "menunggu siapa" opsional. Pengelola dan Anggota mengubahnya di tempat; Tamu hanya membaca.
 */
export function HoldBlock({ task, canEdit, people, onSave, fieldErrors = {} }: HoldBlockProps) {
  const status = getStatus(statusFromApi(task.status))
  const reason = task.holdReason ?? ''
  const waiting: WaitingValue = {
    waitingOnUserId: task.waitingOnUserId,
    waitingOnText: task.waitingOnUserId ? '' : (task.waitingOn ?? ''),
  }
  const since = task.heldSince ? formatShortDateOfInstant(task.heldSince) : null

  if (!canEdit) {
    return (
      <section className={`ar-hold-block is-${status.key}`} aria-label="Alasan tertahan">
        <h3>Alasan tertahan</h3>
        <p className="ar-hold-reason">{reason}</p>
        {task.waitingOn || since ? (
          <p className="ar-hold-meta">
            {task.waitingOn ? (
              <>
                Menunggu: <b>{task.waitingOn}</b>
              </>
            ) : null}
            {task.waitingOn && since ? ' · ' : null}
            {since ? `sejak ${since}` : null}
          </p>
        ) : null}
      </section>
    )
  }

  return (
    <section className={`ar-hold-block is-${status.key}`} aria-label="Alasan tertahan">
      <div className="ar-hold-field">
        <h3>
          Alasan tertahan <span aria-hidden="true">*</span>
        </h3>
        <EditableText
          label="Alasan tertahan"
          multiline
          required
          maxLength={1000}
          value={reason}
          canEdit
          error={fieldErrors.holdReason}
          onSave={(next) => onSave({ holdReason: next, ...waiting })}
        />
      </div>
      <div className="ar-hold-wait">
        <h3>Menunggu siapa</h3>
        <EditablePopover
          label="Menunggu siapa"
          canEdit
          display={
            task.waitingOn ? (
              <>
                {task.waitingOnIsPerson ? <Avatar name={task.waitingOn} size={22} /> : null}
                {task.waitingOn}
              </>
            ) : (
              <span className="ar-muted">Belum diisi</span>
            )
          }
        >
          {(close) => (
            <WaitingEditor
              people={people}
              value={waiting}
              close={close}
              error={fieldErrors.waitingOnText ?? fieldErrors.waitingOnUserId}
              onSave={(value) => onSave({ holdReason: reason, ...value })}
            />
          )}
        </EditablePopover>
        {since ? <span className="ar-hold-since">sejak {since}</span> : null}
      </div>
    </section>
  )
}
