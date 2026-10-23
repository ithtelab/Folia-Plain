const { createWriteStream } = require('node:fs');
const { mkdir, rm, rename, stat } = require('node:fs/promises');
const { createHash } = require('node:crypto');
const path = require('node:path');
const { pipeline } = require('node:stream/promises');

// electron/macUpdateDownload.cjs
// Downloading a macOS update for the listener to install by hand.
//
// Squirrel.Mac refuses to replace an unsigned app, so this build cannot install its own update on
// macOS (see isAutoUpdaterSupported in main.cjs). What it can do is fetch the release's .dmg into
// the user's Downloads folder and offer to open it: mounting it is the OS's job, and dragging the
// app over is the one step macOS never lets anyone do for the user. That turns "go find the release
// page, pick the right file for your chip, download it" into one click plus a drag.
//
// The file is checked against the release's published SHA256SUMS.txt before it is moved into place,
// so a relay or a half-finished transfer cannot leave something else sitting under our name.

/** Size limit for the checksum list; it is a few hundred bytes in practice. */
const MAX_SUMS_BYTES = 64 * 1024;

/** The asset name for this machine: Apple Silicon and Intel ship different builds. */
const assetNameFor = (version, arch) => {
  const normalized = typeof version === 'string' ? version.trim().replace(/^v/i, '') : '';
  if (!/^\d+\.\d+\.\d+$/.test(normalized)) throw new Error('Not a stable version');
  const arm = arch === 'arm64';
  const suffix = arm ? 'macos-arm64.dmg' : 'macos-x64.dmg';
  return { version: normalized, asset: `Folia-Plain-${normalized}-${suffix}` };
};

/**
 * The expected digest of `asset` in a SHA256SUMS.txt body, or null when the list does not mention
 * it. Lines are the usual `<hex><space><space>name`; a leading `*` (binary mode) is accepted.
 */
const digestFromSums = (text, asset) => {
  for (const line of String(text).split(/\r?\n/)) {
    const match = /^\s*([a-f0-9]{64})\s+\*?(.+?)\s*$/i.exec(line);
    if (match && match[2] === asset) return match[1].toLowerCase();
  }
  return null;
};

/** A Downloads path that does not exist yet, so a second download cannot overwrite the first. */
const uniquePath = async (directory, fileName) => {
  const extension = path.extname(fileName);
  const stem = path.basename(fileName, extension);
  for (let index = 0; index < 1000; index += 1) {
    const candidate = path.join(directory, index === 0 ? fileName : `${stem} (${index})${extension}`);
    try {
      await stat(candidate);
    } catch {
      return candidate;
    }
  }
  throw new Error('No free file name in the download directory');
};

const hashOf = async (filePath) => {
  const hash = createHash('sha256');
  const { createReadStream } = require('node:fs');
  await pipeline(createReadStream(filePath), hash);
  return hash.digest('hex');
};

/**
 * Downloads `version`'s dmg for `arch` into `downloadsDirectory` and resolves with its path.
 *
 * `fetchBytes` returns a Response-like object with ok/status and a Node Readable `body`; it is
 * passed in so the caller decides which session, proxy and relay the request uses. `onProgress`
 * receives 0..1 when the total size is known, and is called with null when it is not.
 */
const downloadMacUpdate = async ({
  version,
  arch,
  downloadsDirectory,
  releaseBaseUrl,
  fetchBytes,
  onProgress = () => {},
  signal = undefined,
}) => {
  const { version: stable, asset } = assetNameFor(version, arch);
  const base = String(releaseBaseUrl).replace(/\/+$/, '');
  const assetUrl = `${base}/download/v${stable}/${asset}`;
  const sumsUrl = `${base}/download/v${stable}/SHA256SUMS.txt`;

  // The digest first: it is tiny, and without it a download cannot be trusted enough to keep.
  const sumsResponse = await fetchBytes(sumsUrl, { signal });
  if (!sumsResponse.ok) throw new Error(`The checksum file answered ${sumsResponse.status}`);
  const sumsText = await sumsResponse.text();
  if (Buffer.byteLength(sumsText, 'utf8') > MAX_SUMS_BYTES) throw new Error('The checksum file is too large');
  const expected = digestFromSums(sumsText, asset);
  if (!expected) throw new Error(`The release does not list ${asset}`);

  const response = await fetchBytes(assetUrl, { signal });
  if (!response.ok || !response.body) throw new Error(`The installer answered ${response.status}`);
  const total = Number(response.headers?.get?.('content-length')) || 0;

  await mkdir(downloadsDirectory, { recursive: true });
  const target = await uniquePath(downloadsDirectory, asset);
  // `.part` so a failed transfer is never mistaken for an installer in the folder.
  const partial = `${target}.part`;
  let written = 0;
  try {
    await pipeline(
      response.body,
      async function* (source) {
        for await (const chunk of source) {
          written += chunk.length;
          onProgress(total > 0 ? Math.min(1, written / total) : null);
          yield chunk;
        }
      },
      createWriteStream(partial),
    );
    const actual = await hashOf(partial);
    if (actual !== expected) throw new Error('The downloaded installer did not match the release checksum');
    await rename(partial, target);
    onProgress(1);
    return { path: target, bytes: written };
  } catch (error) {
    await rm(partial, { force: true }).catch(() => {});
    throw error;
  }
};

module.exports = { assetNameFor, digestFromSums, downloadMacUpdate };
