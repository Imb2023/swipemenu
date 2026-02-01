const CACHE = "instant-menu-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json",
  "./logo.png",
  "./icon-196.png",
  "./android-chrome-512x512.png",
  "./favicon.ico",
  "./1.png",
  "./2.png",
  "./3.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.map((k) => (k === CACHE ? null : caches.delete(k))))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Network-first for the Sheet API so specials update fast:
  if (req.url.includes("script.google.com") || req.url.includes("googleusercontent.com")) {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  // Stale-While-Revalidate for everything else:
  event.respondWith(
    caches.match(req).then((cached) => {
      const networked = fetch(req)
        .then((res) => {
          const cacheCopy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, cacheCopy));
          return res;
        })
        .catch(() => cached);
      return cached || networked;
    })
  );
});