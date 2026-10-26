import type { PriorityName } from '@/types/api'

/** "UAT, api,  ,UAT" menjadi ["UAT", "api"]: spasi dirapikan, kosong dibuang, kembar (huruf besar/kecil sama) digabung. */
export function parseLabels(text: string): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const part of text.split(',')) {
    const label = part.trim()
    if (!label || seen.has(label.toLowerCase())) continue
    seen.add(label.toLowerCase())
    result.push(label)
  }
  return result
}

export interface TaskFormInput {
  title: string
  description: string
  priority: PriorityName
  assigneeIds: string[]
  start: string
  end: string
  labels: string
}

/** Isian form menjadi isi permintaan API. Tanggal kosong dikirim sebagai null (bukan teks kosong). */
export function toTaskPayload(values: TaskFormInput) {
  return {
    title: values.title.trim(),
    description: values.description,
    priority: values.priority,
    startDate: values.start || null,
    dueDate: values.end || null,
    assigneeIds: values.assigneeIds,
    labels: parseLabels(values.labels),
  }
}
