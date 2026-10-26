#!/usr/bin/env node
// Menjalankan SEMUA pemeriksaan kualitas dan keamanan (docs/pedoman-kode-ai.md).
// Hasilnya ditempel di ringkasan setiap fase.
//
//   node scripts/check.mjs           semua pemeriksaan
//   node scripts/check.mjs --cepat   tanpa test browser (Playwright)
//
// Butuh: .NET 10 SDK, Node 24, dan Docker Desktop yang menyala (test database, pemindai rahasia,
// dan stack sementara untuk test browser; tidak butuh file .env dan tidak menyentuh stack kerja).
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BACKEND = join(ROOT, 'backend')
const FRONTEND = join(ROOT, 'frontend')
const GITLEAKS_IMAGE = 'ghcr.io/gitleaks/gitleaks:v8.30.1'
const quick = process.argv.includes('--cepat')

/** Menjalankan perintah; `capture` mengembalikan keluarannya untuk diperiksa. */
function run(command, cwd, { capture = false, env = process.env } = {}) {
  const result = spawnSync(command, {
    cwd,
    env,
    shell: true,
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
  return { ok: result.status === 0, output: `${result.stdout ?? ''}${result.stderr ?? ''}` }
}

function filesIn(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? filesIn(path) : [path]
  })
}

const steps = [
  ['Backend: build (peringatan = error)', () => run('dotnet build --nologo', BACKEND).ok],
  ['Backend: format & gaya kode', () => run('dotnet format --verify-no-changes --no-restore', BACKEND).ok],
  ['Backend: test (xUnit + PostgreSQL di Docker)', () => run('dotnet test', BACKEND).ok],
  [
    'Backend: paket rentan (NuGet)',
    () => {
      const r = run('dotnet list package --vulnerable --include-transitive', BACKEND, { capture: true })
      const vulnerable = /has the following vulnerable packages/i.test(r.output)
      if (vulnerable || !r.ok) console.log(r.output)
      return r.ok && !vulnerable
    },
  ],
  ['Frontend: typecheck', () => run('npm run typecheck', FRONTEND).ok],
  ['Frontend: lint (termasuk aturan arah import atomic)', () => run('npm run lint', FRONTEND).ok],
  ['Frontend: format', () => run('npm run format:check', FRONTEND).ok],
  ['Frontend: token warna', () => run('npm run check:tokens', FRONTEND).ok],
  ['Frontend: test unit', () => run('npm test', FRONTEND).ok],
  [
    'Frontend: build produksi tanpa kode khusus dev dan tanpa source map',
    () => {
      if (!run('npm run build', FRONTEND).ok) return false
      const files = filesIn(join(FRONTEND, 'dist'))
      const maps = files.filter((f) => f.endsWith('.map'))
      const devCode = files.filter(
        (f) => f.endsWith('.js') && readFileSync(f, 'utf8').includes('Katalog komponen'),
      )
      if (maps.length) console.log('Source map ikut ter-build:', maps)
      if (devCode.length) console.log('Kode katalog dev ikut ter-build:', devCode)
      return maps.length === 0 && devCode.length === 0
    },
  ],
  ['Frontend: paket rentan (npm audit)', () => run('npm audit --audit-level=moderate', FRONTEND).ok],
  [
    'Rahasia: file saat ini (gitleaks)',
    () => {
      // Hanya file yang dilacak git + file baru yang tidak di-.gitignore (tanpa node_modules, .env)
      const list = run('git ls-files -co --exclude-standard', ROOT, { capture: true })
      if (!list.ok) return false
      const scanDir = mkdtempSync(join(tmpdir(), 'ariadne-gitleaks-'))
      try {
        for (const rel of list.output.split('\n').filter(Boolean)) {
          const src = join(ROOT, rel)
          if (existsSync(src)) cpSync(src, join(scanDir, rel))
        }
        return run(`docker run --rm -v "${scanDir}:/scan:ro" ${GITLEAKS_IMAGE} dir /scan --redact --no-banner`, ROOT).ok
      } finally {
        rmSync(scanDir, { recursive: true, force: true })
      }
    },
  ],
  [
    'Rahasia: seluruh riwayat git (gitleaks)',
    () => run(`git log -p --all --no-color | docker run --rm -i ${GITLEAKS_IMAGE} stdin --redact --no-banner`, ROOT).ok,
  ],
]

if (!quick) {
  steps.push(['Frontend: test browser katalog komponen (Playwright + axe)', () => run('npm run e2e', FRONTEND).ok])
  steps.push([
    'Stack penuh: test browser login, peran, dan halaman Fase 2 (Docker + Mailpit, database sementara)',
    runStackE2E,
  ])
}

/**
 * Test browser terhadap stack penuh di Docker. Stack ini TERPISAH dari stack kerja Anda: nama proyek, port,
 * dan database lain, password acak, dan data contoh aktif. Dibongkar lengkap (termasuk database) di akhir,
 * jadi data kerja di http://localhost:18080 tidak tersentuh dan tidak butuh file .env.
 */
function runStackE2E() {
  const password = () => randomBytes(18).toString('base64url')
  const ports = { WEB_PORT: '28080', DB_PORT: '54322', MAILPIT_WEB_PORT: '28025', MAILPIT_SMTP_PORT: '20251' }
  const env = {
    ...process.env,
    ...ports,
    POSTGRES_PASSWORD: password(),
    SEED_PASSWORD: password(),
    BOOTSTRAP_ADMIN_EMAIL: '',
    BOOTSTRAP_ADMIN_PASSWORD: '',
    ASPNETCORE_ENVIRONMENT: 'Development',
    APP_BASE_URL: `http://localhost:${ports.WEB_PORT}`,
    ARIADNE_STACK_URL: `http://localhost:${ports.WEB_PORT}`,
    ARIADNE_MAILPIT_URL: `http://localhost:${ports.MAILPIT_WEB_PORT}`,
  }
  const compose = 'docker compose -p ariadne-e2e'
  try {
    if (!run(`${compose} up -d --build`, ROOT, { env }).ok) return false
    if (!waitForStack(env.ARIADNE_STACK_URL)) {
      console.log('API tidak menjawab sehat dalam 3 menit. Periksa: docker compose -p ariadne-e2e logs api')
      return false
    }
    return run('npm run e2e:stack', FRONTEND, { env }).ok
  } finally {
    run(`${compose} down -v`, ROOT, { env })
  }
}

/** Menunggu API menjawab sehat (maks. 3 menit). */
function waitForStack(baseUrl) {
  const until = Date.now() + 180_000
  while (Date.now() < until) {
    if (run(`curl -fsS ${baseUrl}/api/health`, ROOT, { capture: true }).ok) return true
    spawnSync(process.execPath, ['-e', 'setTimeout(()=>{},3000)'])
  }
  return false
}

const results = []
for (const [name, step] of steps) {
  console.log(`\n▶ ${name}`)
  const started = Date.now()
  let ok = false
  try {
    ok = step()
  } catch (error) {
    console.error(error)
  }
  results.push({ name, ok, seconds: ((Date.now() - started) / 1000).toFixed(0) })
}

console.log('\n══════════ Ringkasan pemeriksaan ══════════')
for (const r of results) console.log(`${r.ok ? '✔ LULUS' : '✘ GAGAL'}  ${r.name} (${r.seconds} dtk)`)
if (quick) console.log('–       Test browser dilewati (--cepat)')
const failed = results.filter((r) => !r.ok).length
console.log(failed ? `\n${failed} pemeriksaan GAGAL.` : '\nSemua pemeriksaan lulus.')
process.exit(failed ? 1 : 0)
