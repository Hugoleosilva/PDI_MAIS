// Service worker minimo do PDI+ — so cacheia ASSET ESTATICO (JS/CSS/fontes
// geradas pelo build, em /_next/static/...), nunca HTML nem /api/*. O PDI do
// usuario muda o tempo todo; cachear a pagina ou uma resposta de API criaria
// risco real de mostrar dado desatualizado. O objetivo aqui e só deixar o
// app instalavel e os assets (que tem hash no nome) carregarem mais rapido
// numa proxima visita — nao funcionar 100% offline.
const CACHE = "pdi-mais-static-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isStaticAsset = url.pathname.startsWith("/_next/static/");
  if (!isStaticAsset) return; // deixa passar direto pra rede (sem cache)

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    }),
  );
});
