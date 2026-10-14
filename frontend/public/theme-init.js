// Memasang tema sebelum React dimuat, supaya halaman tidak berkedip terang → gelap.
// Berupa file terpisah (bukan skrip inline) supaya Content-Security-Policy tetap ketat.
;(function () {
  var theme = null
  try {
    theme = localStorage.getItem('ariadne.theme')
  } catch (e) {
    theme = null
  }
  if (theme !== 'light' && theme !== 'dark') {
    theme =
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
  }
  document.documentElement.setAttribute('data-theme', theme)
})()
