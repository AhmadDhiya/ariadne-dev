/** Menggabungkan nama class CSS, melewati nilai kosong/false. */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}
