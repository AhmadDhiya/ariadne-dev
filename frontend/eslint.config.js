import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

/**
 * Aturan arah import atomic (docs/rencana.md bagian 4a):
 * atoms → molecules → organisms → templates → pages. Import hanya boleh ke tingkat yang
 * sama atau lebih rendah, dan hanya pages/ yang boleh mengambil data dari API.
 */
const LEVELS = ['atoms', 'molecules', 'organisms', 'templates']

const upward = (level) => LEVELS.slice(LEVELS.indexOf(level) + 1)

const forbid = (targets, message) => ({
  regex: `(^|/)(${targets.join('|')})(/|$)`,
  message,
})

// Folder src/api saja (alias "@/api/..." atau relatif "../api/..."), bukan "@/types/api": tipe data boleh dipakai semua tingkat
const apiFolder = (message) => ({ regex: String.raw`^(@/|(\.{1,2}/)+)api(/|$)`, message })

const dataAccess = [
  {
    regex: '^@tanstack/react-query$',
    message: 'Hanya pages/ yang mengambil data. Kirim data lewat props.',
  },
  apiFolder('Hanya pages/ yang memanggil API. Kirim data lewat props.'),
  forbid(['pages'], 'Komponen tidak boleh bergantung pada halaman.'),
]

const levelRules = LEVELS.map((level) => ({
  files: [`src/components/${level}/**/*.{ts,tsx}`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          ...(upward(level).length
            ? [
                forbid(
                  upward(level),
                  `${level} hanya boleh memakai komponen tingkat yang sama atau lebih rendah.`,
                ),
              ]
            : []),
          ...dataAccess,
        ],
      },
    ],
  },
}))

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'playwright-report', 'test-results']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strict,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    rules: {
      // Tidak ada console.log yang tertinggal (pedoman G4)
      'no-console': 'error',
      // Tidak ada HTML mentah dari data pengguna (pedoman C2)
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'Jangan render HTML mentah. Tampilkan sebagai teks atau komponen React.',
        },
        {
          selector: "CallExpression[callee.name='eval'], NewExpression[callee.name='Function']",
          message: 'eval/new Function dilarang.',
        },
      ],
    },
  },
  ...levelRules,
  {
    // Utilitas murni: tidak boleh bergantung pada komponen, halaman, atau API
    files: ['src/lib/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            forbid(['components', 'pages'], 'lib/ berisi fungsi murni saja.'),
            apiFolder('lib/ berisi fungsi murni saja.'),
          ],
        },
      ],
    },
  },
  {
    files: ['scripts/**/*.mjs', 'eslint.config.js'],
    extends: [js.configs.recommended],
    languageOptions: { ecmaVersion: 2023, globals: globals.node },
  },
  {
    files: ['*.config.ts', 'e2e/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
  prettier,
])
