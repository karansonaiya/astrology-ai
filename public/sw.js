/**
 * Prerna AI service worker.
 *
 * Caching policy (deliberately conservative):
 *  - Static, non-sensitive assets (icons, manifest, the offline page, Next's
 *    hashed static build files) are cached with a cache-first strategy.
 *  - Page navigations use network-first with an offline fallback page.
 *  - Everything under /api/, /auth, and any chat/payment/report/admin route
 *    is NEVER cached — those responses always hit the network, and API
 *    requests are passed through untouched so auth cookies and payment
 *    flows behave normally. This is intentional: private chat messages,
 *    payment pages, birth details, and auth responses must never live in a
 *    shared browser cache.
 */

const CACHE_NAME = "prerna-static-v1";
const OFFLINE_URL = "/offline.html";

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

const NEVER_CACHE_PATTERNS = [
  /^\/api\//,
  /^\/auth/,
  /^\/chat/,
  /^\/payments/,
  /^\/credits/,
  /^\/reports/,
  /^\/admin/,
  /^\/settings/,
  /^\/profile/,
  /^\/onboarding/,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isNeverCache(pathname) {
  return NEVER_CACHE_PATTERNS.some((re) => re.test(pathname));
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== "GET") return;
  if (isNeverCache(url.pathname)) return; // let it hit the network untouched

  // Page navigations: network-first, offline fallback.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Static assets: cache-first.
  if (url.pathname.startsWith("/icons/") || url.pathname.startsWith("/_next/static/") || url.pathname === "/manifest.webmanifest") {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((res) => {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            return res;
          })
      )
    );
  }
});
