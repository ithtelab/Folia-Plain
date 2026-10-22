import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { zipSync, strToU8 } from 'fflate';

// Package a separately built Web frontend, never the Electron-relative asset build.
const version = JSON.parse(await readFile('package.json', 'utf8')).version;
const index = await readFile('dist/index.html', 'utf8');
assert(index.includes('src="/assets/'), 'Build Web with ELECTRON unset before packaging');
const files = {};
async function collect(directory, prefix = '') {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const key = prefix + entry.name;
        if (entry.isDirectory()) await collect(path.join(directory, entry.name), `${key}/`);
        else files[`dist/${key}`] = new Uint8Array(await readFile(path.join(directory, entry.name)));
    }
}
await collect('dist');
files['README.md'] = strToU8(await readFile('packaging/web/README.md', 'utf8'));
files['nginx.conf.example'] = strToU8(await readFile('packaging/web/nginx.conf.example', 'utf8'));
files['LICENSE'] = new Uint8Array(await readFile('LICENSE'));
files['SOURCE.txt'] = strToU8(`Folia Plain ${version}\nhttps://github.com/ithtelab/Folia-Plain/tree/v${version}\nAGPL-3.0\n`);
await mkdir('release', { recursive: true });
const output = `release/Folia-Plain-${version}-web.zip`;
await writeFile(output, zipSync(files, { level: 6 }));
console.info(`[Release] Web deployment archive written: ${output}`);
