import { Avatar } from '@/components/atoms/Avatar'
import { Button } from '@/components/atoms/Button'
import { Checkbox } from '@/components/atoms/Checkbox'
import { DueDate } from '@/components/atoms/DueDate'
import { HeatCell } from '@/components/atoms/HeatCell'
import { Icon, ICONS, type IconName } from '@/components/atoms/Icon'
import { IconButton } from '@/components/atoms/IconButton'
import { Kbd } from '@/components/atoms/Kbd'
import { Label } from '@/components/atoms/Label'
import { Mark } from '@/components/atoms/Mark'
import { Mention } from '@/components/atoms/Mention'
import { PriorityIcon } from '@/components/atoms/PriorityIcon'
import { ProgressBar } from '@/components/atoms/ProgressBar'
import { Radio } from '@/components/atoms/Radio'
import { Select } from '@/components/atoms/Select'
import { StatusPill } from '@/components/atoms/StatusPill'
import { TextArea } from '@/components/atoms/TextArea'
import { TextInput } from '@/components/atoms/TextInput'
import { VisuallyHidden } from '@/components/atoms/VisuallyHidden'
import { ActivityItem } from '@/components/molecules/ActivityItem'
import { AvatarStack } from '@/components/molecules/AvatarStack'
import { Banner } from '@/components/molecules/Banner'
import { Breadcrumb } from '@/components/molecules/Breadcrumb'
import { EmptyState } from '@/components/molecules/EmptyState'
import { FormField } from '@/components/molecules/FormField'
import { GanttBar } from '@/components/molecules/GanttBar'
import { GanttTrack } from '@/components/molecules/GanttTrack'
import { HoldTooltip } from '@/components/molecules/HoldTooltip'
import { Logo } from '@/components/molecules/Logo'
import { MenuItem } from '@/components/molecules/MenuItem'
import { Milestone } from '@/components/molecules/Milestone'
import { SearchField } from '@/components/molecules/SearchField'
import { SummaryCard } from '@/components/molecules/SummaryCard'
import { Toast } from '@/components/molecules/Toast'
import { TodayMarker } from '@/components/molecules/TodayMarker'
import { WorkloadRow } from '@/components/molecules/WorkloadRow'
import { Menu } from '@/components/organisms/Menu'
import { SegmentedControl } from '@/components/molecules/SegmentedControl'
import { useTheme, type Theme } from '@/hooks/useTheme'
import { PRIORITIES, STATUSES } from '@/lib/status'
import { Demo, Level } from './Demo'
import { Phase2Molecules, Phase2Organisms } from './phase2'
import { Phase3Demos } from './phase3'
import { Phase4Molecules, Phase4Organisms } from './phase4'
import { Phase5Molecules, Phase5Organisms } from './phase5'
import { Phase6Organisms } from './phase6'
import { Phase7Organisms } from './phase7'
import { Phase8Organisms } from './phase8'
import { Phase9Molecules, Phase9Organisms } from './phase9'
import {
  GANTT_DAYS,
  GANTT_WEEKENDS,
  MOVE_ITEMS,
  STATUS_MENU_ITEMS,
  TODAY_INDEX,
  WORKLOAD,
} from './demoData'
import {
  DateRangeDemo,
  DialogDemo,
  DrawerDemo,
  EmailChipsDemo,
  FilterChipsDemo,
  MentionMenuDemo,
  NavTreeDemo,
  PopoverDemo,
  RadioCardsDemo,
  SegmentedDemo,
  StatusEditDemo,
  TabsDemo,
} from './interactive'
import './DevKomponenPage.css'

const ICON_NAMES = Object.keys(ICONS) as IconName[]
const EXTRA = 'tambahan, tidak ada di design system'

/**
 * Katalog semua komponen per tingkat atomic, terang dan gelap berdampingan.
 * Hanya ada saat pengembangan (lihat App.tsx). Bandingkan dengan docs/design/design-system/component-previews/.
 */
export function DevKomponenPage() {
  const { theme, setTheme } = useTheme()

  return (
    <main className="dev">
      <header className="dev-head">
        <Logo />
        <div className="dev-head-text">
          <h1 className="title dev-title">Katalog komponen</h1>
          <p className="ar-muted dev-lead">
            Atom → Molekul → Organisme. Setiap komponen tampil dalam tema terang dan gelap.
          </p>
        </div>
        <SegmentedControl<Theme>
          label="Tema halaman"
          value={theme}
          onChange={setTheme}
          options={[
            { value: 'light', label: 'Terang' },
            { value: 'dark', label: 'Gelap' },
          ]}
        />
      </header>

      <nav className="dev-toc" aria-label="Tingkat komponen">
        <a href="#atom">Atom</a>
        <a href="#molekul">Molekul</a>
        <a href="#organisme">Organisme</a>
        <a href="#template">Template</a>
      </nav>

      <Level id="atom" title="Atom">
        <Demo name="Icon">
          <div className="dev-icon-grid">
            {ICON_NAMES.map((name) => (
              <span key={name} className="dev-icon-cell">
                <Icon name={name} size={20} />
                <span>{name}</span>
              </span>
            ))}
          </div>
        </Demo>
        <Demo name="Mark">
          <Mark size={20} />
          <Mark />
          <Mark size={40} />
        </Demo>
        <Demo name="Button">
          <Button variant="primary" icon="plus">
            Tambah task
          </Button>
          <Button>Batal</Button>
          <Button variant="ghost" icon="move">
            Pindahkan ke…
          </Button>
          <Button size="sm" icon="update">
            Tambah update
          </Button>
          <Button variant="primary" disabled>
            Simpan
          </Button>
        </Demo>
        <Demo name="IconButton">
          <IconButton icon="bell" label="Notifikasi" badge={3} />
          <IconButton icon="bell" label="Notifikasi" badge={120} />
          <IconButton icon="more" label="Aksi lain" />
          <IconButton icon="x" size="sm" label="Tutup" />
        </Demo>
        <Demo name="Avatar">
          <Avatar name="Syaikhan" />
          <Avatar name="Wiwiet" size={28} />
          <Avatar name="Pak Budi" guest size={28} />
          <Avatar name="Ahmad" size={32} />
        </Demo>
        <Demo name="Label" surface>
          <Label>Backend</Label>
          <Label>Infra</Label>
          <Label>UAT</Label>
          <Label>Klien</Label>
        </Demo>
        <Demo name="StatusPill" surface>
          {STATUSES.map((s) => (
            <StatusPill key={s.key} status={s.key} />
          ))}
          <StatusPill status="progress" select />
          <StatusPill status="blocked" select open />
        </Demo>
        <Demo name="PriorityIcon" surface>
          {PRIORITIES.map((p) => (
            <PriorityIcon key={p.key} priority={p.key} showLabel />
          ))}
          {PRIORITIES.map((p) => (
            <PriorityIcon key={`${p.key}-icon`} priority={p.key} />
          ))}
        </Demo>
        <Demo name="DueDate" surface>
          <DueDate>2 Okt</DueDate>
          <DueDate overdue>25 Sep</DueDate>
          <DueDate overdue lateBy={3}>
            25 Sep
          </DueDate>
        </Demo>
        <Demo name="Mention" surface>
          <span>
            Terima kasih. <Mention>Syaikhan</Mention>, mohon kabari jika sudah bisa diuji.
          </span>
        </Demo>
        <Demo name="TextInput · TextArea" note={EXTRA} column>
          <TextInput aria-label="Contoh input" placeholder="nama@perusahaan.co.id" />
          <TextInput
            aria-label="Contoh input besar"
            size="lg"
            defaultValue="ahmad@perusahaan.co.id"
          />
          <TextInput aria-label="Contoh input salah" invalid defaultValue="ahmad@" />
          <TextArea aria-label="Contoh teks panjang" placeholder="Tulis keterangan task" />
        </Demo>
        <Demo name="Checkbox · Radio · Select" note={EXTRA}>
          <Checkbox label="Ingat saya di perangkat ini" defaultChecked />
          <Radio name="contoh-radio" label="Hari" defaultChecked />
          <Radio name="contoh-radio" label="Minggu" />
          <Select aria-label="Peran di tim" defaultValue="Anggota">
            <option>Supervisor</option>
            <option>Anggota</option>
          </Select>
        </Demo>
        <Demo name="ProgressBar" note={EXTRA}>
          <ProgressBar value={58} label="Progres Sentul" />
          <b>58%</b>
          <span className="ar-muted">41 dari 71 task selesai</span>
        </Demo>
        <Demo name="HeatCell" note="dipisah dari WorkloadRow" surface>
          {[0, 1, 2, 3, 4, 5, 7, 12].map((n) => (
            <HeatCell key={n} count={n} width={26} />
          ))}
          <HeatCell count={0} width={26} weekend />
        </Demo>
        <Demo name="Kbd · VisuallyHidden" note={EXTRA}>
          <Kbd>/</Kbd>
          <span className="ar-muted">
            Teks tersembunyi di sini hanya untuk pembaca layar:
            <VisuallyHidden> ini tidak terlihat</VisuallyHidden>
          </span>
        </Demo>
      </Level>

      <Level id="molekul" title="Molekul">
        <Demo name="Logo">
          <Logo />
          <Logo subtitle={false} />
          <Logo markOnly />
          <Logo size={40} />
        </Demo>
        <Demo name="AvatarStack" surface>
          <AvatarStack names={['Ahmad', 'Rama']} />
          <AvatarStack names={['Syaikhan', 'Wiwiet', 'Ahmad', 'Manto', 'Rama', 'Galih']} />
        </Demo>
        <Demo name="SearchField" column>
          <SearchField shortcut="/" width={360} />
          <SearchField placeholder="Cari di proyek ini" width={220} />
        </Demo>
        <Demo name="FilterChip">
          <FilterChipsDemo />
        </Demo>
        <Demo name="Tabs">
          <TabsDemo />
        </Demo>
        <Demo name="NavItem" note="tautan + tombol buka/tutup agar bisa dipakai keyboard">
          <NavTreeDemo />
        </Demo>
        <Demo name="HoldTooltip" surface>
          <HoldTooltip
            status="blocked"
            reason="Server staging belum bisa diakses; menunggu firewall dibuka."
            waitingOn="Manto"
            since="24 Sep"
            open
            floating={false}
          />
          <span className="ar-muted">Arahkan kursor atau Tab ke ikon:</span>
          <HoldTooltip
            status="request"
            reason="Menunggu akses VPN dari klien."
            waitingOn="Klien — tim IT"
            waitingOnIsPerson={false}
            since="22 Sep"
          />
        </Demo>
        <Demo name="SummaryCard">
          <div className="dev-cards">
            <SummaryCard
              label="Terlambat"
              value={4}
              icon="calendar"
              tone="danger"
              hint="2 Critical"
            />
            <SummaryCard
              label="Jatuh tempo minggu ini"
              value={7}
              icon="calendar"
              hint="s.d. Jumat, 2 Okt"
            />
            <SummaryCard
              label="Sedang dikerjakan"
              value={5}
              icon="status-progress"
              onClick={() => undefined}
            />
            <SummaryCard
              label="Tertahan"
              value={3}
              icon="status-hold"
              tone="held"
              hint="Blocked 1 · Hold 1 · Request 1"
            />
          </div>
        </Demo>
        <Demo name="Banner" column>
          <Banner kind="guest">
            Anda melihat sebagai <b>Tamu</b>. Anda bisa berkomentar dan menandai anggota dengan @.
          </Banner>
          <Banner kind="viewing" action="Kembali ke dashboard saya">
            Melihat dashboard: <b>Rama</b>
          </Banner>
        </Demo>
        <Demo name="ActivityItem" column surface>
          <div className="dev-stack dev-wide">
            <ActivityItem kind="update" author="Ahmad" time="09.12">
              Firewall staging sudah dibuka untuk IP kantor. Tinggal uji koneksi dari runner GitLab.
            </ActivityItem>
            <ActivityItem kind="log" author="Wiwiet" time="08.40" icon="status-blocked">
              mengubah status On Progress → Blocked
            </ActivityItem>
            <ActivityItem kind="comment" author="Pak Budi" time="Kemarin" guest>
              Terima kasih. <Mention>Syaikhan</Mention>. Mohon kabari jika sudah bisa diuji.
            </ActivityItem>
            <ActivityItem kind="internal" author="Syaikhan" time="Kemarin">
              Jangan janjikan tanggal ke klien dulu, tunggu hasil PenTest.
            </ActivityItem>
            <ActivityItem kind="log" author="Syaikhan" time="25 Sep">
              memindahkan task dari Rama ke Galih
            </ActivityItem>
          </div>
        </Demo>
        <Demo name="GanttTrack · GanttBar · Milestone · TodayMarker" scroll>
          {/* Satu chart, satu garis "Hari ini" (aturan design system); baris setinggi row-height 36px */}
          <div className="dev-gantt">
            <GanttTrack days={GANTT_DAYS} height={4 * 36}>
              <GanttBar
                status="done"
                start={0}
                span={4}
                top={8}
                label="Pengisian Kebutuhan Server"
                priority="high"
              />
              <GanttBar
                status="blocked"
                start={2}
                span={4}
                top={44}
                label="Pipeline GitLab IRS"
                priority="critical"
                overdue
              />
              <GanttBar
                status="progress"
                start={7}
                span={5}
                top={80}
                label="Integrasi log & metrics"
                priority="medium"
              />
              <GanttBar
                status="not-started"
                start={9}
                span={3}
                top={116}
                label="Penyusunan FAQ"
                priority="low"
              />
              <Milestone day={14} label="UAT SLMS · 5 Okt" top={46} />
              <TodayMarker day={TODAY_INDEX} />
            </GanttTrack>
          </div>
        </Demo>
        <Demo name="WorkloadRow" surface column>
          {WORKLOAD.map((row) => (
            <WorkloadRow
              key={row.name}
              name={row.name}
              counts={row.counts}
              weekends={GANTT_WEEKENDS}
            />
          ))}
        </Demo>
        <Demo name="MenuItem" note="dipisah dari Menu" surface column>
          <div className="dev-wide" role="listbox" aria-label="Contoh item menu">
            <MenuItem item={{ status: 'fixing' }} active />
            <MenuItem item={{ avatar: 'Galih', label: 'Galih', meta: '2 aktif' }} />
            <MenuItem item={{ status: 'progress', selected: true }} />
          </div>
        </Demo>
        <Demo name="FormField" note={EXTRA} column>
          <div className="dev-stack dev-form">
            <FormField label="Email">
              {(field) => (
                <TextInput
                  {...field}

                  type="email"
                  defaultValue="ahmad@perusahaan.co.id"
                />
              )}
            </FormField>
            <FormField label="Password" labelAside={<a href="#lupa">Lupa password?</a>}>
              {(field) => (
                <TextInput
                  {...field}

                  type="password"
                  defaultValue="rahasia-contoh"
                />
              )}
            </FormField>
            <FormField label="Alasan tertahan" required error="Alasan tertahan wajib diisi.">
              {(field) => <TextArea {...field} />}
            </FormField>
          </div>
        </Demo>
        <Demo name="RadioCard" note={EXTRA}>
          <RadioCardsDemo />
        </Demo>
        <Demo name="EmailChipsInput" note={EXTRA}>
          <EmailChipsDemo />
        </Demo>
        <Demo name="DateRangeField" note={EXTRA}>
          <DateRangeDemo />
        </Demo>
        <Demo name="SegmentedControl" note={EXTRA}>
          <SegmentedDemo />
        </Demo>
        <Demo name="Breadcrumb" note={EXTRA}>
          <Breadcrumb
            items={[
              { label: 'Proyek', href: '#proyek' },
              { label: 'Sentul', href: '#sentul' },
              { label: 'SLMS' },
            ]}
          />
        </Demo>
        <Demo name="Popover" note={EXTRA}>
          <PopoverDemo />
        </Demo>
        <Demo name="Toast" note={EXTRA} column>
          <Toast kind="success" onClose={() => undefined}>
            Status disimpan
          </Toast>
          <Toast kind="info">Task dipindahkan ke Galih</Toast>
          <Toast kind="error" onClose={() => undefined}>
            Gagal menyimpan. Periksa koneksi lalu coba lagi.
          </Toast>
        </Demo>
        <Demo name="EmptyState" note={EXTRA} surface>
          <EmptyState
            title="Belum ada task"
            description="Task yang ditugaskan kepada Anda akan muncul di sini."
            action={
              <Button variant="primary" icon="plus">
                Tambah task
              </Button>
            }
          />
        </Demo>
        <Phase2Molecules />
        <Phase4Molecules />
        <Phase5Molecules />
        <Phase9Molecules />
      </Level>

      <Level id="organisme" title="Organisme">
        <Demo name="Menu">
          <Menu title="Ubah status" items={STATUS_MENU_ITEMS} activeIndex={2} />
          <MentionMenuDemo />
          <Menu title="Pindahkan ke…" query="" items={MOVE_ITEMS} activeIndex={1} width={220} />
        </Demo>
        <Demo name="StatusPill + Popover + Menu" note="edit status langsung; coba dengan keyboard">
          <StatusEditDemo />
        </Demo>
        <Demo name="Dialog" note={EXTRA}>
          <DialogDemo />
        </Demo>
        <Demo name="Drawer" note={EXTRA}>
          <DrawerDemo />
        </Demo>
        <Phase2Organisms />
        <Phase3Demos />
        <Phase4Organisms />
        <Phase5Organisms />
        <Phase6Organisms />
        <Phase7Organisms />
        <Phase8Organisms />
        <Phase9Organisms />
      </Level>

      <Level id="template" title="Template">
        <p className="ar-muted">
          AppShell, AuthLayout, dan ProjectLayout seukuran satu halaman penuh, jadi dilihat langsung
          di halaman Masuk, Tim, dan Anggota proyek. MobileShell menyusul bersama tampilan mobile.
        </p>
      </Level>
    </main>
  )
}
