import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

// test/unit/electron/qqAuthSessionRepository.test.ts

const {
    SESSION_KEY,
    createQqAuthSessionRepository,
} = require('../../../electron/qq/qqAuthSessionRepository.cjs') as {
    SESSION_KEY: string;
    createQqAuthSessionRepository: (options: Record<string, unknown>) => {
        kind: string;
        load: () => unknown;
        loadFailed: () => boolean;
        save: (sessions: unknown[]) => void;
    };
};

function createStore() {
    const values = new Map<string, unknown>();
    return {
        values,
        get: vi.fn((key: string) => values.get(key)),
        set: vi.fn((key: string, value: unknown) => values.set(key, value)),
        delete: vi.fn((key: string) => values.delete(key)),
    };
}

// Reversible byte transformation: deterministic enough for the unit test while ensuring the fake
// disk value is not merely the plaintext JSON wrapped in base64.
function createSafeStorage(backend = 'dpapi') {
    return {
        isEncryptionAvailable: vi.fn(() => true),
        getSelectedStorageBackend: vi.fn(() => backend),
        encryptString: vi.fn((plaintext: string): Buffer =>
            Buffer.from(Buffer.from(plaintext, 'utf8').map((byte) => byte ^ 0xa5))),
        decryptString: vi.fn((ciphertext: Buffer) =>
            Buffer.from(Buffer.from(ciphertext).map((byte) => byte ^ 0xa5)).toString('utf8')),
    };
}

describe('QQ auth session repository', () => {
    it('round-trips sessions while electron-store sees ciphertext only', () => {
        const store = createStore();
        const safeStorage = createSafeStorage();
        const repository = createQqAuthSessionRepository({ store, safeStorage });
        const sessions = [{
            token: 'opaque-token',
            credential: { musicid: 123, musickey: 'qq-secret-musickey', loginType: 6 },
            device: { androidId: 'device-id' },
            expiresAt: 1_000_000,
        }];

        repository.save(sessions);

        const persisted = store.values.get(SESSION_KEY);
        expect(persisted).toEqual(expect.any(String));
        expect(persisted).not.toContain('opaque-token');
        expect(persisted).not.toContain('qq-secret-musickey');
        expect(repository.load()).toEqual(sessions);
        expect(repository.kind).toBe('electron-safe-storage');
        if (process.platform !== 'linux') {
            expect(safeStorage.getSelectedStorageBackend).not.toHaveBeenCalled();
        }
    });

    it('refuses Linux basic_text instead of persisting credentials without encryption', () => {
        const store = createStore();
        const repository = createQqAuthSessionRepository({
            store,
            safeStorage: createSafeStorage('basic_text'),
            platform: 'linux',
        });

        expect(() => repository.save([{ token: 'opaque-token' }]))
            .toThrow(/unencrypted basic_text/);
        expect(store.set).not.toHaveBeenCalled();
    });

    // 应用关着度过了 musickey 到期前的 6 小时：包在 restore 时会直接删掉过期会话，refresh_key 一次都没试过。
    it('brings back an expired session that can be refreshed, so the package tries the refresh once', async () => {
        const packageRoot = path.dirname(require.resolve('@yakult-green-tea/qq-music-api/package.json'));
        const { createStoredSessionResolver } = require(path.join(packageRoot, 'dist/src/services/auth/sessionState.js'));
        const { createAndroidDevice } = require(path.join(packageRoot, 'dist/src/services/auth/androidDevice.js'));
        const NOW = 1_800_000_000_000;
        const DAY = 24 * 60 * 60 * 1000;
        const credentialFrom = (createdAt: number, musickey: string, refreshKey?: string) => ({
            musicid: 123,
            musickey,
            loginType: 2,
            ...(refreshKey ? { refresh_key: refreshKey } : {}),
            musickeyCreateTime: Math.floor(createdAt / 1000),
            keyExpiresIn: 259200,
        });
        const expiredAt = NOW - DAY;
        const store = createStore();
        const repository = createQqAuthSessionRepository({
            store,
            safeStorage: createSafeStorage(),
            now: () => NOW,
            logger: { info: vi.fn() },
        });
        repository.save([
            { token: 'refreshable', credential: credentialFrom(NOW - 4 * DAY, 'old-key', 'refresh-key'), device: createAndroidDevice(), expiresAt: expiredAt },
            { token: 'no-refresh-key', credential: credentialFrom(NOW - 4 * DAY, 'other-key'), device: createAndroidDevice(), expiresAt: expiredAt },
        ]);
        const refreshCredential = vi.fn(async () => credentialFrom(NOW, 'new-key', 'refresh-key'));

        const resolver = createStoredSessionResolver({ repository, now: () => NOW, randomBytes: (size: number) => Buffer.alloc(size), refreshCredential });
        const session = await resolver.resolve('refreshable');

        expect(refreshCredential).toHaveBeenCalledTimes(1);
        expect(session?.credential.musickey).toBe('new-key');
        expect(session?.expiresAt).toBe(NOW + 3 * DAY);
        // 不能续的过期会话照旧删掉。
        expect(await resolver.resolve('no-refresh-key')).toBeNull();
        expect((repository.load() as Array<{ token: string }>).map(saved => saved.token)).toEqual(['refreshable']);
    });

    // 只有这次没有系统加密时才算「这次读不出」；加密能用却解不开、或是别的版本，就是没存东西。
    it.each([
        ['without OS encryption', { isEncryptionAvailable: () => false }, true],
        ['on the plaintext Linux backend', { getSelectedStorageBackend: () => 'basic_text' }, true],
        ['when the keychain refuses it', { decryptString: () => { throw new Error('refused'); } }, false],
        ['for an envelope of another version', { decryptString: () => JSON.stringify({ version: 9, sessions: [] }) }, false],
    ])('counts a stored session it cannot read %s as unknown only without OS encryption', (_case, change, unknown) => {
        const store = createStore();
        createQqAuthSessionRepository({ store, safeStorage: createSafeStorage() }).save([{ token: 'opaque-token' }]);
        const repository = createQqAuthSessionRepository({ store, safeStorage: { ...createSafeStorage(), ...change }, platform: 'linux' });

        expect(() => repository.load()).toThrow();
        expect(repository.loadFailed()).toBe(unknown);
    });

    it('can clear stale ciphertext even if encryption becomes unavailable', () => {
        const store = createStore();
        store.values.set(SESSION_KEY, 'stale-ciphertext');
        const safeStorage = {
            isEncryptionAvailable: vi.fn(() => false),
        };
        const repository = createQqAuthSessionRepository({ store, safeStorage });

        repository.save([]);

        expect(store.delete).toHaveBeenCalledWith(SESSION_KEY);
        expect(store.values.has(SESSION_KEY)).toBe(false);
    });
});
