import { useCallback, useId, useState } from 'react'
import { Button } from '@/components/atoms/Button'
import { IconButton } from '@/components/atoms/IconButton'
import { Label } from '@/components/atoms/Label'
import { Mention } from '@/components/atoms/Mention'
import { PriorityIcon } from '@/components/atoms/PriorityIcon'
import { StatusPill } from '@/components/atoms/StatusPill'
import { TextArea } from '@/components/atoms/TextArea'
import { ActivityItem } from '@/components/molecules/ActivityItem'
import { AvatarStack } from '@/components/molecules/AvatarStack'
import { DateRangeField, type DateRange } from '@/components/molecules/DateRangeField'
import { EmailChipsInput } from '@/components/molecules/EmailChipsInput'
import { FilterChip } from '@/components/molecules/FilterChip'
import { FormField } from '@/components/molecules/FormField'
import { NavItem } from '@/components/molecules/NavItem'
import { Popover } from '@/components/molecules/Popover'
import { RadioCard } from '@/components/molecules/RadioCard'
import { SegmentedControl } from '@/components/molecules/SegmentedControl'
import { Tabs } from '@/components/molecules/Tabs'
import { Dialog } from '@/components/organisms/Dialog'
import { Drawer } from '@/components/organisms/Drawer'
import { Menu } from '@/components/organisms/Menu'
import { getStatus, STATUSES, type StatusKey } from '@/lib/status'
import { MEMBERS } from './demoData'

/* Contoh interaktif untuk katalog komponen. Setiap panel (terang/gelap) punya state sendiri. */

export function FilterChipsDemo() {
  const [toggles, setToggles] = useState({ terlambat: true, mingguIni: false, taskSaya: false })
  const flip = (key: keyof typeof toggles) => setToggles((t) => ({ ...t, [key]: !t[key] }))
  return (
    <>
      <FilterChip label="PIC" value="Ahmad" active />
      <FilterChip label="Status" count={2} />
      <FilterChip label="Prioritas" />
      <FilterChip label="Label" />
      <FilterChip
        label="Terlambat"
        toggle
        active={toggles.terlambat}
        onClick={() => flip('terlambat')}
      />
      <FilterChip
        label="Minggu ini"
        toggle
        active={toggles.mingguIni}
        onClick={() => flip('mingguIni')}
      />
      <FilterChip
        label="Task saya"
        toggle
        active={toggles.taskSaya}
        onClick={() => flip('taskSaya')}
      />
    </>
  )
}

export function TabsDemo() {
  const [active, setActive] = useState('Tabel')
  return (
    <div style={{ width: '100%' }}>
      <Tabs
        label="Tampilan proyek"
        items={['Tabel', 'Gantt', 'Milestone', 'Anggota']}
        active={active}
        onSelect={setActive}
      />
    </div>
  )
}

export function NavTreeDemo() {
  const [open, setOpen] = useState({ sentul: true, slms: true })
  return (
    <nav aria-label="Contoh sidebar" style={{ width: 248 }}>
      <NavItem label="Dashboard" icon="dashboard" href="#dashboard" />
      <NavItem label="Timeline Tim" icon="timeline" href="#timeline" />
      <NavItem
        label="Sentul"
        icon="folder"
        href="#sentul"
        expandable
        expanded={open.sentul}
        onToggle={() => setOpen((o) => ({ ...o, sentul: !o.sentul }))}
      />
      {open.sentul ? (
        <>
          <NavItem label="Dispatch" depth={1} count={12} href="#dispatch" />
          <NavItem
            label="SLMS"
            depth={1}
            count={18}
            href="#slms"
            expandable
            expanded={open.slms}
            onToggle={() => setOpen((o) => ({ ...o, slms: !o.slms }))}
          />
          {open.slms ? (
            <NavItem label="Temuan UAT & API" depth={2} count={9} href="#temuan" active />
          ) : null}
          <NavItem label="Smartclassroom" depth={1} count={6} href="#smartclassroom" />
        </>
      ) : null}
    </nav>
  )
}

type Role = 'Pengelola' | 'Anggota' | 'Tamu'

function RoleCards({
  name,
  value,
  onChange,
}: {
  name: string
  value: Role
  onChange: (r: Role) => void
}) {
  return (
    <div className="dev-stack" role="radiogroup" aria-label="Peran">
      <RadioCard
        name={name}
        value="Pengelola"
        checked={value === 'Pengelola'}
        onChange={onChange}
        title="Pengelola"
        description="Mengatur proyek, sub-proyek, milestone, dan anggota."
      />
      <RadioCard
        name={name}
        value="Anggota"
        checked={value === 'Anggota'}
        onChange={onChange}
        title="Anggota"
        description="Membuat dan mengubah task, memberi update dan komentar."
      />
      <RadioCard
        name={name}
        value="Tamu"
        checked={value === 'Tamu'}
        onChange={onChange}
        title="Tamu"
        description="Hanya melihat progres. Bisa berkomentar dan menandai dengan @, tidak melihat komentar internal."
      />
    </div>
  )
}

export function RadioCardsDemo() {
  const [role, setRole] = useState<Role>('Tamu')
  const name = useId()
  return (
    <div style={{ width: 460 }}>
      <RoleCards name={name} value={role} onChange={setRole} />
    </div>
  )
}

export function EmailChipsDemo() {
  const [emails, setEmails] = useState(['tim-it@klien.example', 'salah@'])
  return (
    <div style={{ width: 460 }}>
      <FormField label="Email" hint="Pisahkan beberapa email dengan koma.">
        {(field) => (
          <EmailChipsInput
            id={field.id}
            aria-describedby={field['aria-describedby']}
            value={emails}
            onChange={setEmails}
          />
        )}
      </FormField>
    </div>
  )
}

export function DateRangeDemo() {
  const [range, setRange] = useState<DateRange>({ start: '2026-09-21', end: '2026-09-25' })
  return <DateRangeField label="Tanggal task" {...range} onChange={setRange} />
}

export function SegmentedDemo() {
  const [zoom, setZoom] = useState<'hari' | 'minggu' | 'bulan'>('hari')
  return (
    <SegmentedControl
      label="Skala waktu"
      value={zoom}
      onChange={setZoom}
      options={[
        { value: 'hari', label: 'Hari' },
        { value: 'minggu', label: 'Minggu' },
        { value: 'bulan', label: 'Bulan' },
      ]}
    />
  )
}

export function PopoverDemo() {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  return (
    <Popover
      open={open}
      onClose={close}
      anchor={
        <Button icon="users" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          Anggota
        </Button>
      }
    >
      <div className="dev-popover-card">
        <AvatarStack names={['Syaikhan', 'Wiwiet', 'Ahmad', 'Manto', 'Rama']} />
        <span className="ar-muted">5 anggota aktif</span>
      </div>
    </Popover>
  )
}

/** StatusPill + Popover + Menu: cara status diubah langsung dari sel tabel. */
export function StatusEditDemo() {
  const [status, setStatus] = useState<StatusKey>('progress')
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const items = STATUSES.map((s) => ({ status: s.key, selected: s.key === status }))
  return (
    <Popover
      open={open}
      onClose={close}
      anchor={<StatusPill status={status} select open={open} onClick={() => setOpen((o) => !o)} />}
    >
      <Menu
        title="Ubah status"
        items={items}
        activeIndex={STATUSES.findIndex((s) => s.key === status)}
        autoFocus
        onSelect={(item) => {
          if (item.status) setStatus(item.status)
          setOpen(false)
        }}
        onClose={close}
      />
    </Popover>
  )
}

export function MentionMenuDemo() {
  const [query, setQuery] = useState('ma')
  const items = MEMBERS.filter((m) => m.name.toLowerCase().includes(query.toLowerCase())).map(
    (m) => ({
      avatar: m.name,
      label: m.name,
      meta: m.role,
    }),
  )
  return (
    <Menu
      items={items}
      activeIndex={0}
      query={query}
      onQueryChange={setQuery}
      label="Tandai anggota"
      width={260}
    />
  )
}

export function DialogDemo() {
  const [open, setOpen] = useState(false)
  const [emails, setEmails] = useState(['tim-it@klien.example'])
  const [role, setRole] = useState<Role>('Tamu')
  const name = useId()
  const close = () => setOpen(false)
  return (
    <>
      <Button icon="users" onClick={() => setOpen(true)}>
        Buka dialog Undang
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title="Undang ke Sentul"
        width={520}
        footer={
          <>
            <Button onClick={close}>Batal</Button>
            <Button variant="primary" icon="mail" onClick={close}>
              Kirim undangan
            </Button>
          </>
        }
      >
        <FormField label="Email" hint="Pisahkan beberapa email dengan koma.">
          {(field) => (
            <EmailChipsInput
              id={field.id}
              aria-describedby={field['aria-describedby']}
              value={emails}
              onChange={setEmails}
            />
          )}
        </FormField>
        <RoleCards name={name} value={role} onChange={setRole} />
        <FormField label="Pesan (opsional)">
          {(field) => (
            <TextArea
              id={field.id}
              defaultValue="Halo tim IT, ini akses untuk memantau progres Sentul dan membalas pertanyaan di task."
            />
          )}
        </FormField>
      </Dialog>
    </>
  )
}

export function DrawerDemo() {
  const [open, setOpen] = useState(false)
  const blocked = getStatus('blocked')
  return (
    <>
      <Button icon="message" onClick={() => setOpen(true)}>
        Buka drawer task
      </Button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        eyebrow={
          <>
            <span className="ar-id">SEN-115</span>
            <span>Sentul / Dispatch</span>
          </>
        }
        actions={<IconButton icon="more" size="sm" label="Aksi lain" />}
        title="Pipeline GitLab IRS"
        footer={
          <div className="dev-stack">
            <TextArea
              aria-label="Tulis komentar"
              placeholder="Tulis komentar. Ketik @ untuk menandai anggota."
            />
            <div className="dev-row-end">
              <Button variant="primary" size="sm">
                Kirim
              </Button>
            </div>
          </div>
        }
      >
        <dl className="dev-fields">
          <dt>Status</dt>
          <dd>
            <StatusPill status={blocked.key} />
          </dd>
          <dt>Prioritas</dt>
          <dd>
            <PriorityIcon priority="critical" showLabel />
          </dd>
          <dt>Label</dt>
          <dd className="dev-inline">
            <Label>DevOps</Label>
            <Label>Infra</Label>
          </dd>
        </dl>
        <div className="dev-stack">
          <ActivityItem kind="comment" author="Pak Budi" time="09.30" guest>
            Tim kami sedang memproses permintaan firewall-nya, estimasi Rabu.
          </ActivityItem>
          <ActivityItem kind="internal" author="Syaikhan" time="Kemarin">
            Kalau firewall belum dibuka Rabu, <Mention>Manto</Mention> tolong siapkan proxy
            sementara.
          </ActivityItem>
          <ActivityItem kind="log" author="Wiwiet" time="25 Sep" icon="status-blocked">
            mengubah status On Progress → Blocked
          </ActivityItem>
        </div>
      </Drawer>
    </>
  )
}
