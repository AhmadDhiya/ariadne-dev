import { Fragment, useCallback, useState, type ReactNode } from 'react'
import { StatusPill } from '@/components/atoms/StatusPill'
import { GroupRow } from '@/components/molecules/GroupRow'
import { HoldTooltip } from '@/components/molecules/HoldTooltip'
import { Popover } from '@/components/molecules/Popover'
import { TaskRow } from '@/components/molecules/TaskRow'
import { Menu } from '@/components/organisms/Menu'
import { formatShortDate, formatShortDateOfInstant } from '@/lib/dates'
import { isHeld, priorityFromApi, statusFromApi, STATUSES, type StatusKey } from '@/lib/status'
import type { TaskRow as TaskRowData } from '@/types/api'
import './TaskTable.css'

export interface TaskGroup {
  id: string
  /** Nama grup, mis. "SLMS / Temuan UAT & API". */
  label: string
  tasks: TaskRowData[]
}

export interface TaskTableProps {
  groups: TaskGroup[]
  /** Pengelola dan Anggota proyek. Tamu hanya melihat: pill status bukan tombol. */
  canEdit: boolean
  onChangeStatus: (task: TaskRowData, status: StatusKey) => void
  onOpenTask?: (task: TaskRowData) => void
  /** Ditampilkan menggantikan tabel bila tidak ada baris sama sekali. */
  empty: ReactNode
}

const COLUMNS = [
  { key: 'id', label: 'ID', width: 96 },
  { key: 'title', label: 'Judul' },
  { key: 'priority', label: 'Prioritas', width: 96 },
  { key: 'status', label: 'Status', width: 146 },
  { key: 'pic', label: 'PIC', width: 80 },
  { key: 'start', label: 'Mulai', width: 64 },
  { key: 'due', label: 'Selesai', width: 104 },
  { key: 'duration', label: 'Durasi', width: 60, right: true },
  { key: 'update', label: 'Update terakhir', width: 150 },
  { key: 'label', label: 'Label', width: 100 },
] as const

const STATUS_ITEMS = (current: StatusKey) =>
  STATUSES.map((s) => ({ status: s.key, selected: s.key === current }))

/**
 * Tabel task per sub-proyek (mockup 03). Grup dan task induk bisa dilipat; status diubah langsung lewat menu.
 * Status tertahan butuh alasan, jadi pemilihannya diteruskan ke induk (onChangeStatus) yang membuka dialog.
 */
export function TaskTable({ groups, canEdit, onChangeStatus, onOpenTask, empty }: TaskTableProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<ReadonlySet<string>>(new Set())
  const [collapsedParents, setCollapsedParents] = useState<ReadonlySet<string>>(new Set())
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const closeMenu = useCallback(() => setMenuFor(null), [])

  const toggle = (set: ReadonlySet<string>, id: string): ReadonlySet<string> => {
    const next = new Set(set)
    if (!next.delete(id)) next.add(id)
    return next
  }

  if (groups.length === 0) return <div className="ar-card ar-tasktable-empty">{empty}</div>

  return (
    <section className="ar-card ar-tasktable" aria-label="Tabel task">
      <table>
        <colgroup>
          {COLUMNS.map((c) => (
            <col key={c.key} style={'width' in c ? { width: c.width } : undefined} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {COLUMNS.map((c) => (
              <th key={c.key} scope="col" className={'right' in c ? 'is-right' : undefined}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            const collapsed = collapsedGroups.has(group.id)
            const top = group.tasks.filter((t) => t.parentTaskId === null).length
            const subs = group.tasks.length - top
            const meta = [
              `${top} task`,
              subs > 0 ? `${subs} sub-task` : null,
              collapsed ? 'dilipat' : null,
            ]
              .filter(Boolean)
              .join(' · ')

            return (
              <Fragment key={group.id}>
                <GroupRow
                  title={group.label}
                  meta={meta}
                  collapsed={collapsed}
                  colSpan={COLUMNS.length}
                  onToggle={() => setCollapsedGroups((s) => toggle(s, group.id))}
                />
                {collapsed
                  ? null
                  : group.tasks
                      .filter(
                        (t) => t.parentTaskId === null || !collapsedParents.has(t.parentTaskId),
                      )
                      .map((task) => (
                        <TaskTableRow
                          key={task.id}
                          task={task}
                          canEdit={canEdit}
                          menuOpen={menuFor === task.id}
                          expanded={!collapsedParents.has(task.id)}
                          onToggleMenu={() => setMenuFor((id) => (id === task.id ? null : task.id))}
                          onCloseMenu={closeMenu}
                          onToggleExpand={() => setCollapsedParents((s) => toggle(s, task.id))}
                          onChangeStatus={(status) => {
                            closeMenu()
                            onChangeStatus(task, status)
                          }}
                          onOpen={onOpenTask ? () => onOpenTask(task) : undefined}
                        />
                      ))}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}

interface TaskTableRowProps {
  task: TaskRowData
  canEdit: boolean
  menuOpen: boolean
  expanded: boolean
  onToggleMenu: () => void
  onCloseMenu: () => void
  onToggleExpand: () => void
  onChangeStatus: (status: StatusKey) => void
  onOpen?: () => void
}

function TaskTableRow({
  task,
  canEdit,
  menuOpen,
  expanded,
  onToggleMenu,
  onCloseMenu,
  onToggleExpand,
  onChangeStatus,
  onOpen,
}: TaskTableRowProps) {
  const status = statusFromApi(task.status)

  const pill = canEdit ? (
    <Popover
      open={menuOpen}
      onClose={onCloseMenu}
      anchor={<StatusPill status={status} select open={menuOpen} onClick={onToggleMenu} />}
    >
      <Menu
        title="Ubah status"
        width={200}
        items={STATUS_ITEMS(status)}
        activeIndex={STATUSES.findIndex((s) => s.key === status)}
        autoFocus
        onSelect={(item) => {
          if (item.status) onChangeStatus(item.status)
        }}
        onClose={onCloseMenu}
      />
    </Popover>
  ) : (
    <StatusPill status={status} />
  )

  return (
    <TaskRow
      id={task.key}
      title={task.title}
      subtask={task.parentTaskId !== null}
      expandable={task.subtaskCount > 0}
      expanded={expanded}
      onToggleExpand={onToggleExpand}
      subtaskSummary={
        task.subtaskCount > 0 ? `${task.subtaskDoneCount}/${task.subtaskCount}` : undefined
      }
      onOpen={onOpen}
      priority={priorityFromApi(task.priority)}
      status={
        <>
          {pill}
          {isHeld(status) && task.holdReason ? (
            <HoldTooltip
              status={status}
              reason={task.holdReason}
              waitingOn={task.waitingOn ?? undefined}
              waitingOnIsPerson={task.waitingOnIsPerson}
              since={task.heldSince ? formatShortDateOfInstant(task.heldSince) : undefined}
            />
          ) : null}
        </>
      }
      assignees={task.assignees.map((a) => a.name)}
      start={task.startDate ? formatShortDate(task.startDate) : null}
      due={task.dueDate ? formatShortDate(task.dueDate) : null}
      overdue={task.isOverdue}
      lateDays={task.lateDays}
      duration={task.durationDays}
      labels={task.labels}
      highlighted={menuOpen}
    />
  )
}
