import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Combined releases must verify every attachment and reject conflicting platform assets.
const scratch: string[] = [];
afterEach(() => { for (const directory of scratch.splice(0)) rmSync(directory, { recursive: true, force: true }); });
const assembler = path.resolve('build/assembleRelease.mjs');
function fixture(secondName = 'mac.zip', secondContent = 'mac') {
    const root = mkdtempSync(path.join(tmpdir(), 'folia-release-'));
    scratch.push(root);
    for (const [platform, name, data] of [['Windows', 'win.zip', 'windows'], ['macOS', secondName, secondContent]]) {
        const directory = path.join(root, 'input', `folia-plain-${platform}`);
        mkdirSync(directory, { recursive: true });
        writeFileSync(path.join(directory, name), data);
        writeFileSync(path.join(directory, 'SHA256SUMS.txt'), `${createHash('sha256').update(data).digest('hex')}  ${name}\n`);
    }
    return { root, run: () => execFileSync(process.execPath, [assembler, path.join(root, 'input'), path.join(root, 'output'), 'Windows,macOS'], { stdio: 'pipe' }) };
}
describe('release attachment assembly', () => {
    it('combines verified files and both checksum records', () => {
        const { root, run } = fixture();
        run();
        expect(readFileSync(path.join(root, 'output', 'win.zip'), 'utf8')).toBe('windows');
        expect(readFileSync(path.join(root, 'output', 'SHA256SUMS.txt'), 'utf8').trim().split('\n')).toHaveLength(2);
    });
    it('rejects an altered attachment before publishing', () => {
        const { root, run } = fixture();
        writeFileSync(path.join(root, 'input', 'folia-plain-macOS', 'mac.zip'), 'tampered');
        expect(run).toThrow();
    });
    it('rejects different bytes under the same filename', () => {
        expect(fixture('win.zip', 'conflicting').run).toThrow();
    });
});
