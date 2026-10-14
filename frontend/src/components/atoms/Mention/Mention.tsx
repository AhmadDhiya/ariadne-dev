import './Mention.css'

export interface MentionProps {
  /** Nama tanpa "@". */
  children: string
}

/** @nama di dalam teks komentar. Selalu teks biasa, tidak pernah HTML (pedoman C2). */
export function Mention({ children }: MentionProps) {
  return <span className="ar-mention">@{children}</span>
}
