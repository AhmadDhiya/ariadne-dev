import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { SearchResults } from '@/types/api'
import { GlobalSearch, type GlobalSearchProps } from './GlobalSearch'

const RESULTS: SearchResults = {
  tasks: [
    {
      id: 't1',
      key: 'SEN-115',
      title: 'Pipeline GitLab IRS',
      status: 'Blocked',
      projectId: 'p-dispatch',
      path: 'Sentul / Dispatch',
    },
  ],
  projects: [{ id: 'p-sentul', name: 'Sentul', path: 'Sentul' }],
  people: [{ id: 'u1', name: 'Rama', projectId: 'p-sentul', projectName: 'Sentul' }],
}

/** Menjaga teks kotak sendiri, seperti pemanggil sungguhan (halaman yang menunda permintaan). */
function Harness(props: Partial<GlobalSearchProps> & { initial?: string }) {
  const [query, setQuery] = useState(props.initial ?? '')
  return (
    <GlobalSearch
      query={query}
      onQueryChange={setQuery}
      results={RESULTS}
      onSelect={vi.fn()}
      {...props}
    />
  )
}

const box = () => screen.getByRole('combobox')

describe('GlobalSearch', () => {
  it('popup tertutup sampai ada kata; hasil dikelompokkan Task, Proyek, Orang', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

    await user.type(box(), 'si')

    expect(screen.getByRole('group', { name: 'Task' })).toHaveTextContent('Pipeline GitLab IRS')
    expect(screen.getByRole('group', { name: 'Task' })).toHaveTextContent('Sentul / Dispatch')
    expect(screen.getByRole('group', { name: 'Proyek' })).toHaveTextContent('Sentul')
    expect(screen.getByRole('group', { name: 'Orang' })).toHaveTextContent('di Sentul')
    expect(screen.getAllByRole('option')).toHaveLength(3)
  })

  it('panah memindah sorotan dan Enter memilih; setelah itu kotak dikosongkan', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} />)

    await user.type(box(), 'si')
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')

    expect(onSelect).toHaveBeenCalledOnce()
    expect(onSelect.mock.calls[0]?.[0]).toMatchObject({ kind: 'person', item: { name: 'Rama' } })
    expect(box()).toHaveValue('')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('panah ke atas dari baris pertama melompat ke yang terakhir; klik memilih', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} />)

    await user.type(box(), 'si')
    await user.keyboard('{ArrowUp}')
    expect(box()).toHaveAttribute('aria-activedescendant', expect.stringContaining('o-u1'))
    await user.click(screen.getByRole('option', { name: /Pipeline GitLab IRS/ }))

    expect(onSelect.mock.calls[0]?.[0]).toMatchObject({ kind: 'task', item: { key: 'SEN-115' } })
  })

  it('Esc menutup popup dulu, lalu mengosongkan kata', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(box(), 'si')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(box()).toHaveValue('si')

    await user.keyboard('{Escape}')
    expect(box()).toHaveValue('')
  })

  it('"/" memfokuskan kotak dari mana saja, tetapi tidak saat sedang mengetik di kolom lain', async () => {
    const user = userEvent.setup()
    render(
      <>
        <Harness />
        <textarea aria-label="Kotak lain" />
      </>,
    )

    await user.keyboard('/')
    expect(box()).toHaveFocus()
    expect(box()).toHaveValue('') // "/" sendiri tidak ikut terketik

    await user.click(screen.getByRole('textbox', { name: 'Kotak lain' }))
    await user.keyboard('a/b')
    expect(screen.getByRole('textbox', { name: 'Kotak lain' })).toHaveValue('a/b')
    expect(box()).not.toHaveFocus()
  })

  it('tanpa hasil, selama memuat, dan saat gagal punya kalimat sendiri', async () => {
    const user = userEvent.setup()
    const empty: SearchResults = { tasks: [], projects: [], people: [] }
    const { rerender } = render(
      <GlobalSearch query="" onQueryChange={vi.fn()} onSelect={vi.fn()} />,
    )

    rerender(<GlobalSearch query="xyz" onQueryChange={vi.fn()} onSelect={vi.fn()} loading />)
    await user.click(box())
    expect(screen.getByRole('status')).toHaveTextContent('Mencari…')

    rerender(
      <GlobalSearch query="xyz" onQueryChange={vi.fn()} onSelect={vi.fn()} results={empty} />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Tidak ada hasil untuk “xyz”')

    rerender(
      <GlobalSearch
        query="xyz"
        onQueryChange={vi.fn()}
        onSelect={vi.fn()}
        error="Gagal mencari."
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Gagal mencari.')
  })

  it('kata hanya berupa spasi tidak membuka popup', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(box(), '   ')

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
