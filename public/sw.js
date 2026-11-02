/*
 * FOOTBALL DNA Service Worker
 * - ゲスト診断に必要なページと静的ファイルだけをキャッシュし、オフラインでも診断を続けられるようにする。
 * - ログインが必要なページ（マイページ・チーム・設定など）や共有ページ、Supabase への通信はキャッシュしない。
 */
const VERSION = "fdna-v1";
const PAGE_CACHE = `${VERSION}-pages`;
const STATIC_CACHE = `${VERSION}-static`;
const OFFLINE_URL = "/offline";
// オフラインでも開けるページ（個人データを含まない、ゲスト向けのページだけ）
const PUBLIC_PAGES = ["/", "/diagnosis/profile", "/diagnosis/questions", "/about", OFFLINE_URL];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGE_CACHE)
      .then((cache) => cache.addAll(PUBLIC_PAGES))
      .catch(() => undefined),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

function isPublicPage(url) {
  return PUBLIC_PAGES.includes(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase など外部への通信は触らない

  // ビルド済みの静的ファイル（ファイル名にハッシュが入っていて内容が変わらない）
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  // ページの表示: まずネットワーク。つながらないときは公開ページのキャッシュ、なければオフライン画面
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          if (res.ok && isPublicPage(url) && !url.search) {
            const cache = await caches.open(PAGE_CACHE);
            cache.put(url.pathname, res.clone());
          }
          return res;
        } catch {
          const cache = await caches.open(PAGE_CACHE);
          return (isPublicPage(url) && (await cache.match(url.pathname))) || (await cache.match(OFFLINE_URL)) || Response.error();
        }
      })(),
    );
  }
});
