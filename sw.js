/* Приложение «Свято-Пантелеимонов монастырь» (ставится прямо с сайта, без магазина приложений).
   Здесь хранится только оболочка: заставка, герб, значки. Сам сайт (Google) и снимки идут мимо — они всегда свежие.
   Без связи открывается сохранённая оболочка или страница «Нет связи с интернетом». */
const CACHE = 'filox-shell-v4';
const SITE = 'filox-site-v1';   // файлы самого сайта (/s/…): у каждого в имени отпечаток, старые удаляются сами
const KEEP = ['filox-off'];   // копии экранов архондарика и службы для работы без связи — их кладут сами приложения
const SHELL = ['/', '/app/', '/logo.webp', '/manifest.webmanifest', '/app/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png', '/apple-touch-icon.png', '/favicon-32.png', '/offline.html'];
/* страницы-оболочки: главная и приложения (/app/, /arch/, /sluzhba/, /workers/) — без связи открываются сохранённые */
const SHELL_PAGE = { '/': '/', '/index.html': '/', '/app/': '/app/', '/app/index.html': '/app/', '/arch/': '/arch/', '/arch/index.html': '/arch/',
  '/sluzhba/': '/sluzhba/', '/sluzhba/index.html': '/sluzhba/', '/workers/': '/workers/', '/workers/index.html': '/workers/' };
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== SITE && KEEP.indexOf(k) < 0).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== self.location.origin) return;
  if (r.mode === 'navigate') {
    // страница — всегда из сети (свежая); без связи — сохранённая оболочка
    e.respondWith(fetch(r).then(res => {
      const key = SHELL_PAGE[u.pathname];
      if (res.ok && key) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)); }
      return res;
    }).catch(() => (SHELL_PAGE[u.pathname] ? caches.match(SHELL_PAGE[u.pathname]) : Promise.resolve(null))
      .then(m => m || caches.match('/offline.html'))));
    return;
  }
  if (u.pathname.indexOf('/s/') === 0) {
    /* части сайта: раз скачанный файл больше не меняется — сразу из памяти, без сети */
    e.respondWith(caches.open(SITE).then(c => c.match(r).then(m => m || fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }))));
    return;
  }
  if (SHELL.indexOf(u.pathname) < 0) return;
  e.respondWith(caches.match(r).then(m => m || fetch(r)));
});
