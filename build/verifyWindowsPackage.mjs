import assert from 'node:assert/strict';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { _electron as electron } from 'playwright';
import identity from '../shared/productIdentity.mjs';

// Exercise the actual packaged executable with an isolated profile before distributing it.
assert.equal(process.platform, 'win32', 'This smoke check requires Windows');
const root = path.resolve(process.argv[2] || 'release/win-unpacked');
const output = path.resolve('test-results/packaged-desktop');
const profile = path.join(output, `userdata-${Date.now()}`);
await mkdir(output, { recursive: true });
for (const relative of [
    'resources/app.asar', 'resources/folia-wallpaper-helper.exe',
    'resources/mnn/folia_mnn.dll', 'resources/ffmpeg-audio/ffmpeg.exe',
    'resources/models/beat_this-wgsl.bin', 'resources/models/htdemucs-wgsl.bin',
]) {
    assert((await stat(path.join(root, relative))).size > 0, `Missing packaged resource: ${relative}`);
}
const updateConfig = await readFile(path.join(root, 'resources/app-update.yml'), 'utf8');
assert(updateConfig.includes(`owner: ${identity.repositoryOwner}`));
assert(updateConfig.includes(`repo: ${identity.repositoryName}`));
const env = { ...process.env, ELECTRON_DEV: 'false' };
delete env.ELECTRON_RUN_AS_NODE;
const app = await electron.launch({
    executablePath: path.join(root, `${identity.name}.exe`),
    args: [`--user-data-dir=${profile}`, '--disable-gpu'],
    env,
    timeout: 90000,
});
const mainLog = [];
app.process().stdout?.on('data', (chunk) => mainLog.push(chunk.toString()));
app.process().stderr?.on('data', (chunk) => mainLog.push(chunk.toString()));
try {
    const metadata = await app.evaluate(({ app }) => ({
        userData: app.getPath('userData'), name: app.getName(),
        version: app.getVersion(), packaged: app.isPackaged,
    }));
    assert.equal(path.resolve(metadata.userData).toLowerCase(), profile.toLowerCase(), 'Refusing to drive a real user profile');
    assert.equal(metadata.name, identity.name);
    assert.equal(metadata.packaged, true);
    const page = await app.firstWindow({ timeout: 90000 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.waitForFunction(() => !!document.querySelector('#root')?.children.length && document.body.innerText.length > 100, { timeout: 90000 });
    const preload = await page.evaluate(async () => ({
        title: document.title, url: location.href,
        settingsAvailable: typeof window.electron?.getSettings === 'function' && !!(await window.electron.getSettings()),
    }));
    assert(preload.url.startsWith('file:'), 'Must load the packaged frontend');
    assert(preload.settingsAvailable, 'Packaged preload IPC must work');
    assert.equal(errors.length, 0, `Renderer errors: ${errors.join('; ')}`);
    await page.screenshot({ path: path.join(output, 'home.png') });
    await writeFile(path.join(output, 'result.json'), JSON.stringify({ ...metadata, ...preload, errors }, null, 2));
    console.log('[Release] Packaged desktop identity, frontend, preload IPC and native resources verified');
} finally {
    await app.close();
    await writeFile(path.join(output, 'main.log'), mainLog.join(''));
}
