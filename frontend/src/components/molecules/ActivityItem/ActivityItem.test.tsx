import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ActivityItem } from './ActivityItem'

describe('ActivityItem', () => {
  it('komentar internal ditandai gembok dan kata Internal', () => {
    render(
      <ActivityItem kind="internal" author="Syaikhan" time="Kemarin">
        Rahasia tim
      </ActivityItem>,
    )
    expect(screen.getByText('Internal')).toBeInTheDocument()
  })

  it('isi komentar selalu teks; HTML dari pengguna tidak dijalankan', () => {
    render(
      <ActivityItem kind="comment" author="Pak Budi" time="09.30" guest>
        {'<img src=x onerror="alert(1)">'}
      </ActivityItem>,
    )
    expect(screen.getByText('<img src=x onerror="alert(1)">')).toBeInTheDocument()
    expect(document.querySelector('img')).not.toBeInTheDocument()
    expect(screen.getByText('Tamu')).toBeInTheDocument()
  })
})
