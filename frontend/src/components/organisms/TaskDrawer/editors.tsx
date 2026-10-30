import { useId, useState } from 'react'
import { Button } from '@/components/atoms/Button'
import { Checkbox } from '@/components/atoms/Checkbox'
import { Select } from '@/components/atoms/Select'
import { TextInput } from '@/components/atoms/TextInput'
import { DateRangeField } from '@/components/molecules/DateRangeField'
import { parseLabels } from '@/lib/taskForm'

interface EditorProps<T> {
  /** Menyimpan; bila gagal (lempar kesalahan) panel tetap terbuka dengan pilihan yang sama. */
  onSave: (value: T) => Promise<unknown>
  close: () => void
  /** Pesan dari server untuk bidang ini. */
  error?: string
}

function Footer({
  saving,
  onCancel,
  onSave,
}: {
  saving: boolean
  onCancel: () => void
  onSave: () => void
}) {
  return (
    <div className="ar-taskdrawer-editor-actions">
      <Button size="sm" variant="primary" disabled={saving} onClick={onSave}>
        Simpan
      </Button>
      <Button size="sm" disabled={saving} onClick={onCancel}>
        Batal
      </Button>
    </div>
  )
}

/** Memanggil onSave dan menutup panel hanya bila berhasil. */
function useSave<T>({ onSave, close }: Pick<EditorProps<T>, 'onSave' | 'close'>) {
  const [saving, setSaving] = useState(false)
  return {
    saving,
    save: async (value: T) => {
      setSaving(true)
      try {
        await onSave(value)
        close()
      } catch {
        // Panel tetap terbuka; pesan server tampil lewat prop `error`
      } finally {
        setSaving(false)
      }
    },
  }
}

export function PeopleEditor({
  people,
  selected,
  ...rest
}: EditorProps<string[]> & {
  people: readonly { id: string; name: string }[]
  selected: readonly string[]
}) {
  const [ids, setIds] = useState<string[]>([...selected])
  const { saving, save } = useSave(rest)
  return (
    <fieldset className="ar-taskdrawer-editor">
      <legend>PIC</legend>
      {people.length === 0 ? (
        <p className="ar-muted">Belum ada anggota proyek yang bisa jadi PIC.</p>
      ) : (
        people.map((p) => (
          <Checkbox
            key={p.id}
            label={p.name}
            checked={ids.includes(p.id)}
            onChange={(e) =>
              setIds((list) =>
                e.target.checked ? [...list, p.id] : list.filter((id) => id !== p.id),
              )
            }
          />
        ))
      )}
      {rest.error ? (
        <p className="ar-taskdrawer-error" role="alert">
          {rest.error}
        </p>
      ) : null}
      <Footer saving={saving} onCancel={rest.close} onSave={() => void save(ids)} />
    </fieldset>
  )
}

export function DatesEditor({
  start,
  end,
  ...rest
}: EditorProps<{ startDate: string | null; dueDate: string | null }> & {
  start: string
  end: string
}) {
  const [range, setRange] = useState({ start, end })
  const { saving, save } = useSave(rest)
  return (
    <div className="ar-taskdrawer-editor">
      <DateRangeField
        label="Tanggal task"
        start={range.start}
        end={range.end}
        invalid={Boolean(rest.error)}
        onChange={setRange}
      />
      {rest.error ? (
        <p className="ar-taskdrawer-error" role="alert">
          {rest.error}
        </p>
      ) : null}
      <Footer
        saving={saving}
        onCancel={rest.close}
        onSave={() => void save({ startDate: range.start || null, dueDate: range.end || null })}
      />
    </div>
  )
}

export function LabelsEditor({
  labels,
  known,
  ...rest
}: EditorProps<string[]> & { labels: readonly string[]; known: readonly string[] }) {
  const [text, setText] = useState(labels.join(', '))
  const { saving, save } = useSave(rest)
  const listId = useId()
  return (
    <div className="ar-taskdrawer-editor">
      <TextInput
        aria-label="Label (pisahkan dengan koma)"
        list={listId}
        autoComplete="off"
        autoFocus
        invalid={Boolean(rest.error)}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <datalist id={listId}>
        {known.map((label) => (
          <option key={label} value={label} />
        ))}
      </datalist>
      <span className="ar-muted">Pisahkan dengan koma, mis. UAT, API.</span>
      {rest.error ? (
        <p className="ar-taskdrawer-error" role="alert">
          {rest.error}
        </p>
      ) : null}
      <Footer saving={saving} onCancel={rest.close} onSave={() => void save(parseLabels(text))} />
    </div>
  )
}

export interface WaitingValue {
  waitingOnUserId: string | null
  waitingOnText: string
}

/** "Menunggu siapa": satu orang di proyek ATAU pihak lain (teks bebas); memilih yang satu mengosongkan yang lain. */
export function WaitingEditor({
  people,
  value,
  ...rest
}: EditorProps<WaitingValue> & {
  people: readonly { id: string; name: string }[]
  value: WaitingValue
}) {
  const [personId, setPersonId] = useState(value.waitingOnUserId ?? '')
  const [text, setText] = useState(value.waitingOnText)
  const { saving, save } = useSave(rest)
  return (
    <div className="ar-taskdrawer-editor">
      <label className="ar-taskdrawer-editor-field">
        Orang di proyek
        <Select
          value={personId}
          onChange={(e) => {
            setPersonId(e.target.value)
            if (e.target.value) setText('')
          }}
        >
          <option value="">Tidak ada</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </label>
      <label className="ar-taskdrawer-editor-field">
        Atau pihak lain
        <TextInput
          maxLength={200}
          placeholder="mis. Klien, tim IT"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            if (e.target.value) setPersonId('')
          }}
        />
      </label>
      {rest.error ? (
        <p className="ar-taskdrawer-error" role="alert">
          {rest.error}
        </p>
      ) : null}
      <Footer
        saving={saving}
        onCancel={rest.close}
        onSave={() => void save({ waitingOnUserId: personId || null, waitingOnText: text.trim() })}
      />
    </div>
  )
}
