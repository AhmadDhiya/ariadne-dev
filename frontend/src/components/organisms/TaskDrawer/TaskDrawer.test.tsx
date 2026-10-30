import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { TaskDetail, TaskRow } from '@/types/api'
import { TaskDrawer, type TaskDrawerProps } from './TaskDrawer'

const row = (over: Partial<TaskRow>): TaskRow => ({
  id: 't1',
  key: 'SEN-115',
  number: 115,
  projectId: 'p-dispatch',
  parentTaskId: null,
  title: 'Pipeline GitLab IRS',
  status: 'Blocked',
  priority: 'Critical',
  assignees: [
    { id: 'wi', name: 'Wiwiet' },
    { id: 'ah', name: 'Ahmad' },
  ],
  startDate: '2026-09-21',
  dueDate: '2026-09-25',
  durationDays: 5,
  isOverdue: true,
  lateDays: 3,
  holdReason: 'Runner belum bisa mengakses server staging.',
  waitingOn: 'Manto',
  waitingOnIsPerson: true,
  waitingOnUserId: 'mn',
  heldSince: '2026-09-23T17:00:00Z',
  labels: ['DevOps', 'Infra'],
  subtaskCount: 3,
  subtaskDoneCount: 1,
  lastUpdate: null,
  ...over,
})

const SUBTASKS = [
  row({
    id: 's1',
    key: 'SEN-116',
    title: 'Siapkan runner di VM build',
    status: 'Done',
    parentTaskId: 't1',
    holdReason: null,
    waitingOn: null,
    waitingOnUserId: null,
    heldSince: null,
  }),
  row({ id: 's2', key: 'SEN-117', title: 'Buka akses runner ke staging', parentTaskId: 't1' }),
]

const detail = (over: Partial<TaskDetail> = {}): TaskDetail => ({
  task: row({}),
  description: 'Pipeline CI/CD untuk modul IRS.',
  canEdit: true,
  canComment: true,
  rootProjectId: 'root',
  projectPath: ['Sentul', 'Dispatch'],
  parent: null,
  subtasks: SUBTASKS,
  today: '2026-09-28',
  ...over,
})

const PEOPLE = [
  { id: 'wi', name: 'Wiwiet', role: 'Anggota' as const },
  { id: 'ah', name: 'Ahmad', role: 'Pengelola' as const },
  { id: 'mn', name: 'Manto', role: 'Anggota' as const },
  { id: 'bu', name: 'Pak Budi', role: 'Tamu' as const },
]

function setup(props: Partial<TaskDrawerProps> = {}) {
  const handlers = {
    onClose: vi.fn(),
    onSave: vi.fn().mockResolvedValue(undefined),
    onChangeStatus: vi.fn(),
    onSaveHold: vi.fn().mockResolvedValue(undefined),
    onPostActivity: vi.fn().mockResolvedValue(undefined),
    onOpenTask: vi.fn(),
    onAddSubtask: vi.fn(),
    onDelete: vi.fn(),
    onCopyLink: vi.fn(),
  }
  const user = userEvent.setup()
  render(
    <TaskDrawer
      open
      detail={detail()}
      people={PEOPLE}
      knownLabels={['UAT']}
      subProjects={[
        { id: 'p-dispatch', label: 'Dispatch' },
        { id: 'p-slms', label: 'SLMS' },
      ]}
      timeline={{ items: [] }}
      {...handlers}
      {...props}
    />,
  )
  return { ...handlers, user }
}

const fields = () => within(document.querySelector('.ar-taskdrawer-fields') as HTMLElement)

describe('TaskDrawer: tampilan', () => {
  it('menampilkan ID, lokasi, judul, dan semua bidang seperti mockup', () => {
    setup()

    expect(screen.getByText('SEN-115')).toBeInTheDocument()
    expect(screen.getByText('Sentul / Dispatch')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pipeline GitLab IRS' })).toBeInTheDocument()
    expect(fields().getByRole('button', { name: /Blocked/ })).toBeInTheDocument()
    expect(fields().getByText('Critical')).toBeInTheDocument()
    expect(fields().getByText('Wiwiet')).toBeInTheDocument()
    expect(fields().getByText('Ahmad')).toBeInTheDocument()
    expect(fields().getByText('21 Sep –')).toBeInTheDocument()
    expect(fields().getByText('25 Sep')).toBeInTheDocument()
    expect(fields().getByText('· 5 hari')).toBeInTheDocument()
    expect(fields().getByText('DevOps')).toBeInTheDocument()
    expect(screen.getByText('Pipeline CI/CD untuk modul IRS.')).toBeInTheDocument()
  })

  it('task tertahan menampilkan alasan dan menunggu siapa; sub-task dan hitungannya', () => {
    setup()

    expect(screen.getByText('Runner belum bisa mengakses server staging.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ubah Menunggu siapa' })).toHaveTextContent('Manto')
    expect(screen.getByText('1/2')).toBeInTheDocument()
    expect(screen.getByText('SEN-116')).toBeInTheDocument()
    expect(screen.getByText('Buka akses runner ke staging')).toBeInTheDocument()
  })

  it('task yang tidak tertahan tidak punya blok alasan', () => {
    setup({
      detail: detail({
        task: row({
          status: 'OnProgress',
          holdReason: null,
          waitingOn: null,
          waitingOnUserId: null,
          heldSince: null,
        }),
      }),
    })

    expect(screen.queryByRole('region', { name: 'Alasan tertahan' })).not.toBeInTheDocument()
  })

  it('sub-task menampilkan tautan ke induknya dan tidak punya daftar sub-task', async () => {
    const { user, onOpenTask } = setup({
      detail: detail({
        task: row({ key: 'SEN-122', parentTaskId: 't1' }),
        parent: { id: 't1', key: 'SEN-121', title: 'Perbaikan temuan' },
        subtasks: [],
      }),
    })

    expect(screen.queryByRole('region', { name: 'Sub-task' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sub-task dari SEN-121' }))
    expect(onOpenTask).toHaveBeenCalledWith('SEN-121')
  })

  it('memuat dan gagal memuat punya tampilan sendiri', async () => {
    const onRetry = vi.fn()
    const { user } = setup({ detail: undefined, loading: true })
    expect(screen.getByRole('status')).toHaveTextContent('Memuat task')

    setup({ detail: undefined, loadError: 'Task tidak ditemukan.', onRetry })
    expect(screen.getByRole('alert')).toHaveTextContent('Task tidak ditemukan.')
    await user.click(screen.getByRole('button', { name: 'Coba lagi' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})

describe('TaskDrawer: mengubah di tempat', () => {
  it('judul: klik, ketik, Simpan mengirim { title }', async () => {
    const { user, onSave } = setup()

    await user.click(screen.getByRole('button', { name: 'Pipeline GitLab IRS' }))
    const box = screen.getByRole('textbox', { name: 'Judul' })
    await user.clear(box)
    await user.type(box, 'Pipeline CI')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))

    expect(onSave).toHaveBeenCalledExactlyOnceWith({ title: 'Pipeline CI' })
  })

  it('keterangan dikirim sebagai { description }', async () => {
    const { user, onSave } = setup()

    await user.click(screen.getByRole('button', { name: 'Pipeline CI/CD untuk modul IRS.' }))
    await user.type(screen.getByRole('textbox', { name: 'Keterangan' }), ' Ditambah.')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))

    expect(onSave).toHaveBeenCalledExactlyOnceWith({
      description: 'Pipeline CI/CD untuk modul IRS. Ditambah.',
    })
  })

  it('status biasa diteruskan ke induk; status yang sama diabaikan', async () => {
    const { user, onChangeStatus } = setup()

    await user.click(fields().getByRole('button', { name: /Blocked/ }))
    await user.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Done' }))

    expect(onChangeStatus).toHaveBeenCalledExactlyOnceWith('done')
  })

  it('prioritas: pilihan baru dikirim sebagai { priority }', async () => {
    const { user, onSave } = setup()

    await user.click(screen.getByRole('button', { name: 'Ubah prioritas' }))
    await user.click(within(screen.getByRole('listbox')).getByRole('option', { name: /Low/ }))

    expect(onSave).toHaveBeenCalledExactlyOnceWith({ priority: 'Low' })
  })

  it('PIC: centang orang, Simpan mengirim daftar id; Tamu tidak ditawarkan', async () => {
    const { user, onSave } = setup()

    await user.click(screen.getByRole('button', { name: 'Ubah PIC' }))
    const panel = screen.getByRole('dialog', { name: 'Ubah PIC' })
    expect(within(panel).queryByLabelText('Pak Budi')).not.toBeInTheDocument()
    await user.click(within(panel).getByLabelText('Manto'))
    await user.click(within(panel).getByLabelText('Wiwiet'))
    await user.click(within(panel).getByRole('button', { name: 'Simpan' }))

    expect(onSave).toHaveBeenCalledExactlyOnceWith({ assigneeIds: ['ah', 'mn'] })
    expect(screen.queryByRole('dialog', { name: 'Ubah PIC' })).not.toBeInTheDocument()
  })

  it('tanggal dikirim sebagai { dates }, kosong menjadi null', async () => {
    const { user, onSave } = setup()

    await user.click(screen.getByRole('button', { name: 'Ubah Tanggal' }))
    const panel = screen.getByRole('dialog', { name: 'Ubah Tanggal' })
    await user.clear(within(panel).getByLabelText('Selesai'))
    await user.click(within(panel).getByRole('button', { name: 'Simpan' }))

    expect(onSave).toHaveBeenCalledExactlyOnceWith({
      dates: { startDate: '2026-09-21', dueDate: null },
    })
  })

  it('label dipisah koma dan dirapikan', async () => {
    const { user, onSave } = setup()

    await user.click(screen.getByRole('button', { name: 'Ubah Label' }))
    const input = screen.getByRole('combobox', { name: 'Label (pisahkan dengan koma)' })
    await user.clear(input)
    await user.type(input, 'UAT,  API ,')
    await user.click(
      within(screen.getByRole('dialog', { name: 'Ubah Label' })).getByRole('button', {
        name: 'Simpan',
      }),
    )

    expect(onSave).toHaveBeenCalledExactlyOnceWith({ labels: ['UAT', 'API'] })
  })

  it('pindah sub-proyek lewat menu; hanya muncul bila ada lebih dari satu pilihan', async () => {
    const { user, onSave } = setup()

    await user.click(screen.getByRole('button', { name: 'Pindahkan ke sub-proyek' }))
    await user.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'SLMS' }))
    expect(onSave).toHaveBeenCalledExactlyOnceWith({ projectId: 'p-slms' })
  })

  it('alasan tertahan diubah di tempat tanpa menghilangkan "menunggu siapa"', async () => {
    const { user, onSaveHold } = setup()

    await user.click(
      screen.getByRole('button', { name: 'Runner belum bisa mengakses server staging.' }),
    )
    const box = screen.getByRole('textbox', { name: 'Alasan tertahan' })
    await user.clear(box)
    await user.type(box, 'Firewall masih tertutup')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))

    expect(onSaveHold).toHaveBeenCalledExactlyOnceWith({
      holdReason: 'Firewall masih tertutup',
      waitingOnUserId: 'mn',
      waitingOnText: '',
    })
  })

  it('"menunggu siapa" bisa diganti ke pihak lain (teks bebas) dan alasan tetap dikirim', async () => {
    const { user, onSaveHold } = setup()

    await user.click(screen.getByRole('button', { name: 'Ubah Menunggu siapa' }))
    const panel = screen.getByRole('dialog', { name: 'Ubah Menunggu siapa' })
    await user.type(within(panel).getByLabelText('Atau pihak lain'), 'Klien, tim IT')
    expect(within(panel).getByLabelText('Orang di proyek')).toHaveValue('') // memilih teks mengosongkan orang
    await user.click(within(panel).getByRole('button', { name: 'Simpan' }))

    expect(onSaveHold).toHaveBeenCalledExactlyOnceWith({
      holdReason: 'Runner belum bisa mengakses server staging.',
      waitingOnUserId: null,
      waitingOnText: 'Klien, tim IT',
    })
  })

  it('pesan kesalahan server per bidang tampil di bidangnya', async () => {
    const { user } = setup({ fieldErrors: { title: 'Judul maksimal 200 karakter.' } })

    await user.click(screen.getByRole('button', { name: 'Pipeline GitLab IRS' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Judul maksimal 200 karakter.')
  })

  it('menu "…" menyalin tautan, menambah sub-task, dan menghapus', async () => {
    const { user, onCopyLink, onAddSubtask, onDelete } = setup()

    for (const [name, handler] of [
      ['Salin tautan', onCopyLink],
      ['Tambah sub-task', onAddSubtask],
      ['Hapus task', onDelete],
    ] as const) {
      await user.click(screen.getByRole('button', { name: 'Aksi lain' }))
      await user.click(within(screen.getByRole('listbox')).getByRole('option', { name }))
      expect(handler).toHaveBeenCalledOnce()
    }
  })

  it('klik sub-task membuka sub-task itu', async () => {
    const { user, onOpenTask } = setup()

    await user.click(screen.getByRole('button', { name: 'Buka akses runner ke staging' }))

    expect(onOpenTask).toHaveBeenCalledWith('SEN-117')
  })
})

describe('TaskDrawer: Tamu', () => {
  const guest = () =>
    detail({
      canEdit: false,
      task: row({ title: 'Pipeline GitLab IRS' }),
    })

  it('kontrol ubah disembunyikan, bukan dinonaktifkan; alasan dan menunggu tampil sebagai teks', () => {
    setup({ detail: guest() })

    for (const name of [
      'Pipeline GitLab IRS', // judul
      'Pipeline CI/CD untuk modul IRS.', // keterangan
      'Runner belum bisa mengakses server staging.', // alasan tertahan
      'Ubah prioritas',
      'Ubah PIC',
      'Ubah Tanggal',
      'Ubah Label',
      'Tambah sub-task',
    ]) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    }
    expect(fields().queryByRole('button')).not.toBeInTheDocument() // status juga bukan tombol
    const hold = screen.getByRole('region', { name: 'Alasan tertahan' })
    expect(hold).toHaveTextContent('Runner belum bisa mengakses server staging.')
    expect(hold).toHaveTextContent('Menunggu: Manto')
    expect(hold).toHaveTextContent('sejak 24 Sep')
  })

  it('kotak menulis hanya menawarkan Komentar', () => {
    setup({ detail: guest() })

    expect(screen.getByRole('button', { name: 'Komentar' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Update' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Internal' })).not.toBeInTheDocument()
  })

  it('menu "…" hanya punya Salin tautan', async () => {
    const { user } = setup({ detail: guest() })

    await user.click(screen.getByRole('button', { name: 'Aksi lain' }))

    expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(1)
  })
})

describe('TaskDrawer: kotak menulis', () => {
  it('Pengelola/Anggota punya Update, Komentar, dan Internal', () => {
    setup()

    for (const name of ['Update', 'Komentar', 'Internal']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
  })

  it('Admin yang bukan anggota melihat penjelasan, bukan kotak menulis', () => {
    setup({ detail: detail({ canEdit: false, canComment: false }) })

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.getByText(/sebagai Admin/)).toBeInTheDocument()
  })

  it('entri dikirim ke induk dengan jenis, teks, dan orang yang ditandai', async () => {
    const { user, onPostActivity } = setup()

    await user.type(screen.getByRole('combobox'), 'Cek @man')
    await user.keyboard('{Enter}')
    await user.click(screen.getByRole('button', { name: 'Kirim' }))

    expect(onPostActivity).toHaveBeenCalledExactlyOnceWith({
      kind: 'Comment',
      body: 'Cek @Manto',
      mentionUserIds: ['mn'],
    })
  })
})
