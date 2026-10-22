import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Validate and combine platform artifacts without silently overwriting their checksum manifests.
const input = process.argv[2] || 'artifacts';
const output = process.argv[3] || 'release';
const platforms = (process.argv[4] || 'Windows,macOS,Linux').split(',');
const merged = new Map();
await mkdir(output, { recursive: true });
for (const platform of platforms) {
    const directory = path.join(input, `folia-plain-${platform}`);
    const lines = (await readFile(path.join(directory, 'SHA256SUMS.txt'), 'utf8')).trim().split('\n');
    const names = new Set();
    for (const line of lines) {
        const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
        assert(match, `Invalid checksum in ${platform}`);
        const [, expected, name] = match;
        assert.equal(path.basename(name), name, 'Only flat release assets are allowed');
        const data = await readFile(path.join(directory, name));
        assert.equal(createHash('sha256').update(data).digest('hex'), expected, name);
        if (merged.has(name)) assert.equal(merged.get(name), expected, `Conflicting release asset: ${name}`);
        else await copyFile(path.join(directory, name), path.join(output, name));
        merged.set(name, expected);
        names.add(name);
    }
    for (const name of await readdir(directory)) assert(name === 'SHA256SUMS.txt' || names.has(name), `Unverified asset: ${name}`);
}
await writeFile(path.join(output, 'SHA256SUMS.txt'), [...merged].sort(([a], [b]) => a.localeCompare(b)).map(([name, hash]) => `${hash}  ${name}\n`).join(''));
console.info(`[Release] Combined ${merged.size} verified assets from ${platforms.join(', ')}`);
