/* Service worker for the "Flextext Researcher" PWA. Precaches its own thin shell PLUS
 * the shared engine it loads from the Flextext Editor repo (same origin), so the
 * researcher console works fully offline.
 *
 * VERSION COUPLING — IMPORTANT: this SW caches byte copies of the editor engine
 * (/flextext-editor/js/*.js, css/app.css). Those files have their own lifecycle
 * in the editor repo. Bump VERSION here whenever you deploy — AND specifically
 * whenever the editor engine changes in a way this app should pick up — or
 * installed copies keep serving a stale cached engine offline. Keep the SHELL
 * engine list IDENTICAL to the editor's sw.js (app.js resolves its whole static
 * import graph at load, even though the panel uses only part of it). */

const VERSION = 'v3';
const CACHE = 'flextext-researcher-' + VERSION;
const SHELL = [
  './',
  'index.html',
  'researcher.webmanifest',
  'icons/researcher.svg',
  'icons/researcher-192.png',
  'icons/researcher-512.png',
  'icons/researcher-apple-touch.png',
  // Shared engine + styles, served from the editor repo (same origin).
  '/flextext-editor/css/app.css',
  '/flextext-editor/js/app.js',
  '/flextext-editor/js/flextext.js',
  '/flextext-editor/js/db.js',
  '/flextext-editor/js/i18n.js',
  '/flextext-editor/js/audio.js',
  '/flextext-editor/js/convert.js',
  '/flextext-editor/js/zip.js',
  '/flextext-editor/js/upload.js',
  '/flextext-editor/js/record-pcm.js',
  '/flextext-editor/js/audio-capture-worklet.js',
  '/flextext-editor/js/flac.js',
  // app.js STATICALLY imports the connectivity engine (top-level imports), so the
  // browser resolves these at module-load — precache them or an updated app that
  // goes offline mid-load throws on the missing imports.
  '/flextext-editor/js/crypto.js',
  '/flextext-editor/js/sync.js',
  '/flextext-editor/js/researcher.js',
  '/flextext-editor/js/researcher-panel.js',
  '/flextext-editor/js/vendor/wavesurfer.esm.js',
  '/flextext-editor/js/vendor/lame.min.js',
  '/flextext-editor/js/vendor/libflac.min.wasm.js',
  '/flextext-editor/js/vendor/libflac.min.wasm.wasm',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
});

function cleanupOldCaches() {
  return caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))));
}

self.addEventListener('message', (e) => {
  if (!e.data) return;
  if (e.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data.type === 'CLEANUP') e.waitUntil(cleanupOldCaches());
});

self.addEventListener('activate', (e) => {
  e.waitUntil(cleanupOldCaches().then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: e.request.mode === 'navigate' }).then(hit => {
      if (hit) return hit;
      if (e.request.mode === 'navigate') {
        return caches.match('index.html').then(shell => shell || fetch(e.request));
      }
      return fetch(e.request).then(resp => {
        if (resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return resp;
      });
    })
  );
});
