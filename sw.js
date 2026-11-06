// Service Worker der Netzkarte: Karte und Leaflet offline verfügbar, beim Öffnen mit Netz immer die neueste Karte.
const CACHE = 'mastkarte-7ab5a8d6b73f';
const KERN = ['./', 'leaflet.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/apple-touch-icon.png'];
const SCHRIFT = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(KERN)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('mastkarte-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
const merke = (key, r) => { if (r && (r.ok || r.type === 'opaque') && r.type !== 'opaqueredirect') caches.open(CACHE).then(c => c.put(key, r)); };

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Seite: zuerst Netz (neue Kartendaten), offline die gespeicherte Karte
  if (req.mode === 'navigate') {
    const start = new URL('./', self.registration.scope).href;
    e.respondWith(fetch(req).then(r => { if (r.ok && r.type === 'basic') merke(start, r.clone()); return r; })
      .catch(() => caches.match(start)));
    return;
  }
  // Eigene Dateien und Schriften: aus dem Speicher, sonst Netz
  if (url.pathname.includes('/cdn-cgi/')) return;   // Anmeldung (Cloudflare Access) nie zwischenspeichern
  if (url.origin === self.location.origin || SCHRIFT.includes(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { merke(req, r.clone()); return r; })));
  }
});
