// Deliberately minimal: this app is data-critical (live menu, prices,
// order status), so the service worker never caches API responses or
// dynamic pages — a stale cached menu would be actively misleading,
// worse than no menu at all. It only intercepts page navigations and
// falls back to a static "you're offline" page when the network fails.
const CACHE_NAME = "daggadex-clubos-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL)),
    );
  }
});
