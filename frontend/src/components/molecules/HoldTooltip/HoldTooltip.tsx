import { useId, useState } from 'react'
import { Avatar } from '@/components/atoms/Avatar'
import { Icon } from '@/components/atoms/Icon'
import { StatusPill } from '@/components/atoms/StatusPill'
import { cx } from '@/lib/cx'
import { getStatus, type HeldStatusKey } from '@/lib/status'
import './HoldTooltip.css'

export interface HoldTooltipProps {
  status: HeldStatusKey
  /** Alasan tertahan (wajib saat task masuk status tertahan). */
  reason: string
  /** Orang atau pihak yang ditunggu, mis. "Manto" atau "Klien — tim IT". */
  waitingOn?: string
  /** Avatar hanya untuk orang, bukan pihak luar. */
  waitingOnIsPerson?: boolean
  /** Tanggal yang sudah diformat, mis. "24 Sep". */
  since?: string
  /** Paksa terbuka (untuk pratinjau). Tanpa ini, kartu terbuka saat hover atau fokus. */
  open?: boolean
  /** Kartu melayang di atas konten (default). `false` menaruhnya sejajar, seperti pratinjau design system. */
  floating?: boolean
}

/** Tombol info di samping task tertahan, dan kartu alasan + menunggu siapa. */
export function HoldTooltip({
  status,
  reason,
  waitingOn,
  waitingOnIsPerson = true,
  since,
  open,
  floating = true,
}: HoldTooltipProps) {
  const st = getStatus(status)
  const id = useId()
  const [shown, setShown] = useState(false)
  const visible = open ?? shown

  return (
    <span
      className="ar-hold"
      onMouseEnter={() => setShown(true)}
      onMouseLeave={() => setShown(false)}
    >
      <button
        type="button"
        className={cx('ar-hold-trigger', `ar-hold-${st.key}`)}
        aria-label={`Alasan ${st.label}`}
        aria-expanded={visible}
        aria-describedby={visible ? id : undefined}
        onFocus={() => setShown(true)}
        onBlur={() => setShown(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setShown(false)
        }}
      >
        <Icon name="info" size={14} />
      </button>
      {visible ? (
        <span id={id} className={cx('ar-tooltip', floating && 'is-floating')} role="tooltip">
          <span className="ar-tooltip-head">
            <StatusPill status={st.key} />
            {since ? <span className="ar-muted">sejak {since}</span> : null}
          </span>
          <span className="ar-tooltip-k">Alasan tertahan</span>
          <span className="ar-tooltip-v">{reason}</span>
          {waitingOn ? (
            <>
              <span className="ar-tooltip-k">Menunggu</span>
              <span className="ar-tooltip-v ar-tooltip-who">
                {waitingOnIsPerson ? <Avatar name={waitingOn} size={18} /> : null}
                {waitingOn}
              </span>
            </>
          ) : null}
        </span>
      ) : null}
    </span>
  )
}
