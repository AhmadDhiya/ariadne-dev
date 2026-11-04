import { useId, useState, type FormEvent } from 'react'
import { Avatar } from '@/components/atoms/Avatar'
import { Button } from '@/components/atoms/Button'
import { Checkbox } from '@/components/atoms/Checkbox'
import { HeatCell } from '@/components/atoms/HeatCell'
import { Radio } from '@/components/atoms/Radio'
import { SearchField } from '@/components/molecules/SearchField'
import { Dialog } from '@/components/organisms/Dialog'
import { cx } from '@/lib/cx'
import { loadSummary, rankCandidates } from '@/lib/moveTask'
import type { MoveCandidates } from '@/types/api'
import './MoveTaskDialog.css'

export interface MoveTaskDialogProps {
  open: boolean
  onClose: () => void
  /** Task yang dipindahkan, mis. "SEN-150 Uji beban Dispatch". */
  taskLabel: string
  /** Keterangan tambahan di bawah judul, mis. "29 Sep – 1 Okt · saat ini: Rama". */
  context?: string
  /** PIC yang tugasnya dipindahkan; tidak muncul sebagai calon. */
  from: { id: string; name: string }
  /** Calon penerima dan beban hariannya (dari server); kosong selama dimuat. */
  candidates?: MoveCandidates
  loading?: boolean
  /** Pesan bila calon gagal dimuat. */
  loadError?: string
  submitting?: boolean
  /** Pesan dari server saat memindahkan (mis. penerima tidak sah). */
  error?: string
  onSubmit: (input: { toUserId: string; notify: boolean }) => void
}

/** Dialog "Pindahkan ke…" (mockup 06a): pilih penerima dengan beban harinya, ringkasan beban, dan opsi kabari. */
export function MoveTaskDialog({
  open,
  onClose,
  taskLabel,
  context,
  from,
  candidates,
  loading,
  loadError,
  submitting,
  error,
  onSubmit,
}: MoveTaskDialogProps) {
  const formId = useId()
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<string | null>(null)
  const [notify, setNotify] = useState(true)

  // Isian kembali bersih setiap kali dialog dibuka (pola "menyesuaikan state saat render")
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setQuery('')
      setPicked(null)
      setNotify(true)
    }
  }

  const all = candidates ? rankCandidates(candidates.candidates, from.id) : []
  const shown = candidates ? rankCandidates(candidates.candidates, from.id, query) : []
  // Tanpa pilihan, yang paling longgar terpilih lebih dulu (seperti mockup)
  const selected = all.find((c) => c.userId === (picked ?? all[0]?.userId))

  function submit(e: FormEvent) {
    e.preventDefault()
    if (selected && !submitting) onSubmit({ toUserId: selected.userId, notify })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Pindahkan ke…"
      description={
        <>
          {taskLabel}
          {context ? <> · {context}</> : null}
        </>
      }
      width={480}
      footer={
        <div className="ar-movetask-footer">
          <Button onClick={onClose}>Batal</Button>
          <Button
            variant="primary"
            type="submit"
            form={formId}
            icon="move"
            disabled={!selected || submitting}
          >
            {selected ? `Pindahkan ke ${selected.name}` : 'Pindahkan'}
          </Button>
        </div>
      }
    >
      <form id={formId} className="ar-movetask" onSubmit={submit} noValidate>
        <SearchField
          placeholder="Cari anggota"
          aria-label="Cari anggota"
          value={query}
          onValueChange={setQuery}
          width="100%"
        />

        {loading ? (
          <p role="status" className="ar-movetask-note">
            Memuat calon penerima…
          </p>
        ) : loadError ? (
          <p role="alert" className="ar-movetask-note is-error">
            {loadError}
          </p>
        ) : shown.length === 0 ? (
          <p className="ar-movetask-note">
            {all.length === 0
              ? 'Tidak ada anggota lain yang bisa menerima task ini.'
              : 'Tidak ada anggota yang cocok.'}
          </p>
        ) : (
          <div role="radiogroup" aria-label="Penerima" className="ar-movetask-list">
            {shown.map((person) => (
              <label
                key={person.userId}
                className={cx(
                  'ar-movetask-row',
                  person.userId === selected?.userId && 'is-selected',
                )}
              >
                <Radio
                  name="penerima"
                  aria-label={person.name}
                  checked={person.userId === selected?.userId}
                  onChange={() => setPicked(person.userId)}
                />
                <Avatar name={person.name} size={24} />
                <span className="ar-movetask-name">{person.name}</span>
                <span className="ar-movetask-cells" aria-label={`Beban ${person.name} per hari`}>
                  {person.counts.slice(0, 7).map((count, i) => (
                    <HeatCell key={i} count={count} width={20} />
                  ))}
                </span>
                <span
                  className={cx(
                    'ar-movetask-meta',
                    person.loosest && 'is-loose',
                    person.busy && !person.loosest && 'is-busy',
                  )}
                >
                  {person.loosest
                    ? 'paling longgar'
                    : person.busy
                      ? 'padat'
                      : person.isAssignee
                        ? 'sudah PIC'
                        : ''}
                </span>
              </label>
            ))}
          </div>
        )}

        {candidates && selected ? (
          <p className="ar-movetask-summary">
            {loadSummary(candidates.start, candidates.dayCount, selected)}
          </p>
        ) : null}

        <Checkbox
          label={`Kabari ${from.name}${selected ? ` dan ${selected.name}` : ''} lewat notifikasi`}
          checked={notify}
          onChange={(e) => setNotify(e.target.checked)}
        />

        {error ? (
          <p role="alert" className="ar-movetask-note is-error">
            {error}
          </p>
        ) : null}
      </form>
    </Dialog>
  )
}
