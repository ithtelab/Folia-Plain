import { describe, expect, it } from 'vitest';
import { assetNameFor, digestFromSums, downloadMacUpdate } from '../../../electron/macUpdateDownload.cjs';

// The macOS assisted update: which file a machine needs, and which checksum it must match.
describe('macOS assisted update', () => {
    it('picks the dmg for the machine\'s chip', () => {
        expect(assetNameFor('0.7.25', 'arm64')).toEqual({ version: '0.7.25', asset: 'Folia-Plain-0.7.25-macos-arm64.dmg' });
        expect(assetNameFor('v0.7.25', 'x64')).toEqual({ version: '0.7.25', asset: 'Folia-Plain-0.7.25-macos-x64.dmg' });
    });

    it('refuses anything that is not a stable version', () => {
        for (const bad of ['', 'latest', '1.2', 'v1.2.3-beta.1', null]) {
            expect(() => assetNameFor(bad as string, 'arm64')).toThrow(/stable version/);
        }
    });

    it('reads the digest of exactly this asset out of the sums file', () => {
        const arm = 'a'.repeat(64);
        const intel = 'b'.repeat(64);
        const text = [
            `${intel}  Folia-Plain-0.7.25-macos-x64.dmg`,
            `${arm}  Folia-Plain-0.7.25-macos-arm64.dmg`,
        ].join('\n');
        expect(digestFromSums(text, 'Folia-Plain-0.7.25-macos-arm64.dmg')).toBe(arm);
        expect(digestFromSums(text, 'Folia-Plain-0.7.25-macos-x64.dmg')).toBe(intel);
    });

    it('accepts CRLF and the binary-mode star, and reports an unlisted asset as null', () => {
        const digest = 'c'.repeat(64);
        expect(digestFromSums(`${digest} *Folia-Plain-0.7.25-macos-arm64.dmg\r\n`, 'Folia-Plain-0.7.25-macos-arm64.dmg')).toBe(digest);
        expect(digestFromSums(`${digest}  other.dmg`, 'Folia-Plain-0.7.25-macos-arm64.dmg')).toBeNull();
        expect(digestFromSums('', 'Folia-Plain-0.7.25-macos-arm64.dmg')).toBeNull();
    });

    it('rejects a download whose bytes do not match the release checksum, and leaves no file behind', async () => {
        const digest = 'd'.repeat(64);
        const response = (body: string, ok = true, status = 200, headers: Record<string, string> = {}) => ({
            ok, status,
            headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
            text: async () => body,
            body: (function* () { yield Buffer.from('not the installer'); })(),
        });
        const fetchBytes = async (url: string) => (
            url.endsWith('SHA256SUMS.txt')
                ? response(`Folia-Plain-0.7.25-macos-arm64.dmg`.replace(/^/, `${digest}  `))
                : response('', true, 200, { 'content-length': '17' })
        );
        await expect(downloadMacUpdate({
            version: '0.7.25',
            arch: 'arm64',
            downloadsDirectory: 'C:/tmp/does-not-matter',
            releaseBaseUrl: 'https://example.test/releases',
            fetchBytes: fetchBytes as never,
        })).rejects.toThrow(/checksum/);
    });
});
