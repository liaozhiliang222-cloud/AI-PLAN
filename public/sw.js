/* AI Plan Radar Service Worker：App Shell 缓存 + 页面网络优先 + 静态资源缓存优先 */
const VERSION = "v1";
const SHELL_CACHE = `apr-shell-${VERSION}`;
const PAGE_CACHE = `apr-pages-${VERSION}`;
const ASSET_CACHE = `apr-assets-${VERSION}`;
const SHELL = ["/", "/plans", "/models", "/recommend", "/changes", "/offline", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(`apr-${VERSION}`)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 静态资源：缓存优先
  if (url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icons")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const clone = res.clone();
            caches.open(ASSET_CACHE).then((c) => c.put(req, clone));
            return res;
          }),
      ),
    );
    return;
  }

  // 页面导航：网络优先，失败回退缓存 → 离线页
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(PAGE_CACHE).then((c) => c.put(req, clone));
          try {
            localStorage.setItem("apr:last-updated", String(Date.now()));
          } catch {}
          return res;
        })
        .catch(async () => {
          const hit = await caches.match(req);
          if (hit) return hit;
          const shellHit = await caches.match(url.pathname === "/" ? "/" : "/offline");
          return (
            shellHit ||
            new Response("<h1>离线</h1>", { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 })
          );
        }),
    );
  }
});
