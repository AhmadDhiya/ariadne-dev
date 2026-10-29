import { Fragment } from 'react'
import { Mention } from '@/components/atoms/Mention'
import { splitMentions } from '@/lib/mentions'

export interface MentionTextProps {
  text: string
  /** Nama orang yang ditandai di entri ini (dari server); hanya "@Nama" yang cocok yang disorot. */
  names: readonly string[]
}

/** Teks komentar dengan @nama disorot. Selalu teks biasa; tidak pernah HTML (pedoman C2). */
export function MentionText({ text, names }: MentionTextProps) {
  return (
    <>
      {splitMentions(text, names).map((part, i) =>
        part.mention ? (
          <Mention key={i}>{part.text}</Mention>
        ) : (
          <Fragment key={i}>{part.text}</Fragment>
        ),
      )}
    </>
  )
}
