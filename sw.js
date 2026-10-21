// Offline cache: serve from cache first, refresh in the background.
const CACHE = "kartochki-v1";
const ASSETS = [
  "./", "index.html", "tokens.css", "app.css", "app.js", "data.js", "manifest.webmanifest",
  "icons/icon.svg", "icons/apple-touch-icon.png", "icons/icon-512.png",
  "fonts/unbounded-cyr.woff2", "fonts/unbounded-lat.woff2",
  "fonts/golos-cyr.woff2", "fonts/golos-lat.woff2",
  "fonts/jbmono-cyr.woff2", "fonts/jbmono-lat.woff2"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(e.request, { ignoreSearch: true });
      const fresh = fetch(e.request)
        .then((res) => { if (res.ok) cache.put(e.request, res.clone()); return res; })
        .catch(() => hit);
      return hit || fresh;
    })
  );
});
