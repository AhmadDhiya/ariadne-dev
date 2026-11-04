import { describe, expect, it } from 'vitest'
import { summarizeInvites } from './invitations'

describe('summarizeInvites', () => {
  it('merangkum setiap jenis hasil', () => {
    expect(
      summarizeInvites([
        { email: 'a@x.example', outcome: 'Diundang' },
        { email: 'b@x.example', outcome: 'Diundang' },
        { email: 'c@x.example', outcome: 'Ditambahkan' },
        { email: 'd@x.example', outcome: 'SudahAnggota' },
      ]),
    ).toEqual({
      text: '2 undangan dikirim · 1 orang langsung ditambahkan (sudah punya akun) · 1 sudah menjadi anggota',
      problem: false,
    })
  })

  it('akun nonaktif disebut namanya dan ditandai sebagai masalah', () => {
    expect(summarizeInvites([{ email: 'mati@x.example', outcome: 'AkunNonaktif' }])).toEqual({
      text: 'akun nonaktif, tidak diundang: mati@x.example',
      problem: true,
    })
  })
})
