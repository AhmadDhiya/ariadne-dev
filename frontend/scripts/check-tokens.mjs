// Menolak warna yang ditulis langsung di kode (pedoman G6). Semua warna harus dari
// variabel di src/styles/tokens.css supaya tema terang/gelap selalu benar.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = fileURLToPath(new URL('../src/', import.meta.url))
const ALLOWED = new Set(['styles/tokens.css'])

const HEX = /#[0-9a-fA-F]{3,8}\b/
const COLOR_FN = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/
const NAMED_COLOR =
  /:\s*[^;{}]*\b(?:white|black|red|blue|green|gr[ae]y|orange|purple|yellow|pink|brown)\b/i
const QUOTED_HEX = /['"`]#[0-9a-fA-F]{3,8}['"`]/

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

/** Menghapus komentar tapi mempertahankan jumlah baris, supaya nomor baris tetap benar. */
function stripComments(text, lineComments) {
  const keepLines = (match) => match.replace(/[^\n]/g, ' ')
  let out = text.replace(/\/\*[\s\S]*?\*\//g, keepLines)
  if (lineComments)
    out = out.replace(/(^|[^:])\/\/.*$/gm, (m, p1) => p1 + ' '.repeat(m.length - p1.length))
  return out
}

const problems = []
for (const file of walk(SRC)) {
  const rel = relative(SRC, file).split(sep).join('/')
  if (ALLOWED.has(rel)) continue
  const isCss = rel.endsWith('.css')
  const isCode = /\.(ts|tsx)$/.test(rel) && !/\.test\.tsx?$/.test(rel)
  if (!isCss && !isCode) continue

  const lines = stripComments(readFileSync(file, 'utf8'), isCode).split('\n')
  lines.forEach((line, i) => {
    const bad = isCss
      ? HEX.test(line) || COLOR_FN.test(line) || NAMED_COLOR.test(line)
      : QUOTED_HEX.test(line) || COLOR_FN.test(line)
    if (bad) problems.push(`src/${rel}:${i + 1}: ${line.trim()}`)
  })
}

if (problems.length) {
  console.error('Warna ditulis langsung. Pakai variabel dari src/styles/tokens.css:\n')
  for (const p of problems) console.error(`  ${p}`)
  process.exit(1)
}
console.log('Token warna: tidak ada warna yang ditulis langsung.')
