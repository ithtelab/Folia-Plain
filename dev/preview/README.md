# Recovering a cached production preview

A browser that previously loaded a production PWA at the dev origin may keep serving its old
precache shell. Adding `?v=...` does not bypass a service worker's navigation fallback. The installed
worker checks `/sw.js`, but an ordinary Vite SPA server returns HTML there, so its update fails.

`previewWorkerRecoveryPlugin` participates only in `vite serve`. It answers that legacy script
URL with uncached JavaScript, claims its windows and navigates main app tabs through the network.
It must not await those navigations inside activation: their fetch can wait for activation itself.
The freshly loaded app can then register the usual dev worker. Its existing local-cover handler is
also imported during the handoff. No registration, cache, localStorage or IndexedDB data is deleted.

Production builds and their workers do not include this middleware. The unit checks cover routing,
headers, activation sequencing and limiting reloads to same-origin app windows. Browser validation
must allow service workers and start with a previously installed caching worker; a fresh context
with `serviceWorkers: 'block'` cannot exercise this failure.
