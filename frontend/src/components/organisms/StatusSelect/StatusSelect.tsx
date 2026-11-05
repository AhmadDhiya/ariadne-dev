import { useCallback, useState } from 'react'
import { Icon } from '@/components/atoms/Icon'
import { StatusPill } from '@/components/atoms/StatusPill'
import { Popover } from '@/components/molecules/Popover'
import { Dialog } from '@/components/organisms/Dialog'
import { Menu } from '@/components/organisms/Menu'
import { MOBILE_QUERY, useMediaQuery } from '@/hooks/useMediaQuery'
import { STATUSES, type StatusKey } from '@/lib/status'
import './StatusSelect.css'

export interface StatusSelectProps {
  status: StatusKey
  /** Pilihan baru. Status tertahan butuh alasan, jadi pemanggil yang membuka dialog alasannya. */
  onChange: (status: StatusKey) => void
  /** Tanpa hak ubah (Tamu): hanya pill, bukan tombol. */
  canEdit?: boolean
  /** Task yang diubah, untuk judul sheet di layar sempit (mis. "SEN-115" dan "Pipeline GitLab IRS"). */
  taskKey?: string
  taskTitle?: string
}

/**
 * Pill status yang membuka menu pilihan status (dipakai di daftar yang bukan tabel utama, mis. Hari Ini).
 * Di layar sempit (mockup 11) pilihannya dibuka sebagai sheet dari bawah dengan baris yang mudah disentuh.
 */
export function StatusSelect({
  status,
  onChange,
  canEdit = true,
  taskKey,
  taskTitle,
}: StatusSelectProps) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const mobile = useMediaQuery(MOBILE_QUERY)

  if (!canEdit) return <StatusPill status={status} />

  function pick(next: StatusKey) {
    close()
    if (next !== status) onChange(next)
  }

  if (mobile) {
    return (
      <>
        <button
          type="button"
          className="ar-statussheet-trigger"
          aria-label={`Ubah status${taskKey ? ` ${taskKey}` : ''}`}
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
        >
          <StatusPill status={status} />
          <Icon name="chevron-down" size={14} />
        </button>
        <Dialog
          open={open}
          onClose={close}
          title={taskTitle ? `Ubah status — ${taskTitle}` : 'Ubah status'}
          description={taskKey}
        >
          <div className="ar-statussheet" role="group" aria-label="Pilihan status">
            {STATUSES.map((s) => (
              <button
                key={s.key}
                type="button"
                className="ar-statussheet-opt"
                aria-pressed={s.key === status}
                onClick={() => pick(s.key)}
              >
                <StatusPill status={s.key} />
                {s.key === status ? (
                  <span className="ar-statussheet-check">
                    <Icon name="check" size={18} />
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </Dialog>
      </>
    )
  }

  return (
    <Popover
      open={open}
      onClose={close}
      anchor={<StatusPill status={status} select open={open} onClick={() => setOpen((o) => !o)} />}
    >
      <Menu
        title="Ubah status"
        width={200}
        items={STATUSES.map((s) => ({ status: s.key, selected: s.key === status }))}
        activeIndex={STATUSES.findIndex((s) => s.key === status)}
        autoFocus
        onSelect={(item) => {
          if (item.status) pick(item.status)
          else close()
        }}
        onClose={close}
      />
    </Popover>
  )
}
