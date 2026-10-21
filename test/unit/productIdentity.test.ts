import { describe, expect, it } from 'vitest';
import productIdentity from '../../shared/productIdentity.mjs';

// Keep packaged updates and application identity on this fork when integrating upstream changes.
const pkg = require('../../package.json');
const cjsIdentity = require('../../shared/productIdentity.cjs');
const { getUpdateProviderConfig, getUpdateDiscoveryConfig, resolveReleaseChannel } = require('../../electron/updateChannels.cjs');

describe('Folia Plain distribution identity', () => {
    it('shares one identity across module formats and packaged desktop metadata', () => {
        expect(cjsIdentity).toEqual(productIdentity);
        expect(pkg.name).toBe(productIdentity.executableName);
        expect(pkg.productName).toBe(productIdentity.name);
        expect(pkg.build.productName).toBe(productIdentity.name);
        expect(pkg.build.appId).toBe(productIdentity.appId);
        expect(pkg.build.publish[0]).toMatchObject({
            owner: productIdentity.repositoryOwner,
            repo: productIdentity.repositoryName,
        });
    });

    it.each(['realeco', 'limo', 'cielo'])('keeps the %s updater on this fork', (channel) => {
        const release = resolveReleaseChannel(pkg.version, channel);
        const github = { owner: productIdentity.repositoryOwner, repo: productIdentity.repositoryName };
        const feed = getUpdateProviderConfig(release, github);
        const discovery = getUpdateDiscoveryConfig(release, github);
        expect(discovery.url).toContain(`${productIdentity.repositoryUrl}/releases/`);
        if (feed.provider === 'github') {
            expect(feed).toMatchObject(github);
        } else {
            expect(feed.url).toContain(`${productIdentity.repositoryUrl}/releases/`);
        }
        expect(JSON.stringify({ feed, discovery })).not.toContain(productIdentity.upstreamRepository);
    });
});
