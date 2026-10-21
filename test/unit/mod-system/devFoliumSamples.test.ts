// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type {
    FoliumAccountState,
    FoliumClientApi,
    FoliumCommandDef,
    FoliumEventMap,
    FoliumHomeTabDef,
    FoliumLoopMode,
    FoliumPanelContext,
    FoliumPlaybackService,
    FoliumPlatformResponse,
    FoliumQueueSnapshot,
    FoliumSettingsSectionDef,
    FoliumSong,
} from '@/mods/folium/contract';

// test/unit/mod-system/devFoliumSamples.test.ts
// The demonstration mods under dev/folium/ (every directory there holding a mod.json) are Folium 1
// mods like the signed samples in mods/: the manifest validates, the declared entries exist, and the
// client uses the literal `export default function activate(folium)` form authors copy. Unlike
// mods/ they are unsigned (installed by hand, never scanned by the loader), so no signature check.
// sample-playback-console also runs here: its main entry against the real api.storage.paths
// (append, cache, rebuild after the cache is emptied) and its client against a stand-in folium.
// So does sample-account-console (Folium 1.7): its main entry against the real api with a stand-in
// secret store, its client against a stand-in folium with secrets, rpc.on, account and platform.raw.

const require = createRequire(import.meta.url);
const { validateManifest } = require('../../../electron/modSystem/manifest.cjs');
const { createModApi, createModDataStore } = require('../../../electron/modSystem/modApi.cjs');
const { clearDirectoryContents, resolveModStorageDirs } = require('../../../electron/modSystem/modFiles.cjs');

const DEV_FOLIUM_DIR = path.resolve(__dirname, '../../../dev/folium');
const PLAYBACK_CONSOLE_DIR = path.join(DEV_FOLIUM_DIR, 'sample-playback-console');
const sampleDirectories = fs.readdirSync(DEV_FOLIUM_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(DEV_FOLIUM_DIR, entry.name, 'mod.json')))
    .map((entry) => path.join(DEV_FOLIUM_DIR, entry.name));
const samples = sampleDirectories.map((directory) => [path.basename(directory), directory]);

const temporaryDirectories: string[] = [];
afterEach(() => {
    while (temporaryDirectories.length > 0) {
        fs.rmSync(temporaryDirectories.pop()!, { recursive: true, force: true });
    }
    document.body.replaceChildren();
});

describe('dev/folium sample mods', () => {
    it('has the samples the docs point to', () => {
        expect(samples.map(([name]) => name)).toEqual(expect.arrayContaining(['sample-home-tab', 'sample-playback-console', 'sample-account-console']));
    });

    it.each(samples)('%s is a valid Folium 1 mod', (_name, directory) => {
        const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'mod.json'), 'utf8'));
        const result = validateManifest(manifest);
        expect(result.ok ? [] : result.errors).toEqual([]);
        if (!result.ok) return;
        if (result.value.main) expect(fs.existsSync(path.join(directory, result.value.main))).toBe(true);
        if (result.value.client) {
            const clientPath = path.join(directory, result.value.client);
            expect(fs.existsSync(clientPath)).toBe(true);
            expect(fs.readFileSync(clientPath, 'utf8')).toMatch(/export default function activate\(folium\)/);
        }
    });

    it.each(samples)('%s ships unsigned, as the docs say', (_name, directory) => {
        expect(fs.existsSync(path.join(directory, 'folium.sig.json'))).toBe(false);
    });
});

/* The main entry, activated against the real mod api with its own userData under the temp directory. */
const activatePlaybackConsoleMain = () => {
    const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'folia-dev-sample-'));
    temporaryDirectories.push(userData);
    // As the loader hands it over: validated, its permission ids as Folium 1.6 names them.
    const { value: manifest } = validateManifest(JSON.parse(fs.readFileSync(path.join(PLAYBACK_CONSOLE_DIR, 'mod.json'), 'utf8')));
    const dirs = resolveModStorageDirs(userData, manifest.id);
    const handlers = new Map<string, (...args: unknown[]) => Promise<unknown>>();
    const api = createModApi({
        modId: manifest.id,
        manifest,
        dataStore: createModDataStore(dirs.dataDir),
        filesDir: dirs.filesDir,
        cacheDir: dirs.cacheDir,
        hostInfo: { folium: { major: 1, minor: 5 }, folia: '0.7.20' },
        emitLog: () => {},
        getPlaybackSnapshot: () => null,
        registerDisposer: () => {},
        registerRpc: (name: string, handler: (...args: unknown[]) => Promise<unknown>) => handlers.set(name, handler),
        requestExport: () => Promise.reject(new Error('unused')),
    });
    const activate = require(path.join(PLAYBACK_CONSOLE_DIR, 'index.cjs'));
    activate(api);
    const call = (name: string, ...args: unknown[]) => handlers.get(name)!(...args);
    return { dirs, call, handlers };
};

const failureRecord = (id: string, title: string) => ({
    id,
    at: 1_760_000_000_000,
    song: { title, artist: 'Artist', source: 'netease' },
    reason: 'restricted',
    phase: 'play',
    willAutoSkip: true,
});

describe('sample-playback-console main entry', () => {
    it('appends failures to the data log and lists them newest first from the cache', async () => {
        const { dirs, call, handlers } = activatePlaybackConsoleMain();
        expect([...handlers.keys()].sort()).toEqual(['recentFailures', 'recordFailure']);

        await call('recordFailure', failureRecord('a', 'First'));
        await call('recordFailure', failureRecord('b', 'Second'));

        const log = fs.readFileSync(path.join(dirs.filesDir, 'failures.log'), 'utf8').trim().split('\n');
        expect(log.map((line) => JSON.parse(line).id)).toEqual(['a', 'b']);
        expect(fs.existsSync(path.join(dirs.cacheDir, 'recent-failures.json'))).toBe(true);
        expect((await call('recentFailures') as Array<{ id: string }>).map((item) => item.id)).toEqual(['b', 'a']);
    });

    it('rebuilds the cache from the log after the mods panel empties it', async () => {
        const { dirs, call } = activatePlaybackConsoleMain();
        await call('recordFailure', failureRecord('a', 'First'));
        await call('recordFailure', failureRecord('b', 'Second'));

        await clearDirectoryContents(dirs.cacheDir);
        expect(fs.readdirSync(dirs.cacheDir)).toEqual([]);

        expect((await call('recentFailures') as Array<{ id: string }>).map((item) => item.id)).toEqual(['b', 'a']);
        expect(fs.existsSync(path.join(dirs.cacheDir, 'recent-failures.json'))).toBe(true);
        // A record after the rebuild is not listed twice.
        await clearDirectoryContents(dirs.cacheDir);
        await call('recordFailure', failureRecord('c', 'Third'));
        expect((await call('recentFailures') as Array<{ id: string }>).map((item) => item.id)).toEqual(['c', 'b', 'a']);
    });

    it('keeps only the fields it knows from what the renderer sends', async () => {
        const { call } = activatePlaybackConsoleMain();
        await call('recordFailure', { id: 'x', reason: 'bogus', phase: 'later', song: { title: 5, artist: 'A', ref: 'r' }, extra: 'drop me' });
        expect(await call('recentFailures')).toEqual([expect.objectContaining({
            id: 'x',
            reason: 'unknown',
            phase: 'play',
            willAutoSkip: false,
            song: { title: '', artist: 'A', source: null },
        })]);
    });
});

/*
 * A stand-in for the parts of folium the client uses. The playback half follows the contract's
 * types, and getQueue pages the way the host does (centred on the current song without an offset).
 */
const createFakeFolium = (context: 'main' | 'export' = 'main') => {
    const handlers = new Map<string, Array<{ handler: (event: unknown) => void; rank: number }>>();
    const homeTabs: FoliumHomeTabDef[] = [];
    const commands: FoliumCommandDef[] = [];
    const rpcCalls: Array<{ name: string; args: unknown[] }> = [];
    const queue: FoliumSong[] = Array.from({ length: 120 }, (_, index) => ({
        id: String(index), title: `Song ${index}`, artist: 'Artist', album: null, source: 'local', ref: `ref-${index}`,
    }));
    const state = { volume: 0.5, muted: false, loopMode: 'off' as FoliumLoopMode, currentIndex: 70 };
    const RANK: Record<string, number> = { highest: 0, high: 1, normal: 2, low: 3, lowest: 4 };

    const emit = <K extends keyof FoliumEventMap>(type: K, payload: FoliumEventMap[K]) => {
        (handlers.get(type) ?? []).forEach(({ handler }) => handler(Object.freeze({ ...payload })));
    };
    const playback: Pick<FoliumPlaybackService, 'getVolume' | 'setVolume' | 'setMuted' | 'getLoopMode' | 'setLoopMode' | 'getQueue' | 'playQueueItem'> = {
        getVolume: () => ({ volume: state.volume, muted: state.muted }),
        setVolume: vi.fn((volume: number) => {
            state.volume = volume;
            emit('playback.volumeChanged', { volume: state.volume, muted: state.muted });
        }),
        setMuted: vi.fn((muted: boolean) => {
            state.muted = muted;
            emit('playback.volumeChanged', { volume: state.volume, muted: state.muted });
        }),
        getLoopMode: () => state.loopMode,
        setLoopMode: vi.fn((mode: FoliumLoopMode) => {
            state.loopMode = mode;
            emit('playback.loopModeChanged', { mode });
        }),
        getQueue: (options = {}): FoliumQueueSnapshot => {
            const limit = options.limit ?? 500;
            const start = options.offset === undefined
                ? Math.min(Math.max(0, state.currentIndex - Math.floor(limit / 2)), Math.max(0, queue.length - limit))
                : Math.min(Math.max(0, options.offset), queue.length);
            return {
                items: queue.slice(start, start + limit).map((song, position) => ({ song, index: start + position })),
                length: queue.length,
                currentIndex: state.currentIndex,
                kind: 'queue',
            };
        },
        playQueueItem: vi.fn(async (index: number, expectedRef?: string) => queue[index]?.ref === expectedRef),
    };
    const folium = {
        modId: 'sample-playback-console',
        host: { folium: { major: 1, minor: 5 }, folia: '0.7.20' },
        env: { context },
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
        registries: {
            homeTabs: { register: (def: FoliumHomeTabDef) => { homeTabs.push(def); return { id: `sample-playback-console:${def.id}`, unregister: () => {} }; } },
            commands: { register: (def: FoliumCommandDef) => { commands.push(def); return { id: `sample-playback-console:${def.id}`, unregister: () => {} }; } },
        },
        events: {
            on: (type: string, handler: (event: unknown) => void, options?: { priority?: string }) => {
                const registration = { handler, rank: RANK[options?.priority ?? 'normal'] };
                handlers.set(type, [...(handlers.get(type) ?? []), registration].sort((left, right) => left.rank - right.rank));
                return () => handlers.set(type, (handlers.get(type) ?? []).filter((entry) => entry !== registration));
            },
        },
        playback,
        ui: { openHomeTab: vi.fn() },
        rpc: {
            call: async (name: string, ...args: unknown[]) => {
                rpcCalls.push({ name, args });
                return name === 'recentFailures' ? [{ ...failureRecord('old', 'Earlier'), at: 1 }] : { logged: true };
            },
        },
    } as unknown as FoliumClientApi;
    return { folium, homeTabs, commands, rpcCalls, emit, playback, state, handlerCount: () => [...handlers.values()].reduce((sum, list) => sum + list.length, 0) };
};

// The sample is written for Folium 1.5, which named onChange `subscribe`; the host hands it both.
const panelContext = (locale: string): FoliumPanelContext => ({
    locale,
    getTheme: () => { throw new Error('unused'); },
    onChange: () => () => {},
    subscribe: () => () => {},
}) as unknown as FoliumPanelContext;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('sample-playback-console client', () => {
    const loadClient = async () => (await import('../../../dev/folium/sample-playback-console/client.mjs')).default as (folium: FoliumClientApi) => (() => void) | undefined;

    it('registers nothing in the export window', async () => {
        const activate = await loadClient();
        const fake = createFakeFolium('export');
        expect(activate(fake.folium)).toBeUndefined();
        expect(fake.homeTabs).toEqual([]);
        expect(fake.rpcCalls).toEqual([]);
    });

    it('registers the home page and a command that opens it', async () => {
        const activate = await loadClient();
        const fake = createFakeFolium();
        activate(fake.folium);
        expect(fake.homeTabs.map((def) => def.id)).toEqual(['console']);
        await fake.commands[0].run({ values: {} } as never);
        expect(fake.folium.ui.openHomeTab).toHaveBeenCalledWith('console');
    });

    it('shows and drives volume, repeat and the queue, and records failures through rpc', async () => {
        const activate = await loadClient();
        const fake = createFakeFolium();
        const deactivate = activate(fake.folium);
        await flush();
        const container = document.createElement('div');
        document.body.append(container);
        const dispose = fake.homeTabs[0].mount(container, panelContext('en'));

        const slider = container.querySelector<HTMLInputElement>('input[type="range"]')!;
        expect(slider.value).toBe('50');
        slider.value = '30';
        slider.dispatchEvent(new Event('input'));
        slider.dispatchEvent(new Event('change'));
        expect(fake.playback.setVolume).toHaveBeenCalledWith(0.3);
        fake.emit('playback.volumeChanged', { volume: 0.8, muted: true });
        expect(slider.value).toBe('80');

        const buttonNamed = (name: string) => [...container.querySelectorAll('button')].find((node) => node.textContent === name)!;
        expect(buttonNamed('Off').getAttribute('aria-pressed')).toBe('true');
        buttonNamed('One song').click();
        expect(fake.playback.setLoopMode).toHaveBeenCalledWith('one');
        expect(buttonNamed('One song').getAttribute('aria-pressed')).toBe('true');

        // Centred on the current song: entries 45–94 of 120, with #70 marked current.
        const tracks = () => [...container.querySelectorAll<HTMLButtonElement>('button.track')];
        expect(tracks()).toHaveLength(50);
        expect(tracks()[0].textContent).toContain('Song 45');
        expect(container.querySelector('[aria-current="true"]')?.textContent).toContain('Song 70');
        tracks()[3].click();
        await flush();
        expect(fake.playback.playQueueItem).toHaveBeenCalledWith(48, 'ref-48');
        buttonNamed('Next page').click();
        expect(tracks()[0].textContent).toContain('Song 95');
        expect(buttonNamed('Next page').disabled).toBe(true);
        fake.state.currentIndex = 10;
        buttonNamed('Back to current').click();
        expect(tracks()[0].textContent).toContain('Song 0');
        // A redraw keeps keyboard focus on the same entry.
        tracks()[5].focus();
        fake.emit('playback.queueChanged', { length: 120, currentIndex: 10 });
        expect((document.activeElement as HTMLElement).dataset.index).toBe('5');

        fake.emit('playback.failed', {
            song: { id: '7', title: 'Locked', artist: 'Someone', album: null, source: 'netease', ref: 'ref-x' },
            reason: 'restricted',
            phase: 'play',
            willAutoSkip: true,
        });
        const record = fake.rpcCalls.find((entry) => entry.name === 'recordFailure')!.args[0];
        expect(JSON.parse(JSON.stringify(record))).toEqual(record);
        expect(record).toMatchObject({ song: { title: 'Locked', artist: 'Someone', source: 'netease' }, reason: 'restricted', phase: 'play', willAutoSkip: true });
        expect(container.textContent).toContain('Locked — Someone');
        // The record loaded from the main entry is listed after this session's.
        expect(container.textContent!.indexOf('Locked')).toBeLessThan(container.textContent!.indexOf('Earlier'));

        const listening = fake.handlerCount();
        (dispose as () => void)();
        expect(fake.handlerCount()).toBe(listening - 4);
        expect(container.childElementCount).toBe(0);
        deactivate?.();
        expect(fake.handlerCount()).toBe(0);
    });
});

const ACCOUNT_CONSOLE_DIR = path.join(DEV_FOLIUM_DIR, 'sample-account-console');

/*
 * sample-account-console's main entry, activated against the real mod api. The secret store is a
 * stand-in that, the way modSecrets.cjs does before the client declares its keys, reads a key with no
 * value as null and refuses to write one, and tells its
 * subscribers the key of every change; what api.rpc.send pushes is read back from sendToClient.
 */
const activateAccountConsoleMain = ({ declared = true, minor = 7 } = {}) => {
    const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'folia-dev-sample-'));
    temporaryDirectories.push(userData);
    const { value: manifest } = validateManifest(JSON.parse(fs.readFileSync(path.join(ACCOUNT_CONSOLE_DIR, 'mod.json'), 'utf8')));
    const dirs = resolveModStorageDirs(userData, manifest.id);
    const handlers = new Map<string, (...args: unknown[]) => unknown>();
    const disposers: Array<() => void> = [];
    const sent: Array<{ name: string; payload: unknown }> = [];
    const logs: string[] = [];
    const values = new Map<string, string>();
    const secretListeners = new Set<(key: string) => void>();
    const check = (key: string) => {
        if (!declared && !values.has(key)) throw new Error(`secret-undeclared:${key}`);
    };
    const secrets = {
        get: async (key: string) => values.get(key) ?? null,
        has: async (key: string) => values.has(key),
        set: async (key: string, value: string | null) => {
            check(key);
            if (value) values.set(key, value);
            else values.delete(key);
            secretListeners.forEach((listener) => listener(key));
        },
        subscribe: (listener: (key: string) => void) => {
            secretListeners.add(listener);
            return () => secretListeners.delete(listener);
        },
    };
    const api = createModApi({
        modId: manifest.id,
        manifest,
        dataStore: createModDataStore(dirs.dataDir),
        filesDir: dirs.filesDir,
        cacheDir: dirs.cacheDir,
        hostInfo: { folium: { major: 1, minor }, folia: '0.7.22' },
        emitLog: (_level: string, message: string) => logs.push(message),
        getPlaybackSnapshot: () => null,
        registerDisposer: (disposer: () => void) => disposers.push(disposer),
        secrets,
        registerRpc: (name: string, handler: (...args: unknown[]) => unknown) => handlers.set(name, handler),
        sendToClient: (name: string, json: string) => sent.push({ name, payload: JSON.parse(json) }),
        requestExport: () => Promise.reject(new Error('unused')),
    });
    require(path.join(ACCOUNT_CONSOLE_DIR, 'index.cjs'))(api);
    const call = (name: string, ...args: unknown[]) => handlers.get(name)!(...args);
    const stop = () => disposers.splice(0).reverse().forEach((dispose) => dispose());
    return { call, handlers, sent, logs, secrets, stop };
};

describe('sample-account-console main entry', () => {
    it('reports its state and pushes a pong from inside the ping handler', async () => {
        const main = activateAccountConsoleMain();
        expect([...main.handlers.keys()].sort()).toEqual(['ping', 'status']);
        expect(await main.call('status')).toEqual({ startedAt: expect.any(Number), sent: 0, beats: 0, secret: 'unset' });

        expect(main.call('ping', 'hello')).toEqual({ sent: 1 });
        expect(main.sent).toEqual([{ name: 'pong', payload: { note: 'hello', at: expect.any(Number) } }]);
        main.stop();
    });

    it('tells the client whether the secret field is set, never its value', async () => {
        const main = activateAccountConsoleMain();
        await main.secrets.set('apiKey', 'sk-not-for-the-window');
        await flush();
        await main.secrets.set('other', 'x');
        await main.secrets.set('apiKey', null);
        await flush();

        expect(main.sent.map((message) => message.name)).toEqual(['secretStatus', 'secretStatus']);
        expect(main.sent.map((message) => (message.payload as { status: string }).status)).toEqual(['set', 'unset']);
        expect(JSON.stringify([main.sent, main.logs])).not.toContain('sk-not-for-the-window');
        main.stop();
    });

    it('reads the key as unset before the client registered its section', async () => {
        const main = activateAccountConsoleMain({ declared: false });
        expect(await main.call('status')).toMatchObject({ secret: 'unset' });
        await flush();
        expect(main.logs).toContain('sample-account-console 1.0.0: secret field unset');
        main.stop();
    });

    it('sends a heartbeat every 15 seconds until the mod stops', () => {
        vi.useFakeTimers();
        try {
            const main = activateAccountConsoleMain();
            vi.advanceTimersByTime(30_000);
            expect(main.sent.map((message) => message.payload)).toEqual([
                { count: 1, at: expect.any(Number) },
                { count: 2, at: expect.any(Number) },
            ]);
            main.stop();
            vi.advanceTimersByTime(60_000);
            expect(main.sent).toHaveLength(2);
        } finally {
            vi.useRealTimers();
        }
    });

    it('does nothing on a host older than Folium 1.7', () => {
        const main = activateAccountConsoleMain({ minor: 6 });
        expect(main.handlers.size).toBe(0);
        expect(main.logs).toEqual([expect.stringContaining('needs Folium 1.7')]);
    });
});

/*
 * A stand-in for the parts of folium sample-account-console uses: a settings section handle, secrets
 * that notify by key, rpc.on listeners the test can send to, the account state, the events bus and a
 * platform.raw whose requests the test answers (and that rejects with `aborted` when the signal aborts).
 */
const createAccountConsoleFolium = (context: 'main' | 'export' = 'main') => {
    const sections: FoliumSettingsSectionDef[] = [];
    const homeTabs: FoliumHomeTabDef[] = [];
    const commands: FoliumCommandDef[] = [];
    const rpcListeners = new Map<string, Array<(payload: unknown) => void>>();
    const rpcCalls: Array<{ name: string; args: unknown[]; listening: string[] }> = [];
    const eventHandlers = new Map<string, Array<(event: unknown) => void>>();
    const secretValues = new Map<string, string>();
    const secretListeners = new Set<(key: string) => void>();
    const settingsListeners = new Set<() => void>();
    const requests: Array<{ args: unknown[]; resolve: (value: FoliumPlatformResponse) => void; reject: (error: unknown) => void }> = [];
    let settingsValues: Record<string, unknown> = { range: 'week' };
    let account: FoliumAccountState | null = Object.freeze({
        providerId: 'netease', status: 'signed-in', user: { nickname: 'Listener' }, accountKey: 'key-one-0123456789',
    });
    const platform = {
        describe: vi.fn(() => ({ supported: true, backend: { name: 'backend-lib', version: '1.2.3' } })),
        request: vi.fn((...args: unknown[]) => new Promise<FoliumPlatformResponse>((resolve, reject) => {
            requests.push({ args, resolve, reject });
            (args[3] as { signal?: AbortSignal } | undefined)?.signal?.addEventListener('abort', () => {
                reject(Object.assign(new Error('aborted'), { code: 'aborted' }));
            });
        })),
    };
    const folium = {
        modId: 'sample-account-console',
        host: { folium: { major: 1, minor: 7 }, folia: '0.7.22' },
        env: { context },
        log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
        registries: {
            settingsSections: {
                register: (def: FoliumSettingsSectionDef) => {
                    sections.push(def);
                    return {
                        id: `sample-account-console:${def.id}`,
                        unregister: () => {},
                        settings: {
                            schema: def.settings,
                            get: () => settingsValues,
                            set: () => {},
                            reset: () => {},
                            onChange: (listener: () => void) => {
                                settingsListeners.add(listener);
                                return () => settingsListeners.delete(listener);
                            },
                        },
                    };
                },
            },
            homeTabs: { register: (def: FoliumHomeTabDef) => { homeTabs.push(def); return { id: `sample-account-console:${def.id}`, unregister: () => {} }; } },
            commands: { register: (def: FoliumCommandDef) => { commands.push(def); return { id: `sample-account-console:${def.id}`, unregister: () => {} }; } },
        },
        events: {
            on: (type: string, handler: (event: unknown) => void) => {
                eventHandlers.set(type, [...(eventHandlers.get(type) ?? []), handler]);
                return () => eventHandlers.set(type, (eventHandlers.get(type) ?? []).filter((entry) => entry !== handler));
            },
        },
        secrets: {
            get: async (key: string) => secretValues.get(key) ?? null,
            has: async (key: string) => secretValues.has(key),
            set: async (key: string, value: string | null) => {
                if (value) secretValues.set(key, value);
                else secretValues.delete(key);
                secretListeners.forEach((listener) => listener(key));
            },
            subscribe: (listener: (key: string) => void) => {
                secretListeners.add(listener);
                return () => secretListeners.delete(listener);
            },
        },
        rpc: {
            call: async (name: string, ...args: unknown[]) => {
                rpcCalls.push({ name, args, listening: [...rpcListeners.keys()] });
                return name === 'status' ? { startedAt: 0, sent: 3, beats: 2, secret: 'unset' } : { sent: 4 };
            },
            on: (name: string, listener: (payload: unknown) => void) => {
                rpcListeners.set(name, [...(rpcListeners.get(name) ?? []), listener]);
                return () => rpcListeners.set(name, (rpcListeners.get(name) ?? []).filter((entry) => entry !== listener));
            },
        },
        account: {
            getState: (providerId?: string) => (providerId === undefined || providerId === account?.providerId ? account : null),
        },
        experimental: { 'platform.raw': platform },
        ui: { openHomeTab: vi.fn(), toast: vi.fn() },
    } as unknown as FoliumClientApi;
    return {
        folium,
        sections,
        homeTabs,
        commands,
        rpcCalls,
        requests,
        platform,
        send: (name: string, payload: unknown) => (rpcListeners.get(name) ?? []).forEach((listener) => listener(payload)),
        emit: (type: string, payload: unknown) => (eventHandlers.get(type) ?? []).forEach((handler) => handler(payload)),
        setAccount: (next: FoliumAccountState | null) => { account = next; },
        setSettings: (next: Record<string, unknown>) => {
            settingsValues = next;
            settingsListeners.forEach((listener) => listener());
        },
    };
};

describe('sample-account-console client', () => {
    const loadClient = async () => (await import('../../../dev/folium/sample-account-console/client.mjs')).default as (folium: FoliumClientApi) => (() => void) | undefined;

    it('registers nothing in the export window', async () => {
        const activate = await loadClient();
        const fake = createAccountConsoleFolium('export');
        expect(activate(fake.folium)).toBeUndefined();
        expect([fake.sections, fake.homeTabs, fake.rpcCalls]).toEqual([[], [], []]);
    });

    it('declares a secret field beside an ordinary one, and listens before it asks the main entry', async () => {
        const activate = await loadClient();
        const fake = createAccountConsoleFolium();
        activate(fake.folium);
        expect(fake.sections[0].settings.map((field) => [field.key, field.type])).toEqual([['apiKey', 'secret'], ['range', 'select']]);
        expect(fake.rpcCalls[0]).toEqual({ name: 'status', args: [], listening: ['heartbeat', 'pong', 'secretStatus'] });
        await fake.commands[0].run({ values: {} } as never);
        expect(fake.folium.ui.openHomeTab).toHaveBeenCalledWith('desk');
    });

    it('offers a command without params to the global shortcuts, which pings the main entry and says so', async () => {
        const activate = await loadClient();
        const fake = createAccountConsoleFolium();
        activate(fake.folium);
        const offered = fake.commands.filter((command) => command.globalShortcut === true);
        expect(offered.map((command) => command.id)).toEqual(['ping']);
        expect(offered[0].params ?? []).toEqual([]);
        // The open command stays a palette command only.
        expect(fake.commands.find((command) => command.id === 'open')?.globalShortcut).toBeUndefined();

        document.documentElement.lang = 'en';
        await offered[0].run({ values: {} } as never);
        expect(fake.rpcCalls.at(-1)).toMatchObject({ name: 'ping', args: ['from a global shortcut'] });
        expect(fake.folium.ui.toast).toHaveBeenCalledWith('The main entry sent a pong (4 messages so far)', { type: 'success' });
    });

    it('shows the secret status, the messages, the account and the listening records', async () => {
        const activate = await loadClient();
        const fake = createAccountConsoleFolium();
        const deactivate = activate(fake.folium);
        await flush();
        const container = document.createElement('div');
        document.body.append(container);
        const dispose = fake.homeTabs[0].mount(container, panelContext('en'));
        const text = () => container.textContent ?? '';
        const buttonNamed = (name: string) => [...container.querySelectorAll('button')].find((node) => node.textContent === name)!;

        // The secret field: whether it is set, as the client and the main entry read it; never the value.
        expect(text()).toContain('As the client reads itNot set');
        expect(text()).toContain('As the main entry reads itNot set');
        expect(text()).toContain('Keys in settings.get(): range');
        await fake.folium.secrets.set('apiKey', 'sk-hidden');
        await flush();
        fake.send('secretStatus', { status: 'set', at: 1 });
        expect(text()).toContain('As the client reads itSet');
        expect(text()).toContain('As the main entry reads itSet');
        expect(text()).not.toContain('sk-hidden');
        buttonNamed('Clear the key').click();
        await flush();
        expect(text()).toContain('As the client reads itNot set');

        // Messages pushed by the main entry, newest first.
        fake.send('heartbeat', { count: 1, at: 0 });
        expect(text()).toContain('heartbeat {"count":1,"at":0}');
        buttonNamed('Ask the main entry for a message').click();
        expect(fake.rpcCalls.map((entry) => entry.name)).toContain('ping');

        // The selected source's account.
        expect(text()).toContain('Listener');
        expect(text()).toContain('netease · Signed in');
        expect(text()).toContain('accountKey: key-one-…');

        // Listening records, read as the signed-in account through platform.raw.
        expect(text()).toContain('Backend backend-lib 1.2.3');
        buttonNamed('Load').click();
        expect(fake.platform.request).toHaveBeenCalledWith('netease', 'user_record', { type: 1 }, { signal: expect.any(AbortSignal) });
        fake.requests[0].resolve({
            body: { code: 200, weekData: [{ playCount: 12, score: 100, song: { name: 'Song A', ar: [{ name: 'Artist A' }] } }] },
            accountKey: 'key-one-0123456789',
        });
        await flush();
        expect(text()).toContain('Song A — Artist A12 plays');

        // Another account: the records of the old one are dropped.
        fake.setAccount({ providerId: 'netease', status: 'signed-in', user: { nickname: 'Second' }, accountKey: 'key-two-0123456789' });
        fake.emit('account.changed', { providerId: 'netease', status: 'signed-in', user: { nickname: 'Second' }, accountKey: 'key-two-0123456789' });
        expect(text()).not.toContain('Song A');
        expect(text()).toContain('Second');
        expect(text()).toContain('Last account.changed');

        // A request under way when the range changes is aborted and its answer never shown.
        buttonNamed('Load').click();
        fake.setSettings({ range: 'all' });
        await flush();
        expect((fake.requests[1].args[3] as { signal: AbortSignal }).signal.aborted).toBe(true);
        expect(text()).not.toContain('Loading');
        buttonNamed('Load').click();
        expect(fake.requests[2].args[2]).toEqual({ type: 0 });
        fake.requests[2].reject(Object.assign(new Error('not-signed-in'), { code: 'not-signed-in' }));
        await flush();
        expect(text()).toContain('Not signed in to this platform.');

        (dispose as () => void)();
        expect(container.childElementCount).toBe(0);
        deactivate?.();
    });
});
