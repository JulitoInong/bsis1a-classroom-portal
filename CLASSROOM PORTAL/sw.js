const CACHE_NAME = "bsis-1a-shell-v11";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./login/index.html",
  "./home/index.html",
  "./schedule/index.html",
  "./class-directory/index.html",
  "./class-officers/index.html",
  "./profile/index.html",
  "./registrar/index.html",
  "./style.css",
  "./home/home.css",
  "./home/home.js",
  "./schedule/schedule.css",
  "./schedule/schedule.js",
  "./class-directory/class-directory.css",
  "./class-directory/class-directory.js",
  "./class-officers/class-officers.css",
  "./class-officers/class-officers.js",
  "./profile/profile.css",
  "./profile/profile.js",
  "./login/login.css",
  "./login/login.js",
  "./registrar/registrar.js",
  "./shared/auth.js",
  "./shared/admin-recognition.js",
  "./shared/portal-polish.css",
  "./shared/portal-redesign.css",
  "./shared/student-data.js",
  "./attendance/attendance-supabase.js",
  "./attendance/attendance-history.js",
  "./grades/grades-auth.js",
  "./shared/pwa.js",
  "./assets/bsis-1a-logo.png",
  "./assets/bsis-1a-icon-192.png",
  "./assets/bsis-1a-icon-512.png",
  "./manifest.webmanifest"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS.map(path => new URL(path, self.registration.scope).href)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);

  // Do not interfere with Supabase, Google, CDN, or other external requests.
  if (url.origin !== scope.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match(new URL("./home/index.html", scope).href)))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok && url.origin === scope.origin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
