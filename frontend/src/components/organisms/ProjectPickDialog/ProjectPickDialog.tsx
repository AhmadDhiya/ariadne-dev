import { useId, useState, type FormEvent } from 'react'
import { Button } from '@/components/atoms/Button'
import { Select } from '@/components/atoms/Select'
import { FormField } from '@/components/molecules/FormField'
import { Dialog } from '@/components/organisms/Dialog'
import './ProjectPickDialog.css'

export interface ProjectPickDialogProps {
  open: boolean
  onClose: () => void
  /** Proyek tempat pengguna boleh membuat task (Pengelola atau Anggota). */
  projects: readonly { id: string; name: string }[]
  /** Proyek yang dipilih; pemanggil lalu membuka form task untuk proyek itu. */
  onPick: (projectId: string) => void
}

/** "Tambah task" dari dashboard: pilih proyeknya dulu. Dengan satu proyek saja, pemanggil tidak perlu membuka ini. */
export function ProjectPickDialog(props: ProjectPickDialogProps) {
  const { open, onClose, projects } = props
  const formId = useId()

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Tambah task di proyek mana?"
      description="Pilih proyek dulu; sub-proyek dipilih di form berikutnya."
      width={440}
      footer={
        <div className="ar-projectpick-footer">
          <Button onClick={onClose}>Batal</Button>
          <Button variant="primary" type="submit" form={formId} disabled={projects.length === 0}>
            Lanjut
          </Button>
        </div>
      }
    >
      {open ? <PickForm {...props} formId={formId} /> : null}
    </Dialog>
  )
}

function PickForm({ projects, onPick, formId }: ProjectPickDialogProps & { formId: string }) {
  const [id, setId] = useState(projects[0]?.id ?? '')

  function submit(e: FormEvent) {
    e.preventDefault()
    if (id) onPick(id)
  }

  if (projects.length === 0) {
    return (
      <p className="ar-muted">
        Anda belum menjadi Pengelola atau Anggota di proyek mana pun, jadi belum bisa menambah task.
      </p>
    )
  }

  return (
    <form id={formId} onSubmit={submit}>
      <FormField label="Proyek" required>
        {(field) => (
          <Select {...field} value={id} onChange={(e) => setId(e.target.value)}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        )}
      </FormField>
    </form>
  )
}
