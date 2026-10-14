/**
 * Kedalaman maksimal proyek: proyek (0), sub-proyek (1), sub-sub-proyek (2) = 3 level.
 * Hanya untuk menyembunyikan tombol "Tambah sub-proyek"; server yang menegakkan batasnya
 * (Project.MaxDepth di backend) dan database punya batasan CHECK sendiri.
 */
export const MAX_PROJECT_DEPTH = 2
