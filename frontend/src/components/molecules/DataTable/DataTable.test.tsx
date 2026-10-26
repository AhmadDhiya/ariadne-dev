import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DataTable, type Column } from './DataTable'

interface Row {
  id: string
  name: string
}
const COLUMNS: Column<Row>[] = [
  { key: 'name', header: 'Nama', render: (r) => r.name },
  { key: 'act', header: 'Aksi', headerHidden: true, render: () => <button>Ubah</button> },
]

describe('DataTable', () => {
  it('memakai tabel sungguhan dengan nama dan header kolom', () => {
    render(
      <DataTable
        caption="Anggota Tim Sentul"
        columns={COLUMNS}
        rows={[
          { id: '1', name: 'Ahmad' },
          { id: '2', name: 'Rama' },
        ]}
        rowKey={(r) => r.id}
      />,
    )
    const table = screen.getByRole('table', { name: 'Anggota Tim Sentul' })
    expect(within(table).getAllByRole('row')).toHaveLength(3)
    expect(within(table).getByRole('columnheader', { name: 'Nama' })).toBeInTheDocument()
    // Header kolom tombol tetap ada untuk pembaca layar
    expect(within(table).getByRole('columnheader', { name: 'Aksi' })).toBeInTheDocument()
  })

  it('tanpa baris menampilkan pesan kosong', () => {
    render(
      <DataTable
        caption="Kosong"
        columns={COLUMNS}
        rows={[]}
        rowKey={(r) => r.id}
        empty="Belum ada data."
      />,
    )
    expect(screen.getByText('Belum ada data.')).toBeInTheDocument()
  })
})
