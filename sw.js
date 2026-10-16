const CACHE = "instant-menu-v5";
const ASSETS = ["./", "./index.html", "./app.js", "./register-sw.js", "./styles.css", "./manifest.json",
  "./logo.png", "./icon-196.png", "./android-chrome-512x512.png", "./favicon.ico", "./1.png", "./2.png", "./3.png"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith('instant-menu-') && key !== CACHE)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const req = event.request;
  // The app handles saved Sheet data. Never intercept other origins or writes.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(req);
      // Storage can be full or unavailable; a cache failure must not lose a live response.
      if (response.ok) { try { await cache.put(req, response.clone()); } catch {} }
      return response;
    } catch {
      return await cache.match(req) || Response.error();
    }
  })());
});
