/* Приложение «Свято-Пантелеимонов монастырь» (ставится прямо с сайта, без магазина приложений).
   Здесь хранится только оболочка: заставка, герб, значки. Сам сайт (Google) и снимки идут мимо — они всегда свежие.
   Без связи открывается сохранённая оболочка или страница «Нет связи с интернетом». */
const CACHE = 'filox-shell-v1';
const SHELL = ['/', '/logo.webp', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png', '/apple-touch-icon.png', '/favicon-32.png', '/offline.html'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== self.location.origin) return;
  if (r.mode === 'navigate') {
    // страница — всегда из сети (свежая); без связи — сохранённая оболочка
    e.respondWith(fetch(r).then(res => {
      if (res.ok && (u.pathname === '/' || u.pathname === '/index.html')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put('/', copy)); }
      return res;
    }).catch(() => (u.pathname === '/' || u.pathname === '/index.html' ? caches.match('/') : Promise.resolve(null))
      .then(m => m || caches.match('/offline.html'))));
    return;
  }
  if (SHELL.indexOf(u.pathname) < 0) return;
  e.respondWith(caches.match(r).then(m => m || fetch(r)));
});
