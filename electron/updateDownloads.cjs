const identity = require('../shared/productIdentity.json');
const { createHash } = require('node:crypto');

// Trust this repository's GitHub release and digests, even when bytes pass through a relay.
const MIRROR_BASE = 'https://gh-proxy.com/';

function accelerateReleaseUrl(value) {
  const url = new URL(value);
  const prefix = `/${identity.repository}/releases/download/`;
  if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.username || url.password || !url.pathname.startsWith(prefix)) {
    throw new Error('Only this repository\'s release assets can use the update relay');
  }
  return new URL(`${MIRROR_BASE}${url.href}`);
}

function getMirrorInstallerUrl(version, platform, arch) {
  const normalized = typeof version === 'string' ? version.trim().replace(/^v/i, '') : '';
  if (!/^\d+\.\d+\.\d+$/.test(normalized) || platform !== 'win32' || arch !== 'x64') return null;
  return accelerateReleaseUrl(`${identity.releasesUrl}/download/v${normalized}/Folia-Plain-Setup-${normalized}-x64.exe`).href;
}

function createMirrorUpdateProvider() {
  const { GitHubProvider } = require('electron-updater/out/providers/GitHubProvider');
  const { parseUpdateInfo } = require('electron-updater/out/providers/Provider');
  const { CancellationToken } = require('builder-util-runtime');
  return class PlainUpdateProvider extends GitHubProvider {
    constructor(options, updater, runtimeOptions) {
      super({ ...options, provider: 'github' }, updater, runtimeOptions);
      this.resolveDownloadSource = options.resolveDownloadSource;
    }

    async requestMetadata(url, headers) {
      const token = new CancellationToken();
      const timeout = setTimeout(() => token.cancel(), 15000);
      try {
        return await this.httpRequest(url, headers, token);
      } finally {
        clearTimeout(timeout);
      }
    }

    async getLatestVersion() {
      // The API is the authority even when github.com's release feed is blocked locally.
      let release;
      try {
        release = JSON.parse(await this.requestMetadata(new URL(`https://api.github.com/repos/${identity.repository}/releases/latest`), { Accept: 'application/vnd.github+json' }));
      } catch (error) {
        // Shared network exits can exhaust GitHub's anonymous API quota. In this path only
        // GitHub itself may provide metadata: the relay cannot supply its own trusted checksum.
        console.warn('[Updater] GitHub release API unavailable; reading the official update file directly.', error);
        const name = `${this.channel}.yml`;
        const canonical = new URL(`${identity.releasesUrl}/latest/download/${name}`);
        const info = parseUpdateInfo(await this.requestMetadata(canonical, { Accept: 'application/octet-stream' }), name, canonical);
        if (!/^\d+\.\d+\.\d+$/.test(info.version)) throw new Error('No stable Plain update metadata available');
        return { ...info, tag: `v${info.version}` };
      }
      if (release.draft || release.prerelease || !/^v\d+\.\d+\.\d+$/.test(release.tag_name)) throw new Error('No stable Plain release available');
      const name = `${this.channel}.yml`;
      const asset = release.assets?.find(file => file.name === name);
      if (!asset || !/^sha256:[a-f0-9]{64}$/.test(asset.digest)) throw new Error('Plain update metadata has no GitHub digest');
      const canonical = new URL(asset.browser_download_url);
      const relayed = accelerateReleaseUrl(canonical.href);
      let lastError;
      for (const url of [relayed, canonical]) {
        try {
          const text = await this.requestMetadata(url, { Accept: 'application/octet-stream' });
          if (`sha256:${createHash('sha256').update(text).digest('hex')}` !== asset.digest) throw new Error('Update metadata checksum mismatch');
          const info = parseUpdateInfo(text, name, canonical);
          if (`v${info.version}` !== release.tag_name) throw new Error('Plain release version and metadata do not match');
          return { ...info, tag: release.tag_name, releaseName: release.name, releaseNotes: release.body };
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError;
    }

    resolveFiles(info) {
      const files = super.resolveFiles(info);
      if (this.resolveDownloadSource() !== 'mirror') return files;
      // Preserve the canonical SHA-512 and all file metadata for electron-updater's verification.
      return files.map(file => ({ ...file, url: accelerateReleaseUrl(file.url.href) }));
    }
  };
}

// One transfer at a time; a failed relay retries the same verified update directly from GitHub.
function createUpdateDownloadRunner({ download, setSource, onFallback }) {
  let pending = null;
  return function run() {
    if (pending) return pending;
    pending = (async () => {
      for (const source of ['mirror', 'github']) {
        setSource(source);
        try {
          return await download();
        } catch (error) {
          if (source === 'github') throw error;
          onFallback(error);
        }
      }
    })().finally(() => { pending = null; });
    return pending;
  };
}

module.exports = { accelerateReleaseUrl, createMirrorUpdateProvider, createUpdateDownloadRunner, getMirrorInstallerUrl };
