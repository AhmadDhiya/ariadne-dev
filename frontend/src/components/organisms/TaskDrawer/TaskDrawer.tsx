import type { ReactNode } from 'react'
import { Avatar } from '@/components/atoms/Avatar'
import { Button } from '@/components/atoms/Button'
import { DueDate } from '@/components/atoms/DueDate'
import { Icon } from '@/components/atoms/Icon'
import { IconButton } from '@/components/atoms/IconButton'
import { Label } from '@/components/atoms/Label'
import { PriorityIcon } from '@/components/atoms/PriorityIcon'
import { StatusPill } from '@/components/atoms/StatusPill'
import { EditablePopover } from '@/components/molecules/EditablePopover'
import { EditableText } from '@/components/molecules/EditableText'
import {
  ActivityTimeline,
  type ActivityTimelineProps,
} from '@/components/organisms/ActivityTimeline'
import {
  CommentComposer,
  type ComposerEntry,
  type ComposerKind,
  type ComposerPerson,
} from '@/components/organisms/CommentComposer'
import { Drawer } from '@/components/organisms/Drawer'
import { formatShortDate } from '@/lib/dates'
import {
  PRIORITIES,
  PRIORITY_NAMES,
  STATUSES,
  priorityFromApi,
  statusFromApi,
  isHeld,
  type StatusKey,
} from '@/lib/status'
import type { PriorityName, TaskDetail } from '@/types/api'
import { DatesEditor, LabelsEditor, PeopleEditor } from './editors'
import { HoldBlock, type HoldValues } from './HoldBlock'
import { PickMenu } from './PickMenu'
import { SubtaskList } from './SubtaskList'
import './TaskDrawer.css'

/** Perubahan field task dari drawer; yang tidak diisi tidak diubah. */
export interface TaskFieldChanges {
  title?: string
  description?: string
  priority?: PriorityName
  projectId?: string
  labels?: string[]
  assigneeIds?: string[]
  dates?: { startDate: string | null; dueDate: string | null }
}

export interface TaskDrawerProps {
  open: boolean
  onClose: () => void
  /** Rincian task; kosong selama dimuat atau gagal dimuat. */
  detail?: TaskDetail
  loading?: boolean
  /** Pesan bila task tidak bisa dibuka (tidak ada, atau tidak boleh dilihat). */
  loadError?: string
  onRetry?: () => void
  /** Semua anggota proyek beserta perannya (untuk PIC, "menunggu siapa", dan @mention). */
  people: readonly ComposerPerson[]
  /** Label yang sudah ada di proyek, sebagai saran ketikan. */
  knownLabels: readonly string[]
  /** Pilihan sub-proyek tempat task bisa dipindah (kosong atau satu = tidak ada pilihan). */
  subProjects: readonly { id: string; label: string }[]
  timeline: Omit<ActivityTimelineProps, 'today'>
  /** Pesan server per bidang (title, description, assigneeIds, dueDate, labels, holdReason, …). */
  fieldErrors?: Record<string, string>
  /** Pesan kesalahan umum untuk perubahan yang tidak punya tempat sendiri (prioritas, pindah sub-proyek). */
  formError?: string
  /** Pesan bila entri tidak bisa dikirim. */
  postError?: string
  onSave: (changes: TaskFieldChanges) => Promise<unknown>
  /** Status tertahan butuh alasan, jadi pilihannya diteruskan ke induk yang membuka dialog alasan. */
  onChangeStatus: (status: StatusKey) => void
  onSaveHold: (values: HoldValues) => Promise<unknown>
  onPostActivity: (entry: ComposerEntry) => Promise<unknown>
  /** Membuka task lain (sub-task atau induknya) di drawer yang sama. */
  onOpenTask: (key: string) => void
  onAddSubtask: () => void
  onDelete: () => void
  onCopyLink: () => void
}

const STATUS_ITEMS = (current: StatusKey) =>
  STATUSES.map((s) => ({ status: s.key, selected: s.key === current }))

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </>
  )
}

/**
 * Drawer detail task (mockup 05): semua field diubah di tempat, blok alasan tertahan, sub-task, timeline aktivitas,
 * dan kotak menulis. Pengelola dan Anggota mengubah; Tamu hanya membaca dan berkomentar (kontrol edit disembunyikan,
 * bukan dinonaktifkan). Komponen ini tidak memanggil API; semuanya lewat props.
 */
export function TaskDrawer({
  open,
  onClose,
  detail,
  loading,
  loadError,
  onRetry,
  people,
  knownLabels,
  subProjects,
  timeline,
  fieldErrors = {},
  formError,
  postError,
  onSave,
  onChangeStatus,
  onSaveHold,
  onPostActivity,
  onOpenTask,
  onAddSubtask,
  onDelete,
  onCopyLink,
}: TaskDrawerProps) {
  const task = detail?.task
  const canEdit = detail?.canEdit ?? false
  const isSubtask = Boolean(detail?.parent)
  const status = task ? statusFromApi(task.status) : undefined
  const assignable = people.filter((p) => p.role !== 'Tamu')
  const quick = (changes: TaskFieldChanges) => void onSave(changes).catch(() => undefined)

  const composerKinds: ComposerKind[] = canEdit ? ['Update', 'Comment', 'Internal'] : ['Comment']
  const banner = formError ?? fieldErrors.priority ?? fieldErrors.projectId

  // Menu "…": Tamu hanya bisa menyalin tautan; kontrol ubah/hapus disembunyikan, bukan dinonaktifkan
  const menuActions = [
    { label: 'Salin tautan', run: onCopyLink },
    ...(canEdit && !isSubtask
      ? [{ label: 'Tambah sub-task', icon: 'plus' as const, run: onAddSubtask }]
      : []),
    ...(canEdit ? [{ label: 'Hapus task', icon: 'x' as const, run: onDelete }] : []),
  ]
  const actions = detail ? (
    <PickMenu
      title="Aksi lain"
      width={200}
      trigger={(menuOpen, toggle) => (
        <IconButton
          icon="more"
          size="sm"
          label="Aksi lain"
          aria-expanded={menuOpen}
          onClick={toggle}
        />
      )}
      items={menuActions.map(({ label, ...rest }) => ({
        label,
        icon: 'icon' in rest ? rest.icon : undefined,
      }))}
      activeIndex={0}
      onSelect={(index) => menuActions[index]?.run()}
    />
  ) : undefined

  const eyebrow = task ? (
    <>
      <span className="ar-id">{task.key}</span>
      <span>{detail?.projectPath.join(' / ')}</span>
      {detail?.parent ? (
        <button
          type="button"
          className="ar-taskdrawer-parent"
          onClick={() => onOpenTask(detail.parent?.key ?? '')}
        >
          Sub-task dari {detail.parent.key}
        </button>
      ) : null}
    </>
  ) : undefined

  const footer =
    detail && detail.canComment ? (
      <CommentComposer
        kinds={composerKinds}
        people={people}
        error={postError}
        onSubmit={onPostActivity}
      />
    ) : detail ? (
      <p className="ar-muted">
        Anda melihat task ini sebagai Admin. Hanya anggota proyek yang bisa menulis di sini.
      </p>
    ) : undefined

  return (
    <Drawer
      open={open}
      onClose={onClose}
      ariaLabel={task ? `${task.key} ${task.title}` : 'Detail task'}
      title={
        task ? (
          <EditableText
            label="Judul"
            value={task.title}
            canEdit={canEdit}
            required
            maxLength={200}
            error={fieldErrors.title}
            onSave={(title) => onSave({ title })}
          />
        ) : (
          'Detail task'
        )
      }
      eyebrow={eyebrow}
      actions={actions}
      footer={footer}
    >
      {loading ? <p role="status">Memuat task…</p> : null}
      {loadError ? (
        <div className="ar-taskdrawer-error" role="alert">
          <p>{loadError}</p>
          {onRetry ? <Button onClick={onRetry}>Coba lagi</Button> : null}
        </div>
      ) : null}
      {detail && task && status ? (
        <div className="ar-taskdrawer">
          {banner ? (
            <p className="ar-taskdrawer-error" role="alert">
              {banner}
            </p>
          ) : null}

          <dl className="ar-taskdrawer-fields">
            <Field label="Status">
              {canEdit ? (
                <PickMenu
                  title="Ubah status"
                  items={STATUS_ITEMS(status)}
                  activeIndex={STATUSES.findIndex((s) => s.key === status)}
                  trigger={(menuOpen, toggle) => (
                    <StatusPill status={status} select open={menuOpen} onClick={toggle} />
                  )}
                  onSelect={(index) => {
                    const next = STATUSES[index]
                    if (next && next.key !== status) onChangeStatus(next.key)
                  }}
                />
              ) : (
                <StatusPill status={status} />
              )}
            </Field>

            <Field label="Prioritas">
              {canEdit ? (
                <PickMenu
                  title="Ubah prioritas"
                  width={180}
                  items={PRIORITIES.map((p) => ({
                    icon: `priority-${p.key}` as const,
                    label: p.label,
                    selected: p.key === priorityFromApi(task.priority),
                  }))}
                  activeIndex={PRIORITIES.findIndex(
                    (p) => p.key === priorityFromApi(task.priority),
                  )}
                  trigger={(menuOpen, toggle) => (
                    <button
                      type="button"
                      className="ar-taskdrawer-pick"
                      aria-label="Ubah prioritas"
                      aria-expanded={menuOpen}
                      onClick={toggle}
                    >
                      <PriorityIcon priority={priorityFromApi(task.priority)} showLabel />
                      <Icon name="chevron-down" size={14} />
                    </button>
                  )}
                  onSelect={(index) => {
                    const next = PRIORITY_NAMES[index]
                    if (next && next !== task.priority) quick({ priority: next })
                  }}
                />
              ) : (
                <PriorityIcon priority={priorityFromApi(task.priority)} showLabel />
              )}
            </Field>

            <Field label="PIC">
              <EditablePopover
                label="PIC"
                canEdit={canEdit}
                display={
                  task.assignees.length > 0 ? (
                    task.assignees.map((a) => (
                      <span key={a.id} className="ar-taskdrawer-person">
                        <Avatar name={a.name} size={22} />
                        {a.name}
                      </span>
                    ))
                  ) : (
                    <span className="ar-muted">Belum ada PIC</span>
                  )
                }
              >
                {(close) => (
                  <PeopleEditor
                    people={assignable}
                    selected={task.assignees.map((a) => a.id)}
                    close={close}
                    error={fieldErrors.assigneeIds}
                    onSave={(assigneeIds) => onSave({ assigneeIds })}
                  />
                )}
              </EditablePopover>
            </Field>

            <Field label="Tanggal">
              <EditablePopover
                label="Tanggal"
                canEdit={canEdit}
                display={
                  task.startDate || task.dueDate ? (
                    <>
                      <span className="ar-taskdrawer-date">
                        {task.startDate ? formatShortDate(task.startDate) : '…'} –
                      </span>
                      {task.dueDate ? (
                        <DueDate
                          overdue={task.isOverdue}
                          lateBy={task.isOverdue ? task.lateDays : undefined}
                        >
                          {formatShortDate(task.dueDate)}
                        </DueDate>
                      ) : (
                        <span className="ar-muted">…</span>
                      )}
                      {task.durationDays !== null ? (
                        <span className="ar-muted">· {task.durationDays} hari</span>
                      ) : null}
                    </>
                  ) : (
                    <span className="ar-muted">Belum diatur</span>
                  )
                }
              >
                {(close) => (
                  <DatesEditor
                    start={task.startDate ?? ''}
                    end={task.dueDate ?? ''}
                    close={close}
                    error={fieldErrors.dueDate ?? fieldErrors.startDate}
                    onSave={(dates) => onSave({ dates })}
                  />
                )}
              </EditablePopover>
            </Field>

            <Field label="Label">
              <EditablePopover
                label="Label"
                canEdit={canEdit}
                display={
                  task.labels.length > 0 ? (
                    task.labels.map((l) => <Label key={l}>{l}</Label>)
                  ) : (
                    <span className="ar-muted">Tanpa label</span>
                  )
                }
              >
                {(close) => (
                  <LabelsEditor
                    labels={task.labels}
                    known={knownLabels}
                    close={close}
                    error={fieldErrors.labels}
                    onSave={(labels) => onSave({ labels })}
                  />
                )}
              </EditablePopover>
            </Field>

            {canEdit && !isSubtask && subProjects.length > 1 ? (
              <Field label="Sub-proyek">
                <PickMenu
                  title="Pindahkan ke sub-proyek"
                  width={240}
                  items={subProjects.map((p) => ({
                    label: p.label,
                    selected: p.id === task.projectId,
                  }))}
                  activeIndex={subProjects.findIndex((p) => p.id === task.projectId)}
                  trigger={(menuOpen, toggle) => (
                    <button
                      type="button"
                      className="ar-taskdrawer-pick"
                      aria-label="Pindahkan ke sub-proyek"
                      aria-expanded={menuOpen}
                      onClick={toggle}
                    >
                      {subProjects.find((p) => p.id === task.projectId)?.label ??
                        'Pilih sub-proyek'}
                      <Icon name="chevron-down" size={14} />
                    </button>
                  )}
                  onSelect={(index) => {
                    const next = subProjects[index]
                    if (next && next.id !== task.projectId) quick({ projectId: next.id })
                  }}
                />
              </Field>
            ) : null}
          </dl>

          {isHeld(status) && task.holdReason !== null ? (
            <HoldBlock
              task={task}
              canEdit={canEdit}
              people={people}
              fieldErrors={fieldErrors}
              onSave={onSaveHold}
            />
          ) : null}

          <section className="ar-taskdrawer-section" aria-label="Keterangan">
            <h3>Keterangan</h3>
            <EditableText
              label="Keterangan"
              multiline
              value={detail.description ?? ''}
              canEdit={canEdit}
              maxLength={5000}
              placeholder="Tambahkan keterangan"
              error={fieldErrors.description}
              onSave={(description) => onSave({ description })}
            />
            {!canEdit && !detail.description ? (
              <p className="ar-muted">Belum ada keterangan.</p>
            ) : null}
          </section>

          {!isSubtask && (detail.subtasks.length > 0 || canEdit) ? (
            <SubtaskList
              subtasks={detail.subtasks}
              onOpen={onOpenTask}
              onAdd={canEdit ? onAddSubtask : undefined}
            />
          ) : null}

          <section className="ar-taskdrawer-section" aria-label="Aktivitas">
            <h3>Aktivitas</h3>
            <ActivityTimeline {...timeline} today={detail.today} />
          </section>
        </div>
      ) : null}
    </Drawer>
  )
}
