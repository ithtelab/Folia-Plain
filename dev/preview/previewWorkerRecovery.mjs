// A dev-only handoff for browsers still controlled by a production PWA at the same origin.
export const PREVIEW_WORKER_RECOVERY_SCRIPT = `// Folia development preview worker recovery
importScripts('/folia-cover-sw.js');
self.addEventListener('install', event => {
    event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        await self.clients.claim();
        const windows = await self.clients.matchAll({ type: 'window' });
        for (const client of windows) {
            const url = new URL(client.url);
            if (url.origin !== self.location.origin || !['/', '/index.html'].includes(url.pathname)) continue;
            // No app data or caches are deleted. Re-enter via the network; the normal dev worker
            // will take over after the current HTML loads its registration script.
            // Do not await navigation inside activation: its fetch may itself wait for activation.
            void client.navigate(client.url).catch(() => {});
        }
    })());
});
`;

/** @returns {import('vite').Plugin} */
export function previewWorkerRecoveryPlugin() {
    return {
        name: 'folia-preview-worker-recovery',
        apply: 'serve',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
                if (pathname !== '/sw.js' || !['GET', 'HEAD'].includes(req.method ?? 'GET')) {
                    next();
                    return;
                }
                // An old installed PWA rechecks /sw.js even while it serves its cached HTML.
                // Vite's SPA fallback otherwise responds with HTML, so that update never succeeds.
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
                res.setHeader('Cache-Control', 'no-store');
                res.setHeader('Service-Worker-Allowed', '/');
                res.end(req.method === 'HEAD' ? undefined : PREVIEW_WORKER_RECOVERY_SCRIPT);
            });
        },
    };
}
