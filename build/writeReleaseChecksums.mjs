import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Hash the distributable assets, excluding build diagnostics and the checksum file itself.
const directory = path.resolve('release');
const files = (await readdir(directory)).filter((name) =>
    /\.(exe|dmg|zip|deb|rpm|tar\.gz|blockmap|yml)$/.test(name) && !name.startsWith('builder-'),
).sort();
if (!files.length) throw new Error('No release assets found');
const lines = [];
for (const name of files) {
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(path.join(directory, name))) hash.update(chunk);
    lines.push(`${hash.digest('hex')}  ${name}`);
}
await writeFile(path.join(directory, 'SHA256SUMS.txt'), `${lines.join('\n')}\n`);
console.log(`[Release] SHA-256 recorded for ${files.length} assets`);
