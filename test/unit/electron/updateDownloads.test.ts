import { describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';

// Update relays may change transport, but never the source repository or trusted file digest.
const { accelerateReleaseUrl, createMirrorUpdateProvider, createUpdateDownloadRunner, getMirrorInstallerUrl } = require('../../../electron/updateDownloads.cjs');

describe('Plain update downloads', () => {
    it('builds our Windows installer relay link and rejects invalid versions or unsupported packages', () => {
        expect(getMirrorInstallerUrl('v0.7.22', 'win32', 'x64')).toBe('https://gh-proxy.com/https://github.com/ithtelab/Folia-Plain/releases/download/v0.7.22/Folia-Plain-Setup-0.7.22-x64.exe');
        for (const version of ['../other', '0.7.22/evil.exe', '', '0.7.22-beta.1']) expect(getMirrorInstallerUrl(version, 'win32', 'x64')).toBeNull();
        expect(getMirrorInstallerUrl('0.7.22', 'darwin', 'arm64')).toBeNull();
        expect(getMirrorInstallerUrl('0.7.22', 'win32', 'arm64')).toBeNull();
    });

    it.each([
        'https://github.com/chthollyphile/folia-major/releases/download/v0.7.22/Folia.exe',
        'https://github.com/ithtelab/Folia-Plain-evil/releases/download/v0.7.22/a.exe',
        'https://github.com/ithtelab/Folia-Plain/releases/download/../../other/a.exe',
        'https://github.com.evil.example/ithtelab/Folia-Plain/releases/download/v0.7.22/a.exe',
        'http://github.com/ithtelab/Folia-Plain/releases/download/v0.7.22/a.exe',
        'https://user:password@github.com/ithtelab/Folia-Plain/releases/download/v0.7.22/a.exe',
    ])('does not relay another origin or repository: %s', value => {
        expect(() => accelerateReleaseUrl(value)).toThrow();
    });

    it('keeps GitHub metadata and its SHA-512 when switching only the binary transport', () => {
        let source = 'mirror';
        const Provider = createMirrorUpdateProvider();
        const provider = new Provider({ owner: 'ithtelab', repo: 'Folia-Plain', channel: 'latest', resolveDownloadSource: () => source }, { channel: 'latest' }, { executor: null, platform: 'win32' });
        const info = { version: '0.7.23', tag: 'v0.7.23', files: [{ url: 'Folia-Plain-Setup-0.7.23-x64.exe', sha512: Buffer.alloc(64, 7).toString('base64'), size: 123 }] };
        const mirrored = provider.resolveFiles(info)[0];
        expect(mirrored.url.href).toContain('https://gh-proxy.com/https://github.com/ithtelab/Folia-Plain/releases/download/v0.7.23/');
        expect(mirrored.info).toEqual(info.files[0]);
        expect(provider.baseUrl.origin).toBe('https://github.com');
        expect(provider.basePath).toBe('/ithtelab/Folia-Plain/releases');
        source = 'github';
        expect(provider.resolveFiles(info)[0].url.href).toBe('https://github.com/ithtelab/Folia-Plain/releases/download/v0.7.23/Folia-Plain-Setup-0.7.23-x64.exe');
    });

    it('retries a failed relay directly, including failed verification, without duplicate transfers', async () => {
        const failure = new Error('sha512 checksum mismatch');
        const download = vi.fn().mockRejectedValueOnce(failure).mockResolvedValueOnce(['installer.exe']);
        const setSource = vi.fn();
        const onFallback = vi.fn();
        const run = createUpdateDownloadRunner({ download, setSource, onFallback });
        const first = run();
        expect(run()).toBe(first);
        await expect(first).resolves.toEqual(['installer.exe']);
        expect(setSource.mock.calls).toEqual([['mirror'], ['github']]);
        expect(onFallback).toHaveBeenCalledWith(failure);
        expect(download).toHaveBeenCalledTimes(2);
    });

    it('uses our canonical API digest to reject stale or changed mirrored metadata', async () => {
        const Provider = createMirrorUpdateProvider();
        const provider = new Provider({ owner: 'ithtelab', repo: 'Folia-Plain', resolveDownloadSource: () => 'mirror' }, { channel: 'latest' }, { executor: null, platform: 'win32' });
        const text = 'version: 0.7.22\nfiles:\n  - url: Folia-Plain-Setup-0.7.22-x64.exe\n    sha512: canonical-digest\n';
        const canonical = 'https://github.com/ithtelab/Folia-Plain/releases/download/v0.7.22/latest.yml';
        const release = { tag_name: 'v0.7.22', draft: false, prerelease: false, assets: [{ name: 'latest.yml', browser_download_url: canonical, digest: `sha256:${createHash('sha256').update(text).digest('hex')}` }] };
        provider.httpRequest = vi.fn().mockResolvedValueOnce(JSON.stringify(release)).mockResolvedValueOnce('version: 99.0.0\n').mockResolvedValueOnce(text);
        const info = await provider.getLatestVersion();
        expect(info.version).toBe('0.7.22');
        expect(info.tag).toBe('v0.7.22');
        expect(info.files[0].sha512).toBe('canonical-digest');
        expect(provider.httpRequest.mock.calls.map((call: [URL]) => call[0].href)).toEqual([
            'https://api.github.com/repos/ithtelab/Folia-Plain/releases/latest',
            `https://gh-proxy.com/${canonical}`,
            canonical,
        ]);
    });

    it('never accepts mirrored metadata without an authoritative GitHub digest', async () => {
        const Provider = createMirrorUpdateProvider();
        const provider = new Provider({ owner: 'ithtelab', repo: 'Folia-Plain', resolveDownloadSource: () => 'mirror' }, { channel: 'latest' }, { executor: null, platform: 'win32' });
        provider.httpRequest = vi.fn().mockResolvedValue(JSON.stringify({ tag_name: 'v0.7.22', assets: [{ name: 'latest.yml', digest: null }] }));
        await expect(provider.getLatestVersion()).rejects.toThrow('GitHub digest');
        expect(provider.httpRequest).toHaveBeenCalledTimes(1);
    });

    it('reports the final failure and permits a subsequent retry', async () => {
        const download = vi.fn().mockRejectedValueOnce(new Error('relay down')).mockRejectedValueOnce(new Error('GitHub down')).mockResolvedValueOnce(['retry.exe']);
        const run = createUpdateDownloadRunner({ download, setSource: vi.fn(), onFallback: vi.fn() });
        await expect(run()).rejects.toThrow('GitHub down');
        await expect(run()).resolves.toEqual(['retry.exe']);
    });
});
