/// <reference lib="webworker" />
// Service worker (vite-plugin-pwa injectManifest). Precaches the app shell (JS, CSS, food photos,
// icons) so the installed demo opens offline. All data lives in the browser (src/demo), so there is
// nothing else to cache.
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute, type PrecacheEntry } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { clientsClaim } from 'workbox-core'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: (string | PrecacheEntry)[] }

void self.skipWaiting()
clientsClaim()

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// SPA: every navigation gets the cached index.html.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))
