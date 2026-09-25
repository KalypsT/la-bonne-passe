// Service worker simple : réseau d'abord, cache en secours pour jouer hors ligne.
// Changer CACHE à chaque évolution de cette stratégie.
const CACHE = 'la-bonne-passe-v1';
const BASE = new URL('./', self.location).pathname;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([BASE, `${BASE}manifest.webmanifest`, `${BASE}icon.svg`])),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const requete = event.request;
  if (requete.method !== 'GET') return;
  const url = new URL(requete.url);
  const memeOrigine = url.origin === self.location.origin;
  const polices = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!memeOrigine && !polices) return;

  event.respondWith(
    fetch(requete)
      .then((reponse) => {
        if (reponse.ok || reponse.type === 'opaque') {
          const copie = reponse.clone();
          caches.open(CACHE).then((cache) => cache.put(requete, copie));
        }
        return reponse;
      })
      .catch(() =>
        caches
          .match(requete)
          .then((enCache) => enCache || (requete.mode === 'navigate' ? caches.match(BASE) : undefined))
          .then((r) => r || Response.error()),
      ),
  );
});
