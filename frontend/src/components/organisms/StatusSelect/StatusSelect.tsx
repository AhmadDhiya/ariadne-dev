import { useCallback, useState } from 'react'
import { StatusPill } from '@/components/atoms/StatusPill'
import { Popover } from '@/components/molecules/Popover'
import { Menu } from '@/components/organisms/Menu'
import { STATUSES, type StatusKey } from '@/lib/status'

export interface StatusSelectProps {
  status: StatusKey
  /** Pilihan baru. Status tertahan butuh alasan, jadi pemanggil yang membuka dialog alasannya. */
  onChange: (status: StatusKey) => void
  /** Tanpa hak ubah (Tamu): hanya pill, bukan tombol. */
  canEdit?: boolean
}

/** Pill status yang membuka menu pilihan status (dipakai di daftar yang bukan tabel utama, mis. Hari Ini). */
export function StatusSelect({ status, onChange, canEdit = true }: StatusSelectProps) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  if (!canEdit) return <StatusPill status={status} />

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
          close()
          if (item.status && item.status !== status) onChange(item.status)
        }}
        onClose={close}
      />
    </Popover>
  )
}
