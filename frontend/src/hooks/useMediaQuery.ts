import { useSyncExternalStore } from 'react'

/** Layar sempit (< 768px, mockup 11): header dengan menu, sidebar jadi panel geser, dialog jadi sheet dari bawah. */
export const MOBILE_QUERY = '(max-width: 767px)'

/** True bila media query cocok dengan layar saat ini; ikut berubah saat jendela diubah ukurannya. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== 'function') return () => undefined
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
    () => false,
  )
}
