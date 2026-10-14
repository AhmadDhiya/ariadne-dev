import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { EmailChipsInput } from './EmailChipsInput'

function Harness({ initial = [] as string[] }) {
  const [emails, setEmails] = useState(initial)
  return <EmailChipsInput value={emails} onChange={setEmails} placeholder="Tambah email lain" />
}

describe('EmailChipsInput', () => {
  it('koma dan Enter menambah email; duplikat (beda huruf besar) diabaikan', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const input = screen.getByRole('textbox')

    await user.type(input, 'a@klien.example,')
    await user.type(input, 'b@klien.example{Enter}')
    await user.type(input, 'A@klien.example{Enter}')

    expect(screen.getByRole('button', { name: 'Hapus a@klien.example' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hapus b@klien.example' })).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })

  it('format salah diberitahukan ke pembaca layar; Backspace menghapus yang terakhir', async () => {
    const user = userEvent.setup()
    render(<Harness initial={['ok@klien.example', 'salah@']} />)

    expect(screen.getByText('(format email tidak valid)', { exact: false })).toBeInTheDocument()
    await user.click(screen.getByRole('textbox'))
    await user.keyboard('{Backspace}')
    expect(screen.queryByText('salah@')).not.toBeInTheDocument()
    expect(screen.getByText('ok@klien.example')).toBeInTheDocument()
  })
})
