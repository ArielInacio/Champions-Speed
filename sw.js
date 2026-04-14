const CACHE_VERSION = "v1";
const APP_SHELL_CACHE = `champions-speed-shell-${CACHE_VERSION}`;
const DATA_CACHE = `champions-speed-data-${CACHE_VERSION}`;
const IMAGE_CACHE = `champions-speed-images-${CACHE_VERSION}`;

const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./default_chart_config.json",
  "./processed_pokemon.json",
  "./src/main.js",
  "./src/state.js",
  "./src/data/loadPokemon.js",
  "./src/data/loadDefaultConfig.js",
  "./src/speed/calculateFinalSpeed.js",
  "./src/chart/renderSpeedChart.js",
  "./src/sprites/resolveSpriteForConfig.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const keep = new Set([APP_SHELL_CACHE, DATA_CACHE, IMAGE_CACHE]);
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => (keep.has(key) ? Promise.resolve() : caches.delete(key))),
    )),
  );
  self.clients.claim();
});

function isImageRequest(request) {
  return request.destination === "image";
}

function isLocalDataAsset(requestUrl) {
  if (requestUrl.origin !== self.location.origin) {
    return false;
  }
  return requestUrl.pathname.endsWith(".json")
    || requestUrl.pathname.endsWith(".js")
    || requestUrl.pathname.endsWith(".css")
    || requestUrl.pathname.endsWith(".html")
    || requestUrl.pathname === "/";
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }
  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    networkPromise.catch(() => null);
    return cached;
  }

  const network = await networkPromise;
  if (network) {
    return network;
  }

  return Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(request.url);

  if (isImageRequest(request)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  if (isLocalDataAsset(requestUrl)) {
    const cacheName = requestUrl.pathname.endsWith(".json") ? DATA_CACHE : APP_SHELL_CACHE;
    event.respondWith(staleWhileRevalidate(request, cacheName));
  }
});

