import { useEffect, useState } from 'react'

/** Nilai yang baru berubah setelah `delay` ms tanpa perubahan lagi (mis. kata pencarian, supaya tidak menembak server di tiap ketikan). */
export function useDebouncedValue<T>(value: T, delay = 200): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}
