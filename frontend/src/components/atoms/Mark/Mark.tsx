import './Mark.css'

export interface MarkProps {
  size?: number
}

/** Tanda logo Ariadne: tiga dinding labirin (ink) dan satu benang merah (thread). */
export function Mark({ size = 28 }: MarkProps) {
  return (
    <svg className="ar-mark" width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <g className="ar-mark-walls" strokeWidth={2} strokeLinecap="round">
        <path d="M27.78 21.49A13 13 0 1 1 27.78 10.51" />
        <path d="M8.30 19.59A8.5 8.5 0 1 0 8.30 12.41" />
        <path d="M19.63 17.69A4 4 0 1 1 19.63 14.31" />
      </g>
      <path
        className="ar-mark-thread"
        d="M16 16H22.25A6.25 6.25 0 0 0 9.75 16H5.25A10.75 10.75 0 0 0 26.75 16H29"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle className="ar-mark-knot" cx={29.5} cy={16} r={1.9} />
    </svg>
  )
}
