import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Drawer } from './Drawer'

describe('Drawer', () => {
  it('berjudul untuk pembaca layar dan menampilkan footer', () => {
    render(
      <Drawer
        open
        onClose={() => undefined}
        title="Pipeline GitLab IRS"
        eyebrow="SEN-115"
        footer={<button type="button">Kirim</button>}
      >
        Isi
      </Drawer>,
    )
    expect(screen.getByRole('dialog', { name: 'Pipeline GitLab IRS' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Kirim' })).toBeInTheDocument()
  })
})
