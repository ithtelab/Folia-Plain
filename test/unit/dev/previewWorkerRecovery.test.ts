import { describe, expect, it, vi } from 'vitest';
import { runInNewContext } from 'node:vm';
import { previewWorkerRecoveryPlugin, PREVIEW_WORKER_RECOVERY_SCRIPT } from '../../../dev/preview/previewWorkerRecovery.mjs';

// Protect the dev-only escape from a cached production shell without clearing user storage.
type Handler = (req: { url: string; method: string }, res: { statusCode: number; setHeader: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> }, next: ReturnType<typeof vi.fn>) => void;
type LifecycleListener = (event: { waitUntil: (value: Promise<unknown>) => void }) => void;

function middleware(): Handler {
    let handler: Handler;
    const plugin = previewWorkerRecoveryPlugin();
    const setup = plugin.configureServer as (server: unknown) => void;
    setup({ middlewares: { use(value: Handler) { handler = value; } } });
    return handler!;
}

describe('preview worker recovery', () => {
    it('only participates in the development server', () => {
        expect(previewWorkerRecoveryPlugin().apply).toBe('serve');
    });

    it.each(['GET', 'HEAD'])('serves the legacy worker as uncached JavaScript for %s', method => {
        const res = { statusCode: 0, setHeader: vi.fn(), end: vi.fn() };
        const next = vi.fn();
        middleware()({ url: '/sw.js?previous-version=1', method }, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(200);
        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/javascript; charset=utf-8');
        expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
        expect(res.end).toHaveBeenCalledWith(method === 'HEAD' ? undefined : PREVIEW_WORKER_RECOVERY_SCRIPT);
    });

    it.each(['/index.html', '/dev-sw.js', '/api/example'])('leaves %s to its existing handler', url => {
        const res = { statusCode: 0, setHeader: vi.fn(), end: vi.fn() };
        const next = vi.fn();
        middleware()({ url, method: 'GET' }, res, next);
        expect(next).toHaveBeenCalledOnce();
        expect(res.end).not.toHaveBeenCalled();
    });

    it('hands cached main windows to the network and keeps unrelated tabs and data intact', async () => {
        const listeners = new Map<string, LifecycleListener>();
        // A navigation cannot complete until activation finishes; waiting on it deadlocks recovery.
        const main = { url: 'http://localhost:4173/?v=old', navigate: vi.fn(() => new Promise(() => {})) };
        const unrelated = { url: 'http://localhost:4173/.codex-tmp/design.html', navigate: vi.fn() };
        const otherOrigin = { url: 'http://localhost:9000/', navigate: vi.fn() };
        const claim = vi.fn(async () => {});
        const skipWaiting = vi.fn(async () => {});
        const importScripts = vi.fn();
        const caches = { delete: vi.fn(), keys: vi.fn() };
        runInNewContext(PREVIEW_WORKER_RECOVERY_SCRIPT, {
            URL, Promise, importScripts, caches,
            self: {
                location: { origin: 'http://localhost:4173' }, skipWaiting,
                addEventListener: (name: string, listener: LifecycleListener) => listeners.set(name, listener),
                clients: { claim, matchAll: async () => [main, unrelated, otherOrigin] },
            },
        });
        let pending = Promise.resolve() as Promise<unknown>;
        const event = { waitUntil: (promise: Promise<unknown>) => { pending = promise; } };
        listeners.get('install')!(event);
        await pending;
        expect(skipWaiting).toHaveBeenCalledOnce();
        listeners.get('activate')!(event);
        await pending;
        expect(claim).toHaveBeenCalledOnce();
        expect(main.navigate).toHaveBeenCalledWith(main.url);
        expect(unrelated.navigate).not.toHaveBeenCalled();
        expect(otherOrigin.navigate).not.toHaveBeenCalled();
        expect(caches.delete).not.toHaveBeenCalled();
        expect(importScripts).toHaveBeenCalledWith('/folia-cover-sw.js');
    });
});
