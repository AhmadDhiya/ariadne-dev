import './Kbd.css'

export interface KbdProps {
  children: string
}

/** Petunjuk tombol keyboard, mis. "/" untuk pencarian global. */
export function Kbd({ children }: KbdProps) {
  return <kbd className="ar-kbd">{children}</kbd>
}
