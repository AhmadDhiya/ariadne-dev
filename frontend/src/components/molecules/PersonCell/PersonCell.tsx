import { Avatar } from '@/components/atoms/Avatar'
import './PersonCell.css'

export interface PersonCellProps {
  name: string
  /** Kosong untuk Tamu (server tidak mengirim email ke Tamu). */
  email?: string | null
  guest?: boolean
  size?: number
}

/** Avatar + nama + email, untuk kolom "Nama" di tabel anggota. */
export function PersonCell({ name, email, guest, size = 28 }: PersonCellProps) {
  return (
    <span className="ar-person">
      <Avatar name={name} size={size} guest={guest} />
      <span className="ar-person-text">
        <span className="ar-person-name">{name}</span>
        {email ? <span className="ar-person-email">{email}</span> : null}
      </span>
    </span>
  )
}
