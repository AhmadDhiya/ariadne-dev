// @vitest-environment node
import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

/**
 * Memastikan aturan arah import atomic dan larangan keamanan di eslint.config.js
 * benar-benar menolak pelanggaran, bukan hanya tertulis (pedoman F1).
 */
const eslint = new ESLint()

async function errorsFor(code: string, filePath: string) {
  const [result] = await eslint.lintText(code, { filePath })
  return (result?.messages ?? []).filter((m) => m.severity === 2).map((m) => m.ruleId)
}

// Memuat konfigurasi ESLint + TypeScript butuh beberapa detik saat test lain berjalan paralel.
describe('aturan arsitektur di ESLint', { timeout: 30_000 }, () => {
  it('atom tidak boleh memakai molekul', async () => {
    const code = "import { Logo } from '@/components/molecules/Logo'\nexport const x = Logo\n"
    expect(await errorsFor(code, 'src/components/atoms/Contoh/Contoh.tsx')).toContain(
      'no-restricted-imports',
    )
  })

  it('molekul tidak boleh memakai organisme, termasuk lewat path relatif', async () => {
    const code = "import { Menu } from '../../organisms/Menu'\nexport const x = Menu\n"
    expect(await errorsFor(code, 'src/components/molecules/Contoh/Contoh.tsx')).toContain(
      'no-restricted-imports',
    )
  })

  it('komponen tidak boleh mengambil data sendiri', async () => {
    const code = "import { useQuery } from '@tanstack/react-query'\nexport const x = useQuery\n"
    expect(await errorsFor(code, 'src/components/organisms/Contoh/Contoh.tsx')).toContain(
      'no-restricted-imports',
    )
  })

  it('halaman boleh memakai semua tingkat dan API', async () => {
    const code = [
      "import { useHealth } from '@/api/health'",
      "import { Menu } from '@/components/organisms/Menu'",
      'export const x = [useHealth, Menu]',
      '',
    ].join('\n')
    expect(await errorsFor(code, 'src/pages/Contoh/Contoh.tsx')).not.toContain(
      'no-restricted-imports',
    )
  })

  it('HTML mentah dan console.log ditolak', async () => {
    const code = [
      'export function X({ html }: { html: string }) {',
      '  console.log(html)',
      '  return <div dangerouslySetInnerHTML={{ __html: html }} />',
      '}',
      '',
    ].join('\n')
    const errors = await errorsFor(code, 'src/pages/Contoh/Contoh.tsx')
    expect(errors).toContain('no-restricted-syntax')
    expect(errors).toContain('no-console')
  })
})
