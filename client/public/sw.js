// Vozila.hr service worker — minimal offline shell.
// Strategy:
//   • Static assets (/, /index.html, /assets/*, fonts, logo): stale-while-revalidate
//   • Listing images (/img/*, supabase storage): cache-first with 30-day max
//   • Everything else (API, auth, edge fns): network-only.
// Bumps RUNTIME_VERSION on every release via Vite define so old caches expire.

const RUNTIME_VERSION = 'v1';
const SHELL_CACHE = `vozila-shell-${RUNTIME_VERSION}`;
const IMG_CACHE = `vozila-img-${RUNTIME_VERSION}`;
// S11: cacheable third-party image hosts. Add new hosts here when we
// onboard a CDN; SW won't blindly cache strangers.
const IMG_HOSTS = ['images.unsplash.com', 'flagcdn.com'];
const SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/vozilahrlogo.svg',
  '/vozilahrlogo-light.svg',
  '/vozilahrlogo-dark.svg',
  '/vozilahrfavicon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.endsWith(RUNTIME_VERSION))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Never intercept Supabase API / auth / edge fn
  if (url.hostname.endsWith('supabase.co')) return;
  // Never intercept the dev server HMR
  if (url.pathname.startsWith('/@vite/')) return;

  // Listing images — cache-first (local /img + parameterized 3rd-party hosts)
  if (url.pathname.startsWith('/img/') || IMG_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheFirst(req, IMG_CACHE));
    return;
  }

  // Shell + JS/CSS bundles — stale-while-revalidate
  if (
    url.pathname === '/' ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/js/') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.webmanifest')
  ) {
    event.respondWith(staleWhileRevalidate(req, SHELL_CACHE));
    return;
  }
  // default: network only
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res && res.status === 200) cache.put(req, res.clone());
    return res;
  } catch (e) {
    return new Response('', { status: 504 });
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const fetched = fetch(req).then((res) => {
    if (res && res.status === 200) cache.put(req, res.clone());
    return res;
  }).catch(() => hit);
  return hit || fetched;
}
