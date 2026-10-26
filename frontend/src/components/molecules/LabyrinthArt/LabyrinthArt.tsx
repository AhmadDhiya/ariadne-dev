import './LabyrinthArt.css'

/**
 * Ilustrasi labirin dengan benang merah untuk panel kiri halaman masuk (mockup 01).
 * Dinding labirin memakai primary-soft samar; satu-satunya warna merah adalah benangnya.
 */
export function LabyrinthArt() {
  return (
    <svg
      className="ar-labyrinth"
      viewBox="0 0 640 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <path className="ar-labyrinth-wall" d="M394.9 399.2A40 40 0 1 1 394.9 380.8" />
      <path className="ar-labyrinth-wall" d="M275.4 402.1A80 80 0 1 0 275.4 377.9" />
      <path className="ar-labyrinth-wall" d="M474.4 405.9A120 120 0 1 1 474.4 374.1" />
      <path className="ar-labyrinth-wall" d="M195.9 408.8A160 160 0 1 0 195.9 371.2" />
      <path className="ar-labyrinth-wall" d="M554.1 412.6A200 200 0 1 1 554.1 367.4" />
      <path
        className="ar-labyrinth-thread"
        d="M355 390H415A60 60 0 0 0 295 390H255A100 100 0 0 0 455 390H495A140 140 0 0 0 215 390H175A180 180 0 0 0 535 390H660"
      />
      <circle className="ar-labyrinth-knot" cx="355" cy="390" r="8" />
    </svg>
  )
}
