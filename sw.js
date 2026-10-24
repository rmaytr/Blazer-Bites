// Retires the old app service worker. Before the app moved under /app/, it was served from / and
// registered /sw.js with scope /, answering every navigation on the site (including /) with its
// cached app index.html. Browsers that visited back then keep that worker until /sw.js changes,
// so this file replaces it: it deletes the old worker's caches, unregisters itself and reloads
// any open pages so they load the choice page from the network. The app's own worker lives at
// /app/sw.js with scope /app/ and is left alone.
self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const scope = self.registration.scope
    const keys = await caches.keys()
    // Workbox names its caches after the registration scope, e.g. workbox-precache-v2-https://host/
    await Promise.all(keys.filter((k) => k.endsWith(scope)).map((k) => caches.delete(k)))
    await self.registration.unregister()
    const windows = await self.clients.matchAll({ type: 'window' })
    windows.forEach((client) => client.navigate(client.url))
  })())
})
