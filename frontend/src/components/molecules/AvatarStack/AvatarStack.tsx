import { Avatar } from '@/components/atoms/Avatar'
import './AvatarStack.css'

export interface AvatarStackProps {
  names: string[]
  /** Sisanya digabung menjadi "+N". */
  max?: number
  size?: number
}

/** Beberapa avatar bertumpuk, untuk sel PIC dengan banyak orang. */
export function AvatarStack({ names, max = 3, size = 24 }: AvatarStackProps) {
  const shown = names.slice(0, max)
  const rest = names.length - shown.length
  return (
    <span className="ar-avatars" title={names.join(', ')}>
      {shown.map((name) => (
        <Avatar key={name} name={name} size={size} />
      ))}
      {rest > 0 ? (
        <span
          className="ar-avatar ar-avatar-more"
          style={{ width: size, height: size }}
          aria-label={`dan ${rest} orang lain`}
          role="img"
        >
          +{rest}
        </span>
      ) : null}
    </span>
  )
}
