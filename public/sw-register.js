// Service Worker registration — externalisé de layout.tsx pour permettre
// une CSP stricte sans 'unsafe-inline' sur script-src.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function () {
      /* silencieux — enregistrement SW non critique */
    });
  });
}
