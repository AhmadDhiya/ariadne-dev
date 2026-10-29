import { describe, expect, it } from 'vitest'
import {
  activeMentionToken,
  filterCandidates,
  insertMention,
  mentionedIn,
  splitMentions,
} from './mentions'

describe('activeMentionToken', () => {
  it('menemukan @ yang sedang diketik sebelum kursor', () => {
    expect(activeMentionToken('Proxy bisa, tapi perlu persetujuan @ma', 38)).toEqual({
      start: 35,
      query: 'ma',
    })
    expect(activeMentionToken('@', 1)).toEqual({ start: 0, query: '' })
  })

  it('hanya di awal teks atau setelah spasi, jadi alamat email tidak memunculkan daftar', () => {
    expect(activeMentionToken('kirim ke ahmad@perusahaan.co.id', 31)).toBeNull()
    expect(activeMentionToken('halo\n@ra', 8)).toEqual({ start: 5, query: 'ra' })
  })

  it('tidak aktif bila tidak ada @, kursor sebelum @, atau sudah ganti baris', () => {
    expect(activeMentionToken('tanpa tanda', 5)).toBeNull()
    expect(activeMentionToken('halo @ra', 3)).toBeNull()
    expect(activeMentionToken('@ra\nlanjut', 10)).toBeNull()
  })

  it('berhenti bila ketikan terlalu panjang', () => {
    expect(activeMentionToken(`@${'a'.repeat(31)}`, 32)).toBeNull()
  })
})

describe('filterCandidates', () => {
  const people = [
    { id: '1', name: 'Rama' },
    { id: '2', name: 'Manto' },
    { id: '3', name: 'Syaikhan Maulana' },
  ]

  it('mencocokkan potongan nama tanpa membedakan huruf besar/kecil, yang diawali ketikan dulu', () => {
    expect(filterCandidates(people, 'ma').map((p) => p.name)).toEqual([
      'Manto',
      'Rama',
      'Syaikhan Maulana',
    ])
  })

  it('ketikan kosong menampilkan semua, urut abjad', () => {
    expect(filterCandidates(people, '').map((p) => p.name)).toEqual([
      'Manto',
      'Rama',
      'Syaikhan Maulana',
    ])
  })

  it('tidak ada yang cocok memberi daftar kosong', () => {
    expect(filterCandidates(people, 'zzz')).toEqual([])
  })

  it('spasi di ujung menutup daftar kecuali nama itu memang mengandung spasi', () => {
    expect(filterCandidates(people, 'rama ')).toEqual([])
    expect(filterCandidates(people, 'syaikhan ').map((p) => p.name)).toEqual(['Syaikhan Maulana'])
  })
})

describe('insertMention', () => {
  it('mengganti @ketikan dengan @Nama dan spasi, dan menaruh kursor sesudahnya', () => {
    const text = 'Perlu persetujuan @ma dulu'
    const token = activeMentionToken(text, 21)
    if (!token) throw new Error('token seharusnya ada')
    const result = insertMention(text, token, 21, 'Manto')
    expect(result.text).toBe('Perlu persetujuan @Manto  dulu')
    expect(result.caret).toBe(25)
  })
})

describe('mentionedIn', () => {
  const picks = [
    { id: '1', name: 'Manto' },
    { id: '2', name: 'Rama' },
  ]

  it('hanya memuat yang masih tertulis di teks akhir', () => {
    expect(mentionedIn('Cek @Manto ya', picks)).toEqual(['1'])
    expect(mentionedIn('Cek ya', picks)).toEqual([])
  })

  it('tidak ganda bila ditandai dua kali, dan tidak cocok dengan potongan nama lain', () => {
    expect(mentionedIn('@Manto lalu @Manto lagi', picks)).toEqual(['1'])
    expect(mentionedIn('@Ramadhan hadir', picks)).toEqual([])
  })
})

describe('splitMentions', () => {
  it('memecah teks menjadi bagian biasa dan bagian @nama', () => {
    expect(splitMentions('@Ahmad bisa dicek? cc @Rama', ['Ahmad', 'Rama'])).toEqual([
      { text: 'Ahmad', mention: true },
      { text: ' bisa dicek? cc ', mention: false },
      { text: 'Rama', mention: true },
    ])
  })

  it('tanpa nama atau tanpa kecocokan, teks utuh', () => {
    expect(splitMentions('halo @siapa', [])).toEqual([{ text: 'halo @siapa', mention: false }])
    expect(splitMentions('halo @siapa', ['Rama'])).toEqual([
      { text: 'halo @siapa', mention: false },
    ])
    expect(splitMentions('', ['Rama'])).toEqual([{ text: '', mention: false }])
  })

  it('nama dengan spasi dan nama yang saling memuat (yang lebih panjang menang)', () => {
    expect(splitMentions('terima kasih @Pak Budi', ['Pak', 'Pak Budi'])).toEqual([
      { text: 'terima kasih ', mention: false },
      { text: 'Pak Budi', mention: true },
    ])
  })

  it('tidak menyorot bila nama disambung huruf, dan karakter khusus tidak merusak pola', () => {
    expect(splitMentions('@Ramadhan', ['Rama'])).toEqual([{ text: '@Ramadhan', mention: false }])
    expect(splitMentions('@A.B (tim)', ['A.B'])).toEqual([
      { text: 'A.B', mention: true },
      { text: ' (tim)', mention: false },
    ])
  })
})
