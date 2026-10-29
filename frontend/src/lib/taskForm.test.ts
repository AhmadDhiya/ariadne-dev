import { describe, expect, it } from 'vitest'
import { parseLabels, toTaskPayload } from './taskForm'

describe('parseLabels', () => {
  it('merapikan spasi, membuang yang kosong, dan menggabungkan yang kembar', () => {
    expect(parseLabels('UAT, api,  ,uat ,API')).toEqual(['UAT', 'api'])
  })

  it('teks kosong tidak menghasilkan label', () => {
    expect(parseLabels('')).toEqual([])
    expect(parseLabels(' , ,')).toEqual([])
  })
})

describe('toTaskPayload', () => {
  it('tanggal kosong dikirim sebagai null dan judul dirapikan', () => {
    const payload = toTaskPayload({
      title: '  Pasang runner  ',
      description: '',
      priority: 'High',
      assigneeIds: ['a'],
      start: '',
      end: '2026-10-02',
      labels: 'UAT, API',
    })

    expect(payload).toEqual({
      title: 'Pasang runner',
      description: '',
      priority: 'High',
      startDate: null,
      dueDate: '2026-10-02',
      assigneeIds: ['a'],
      labels: ['UAT', 'API'],
    })
  })
})
