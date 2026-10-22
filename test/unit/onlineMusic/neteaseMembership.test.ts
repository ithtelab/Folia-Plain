import { describe, expect, it } from 'vitest';
import { normalizeNeteaseMembership } from '../../../src/services/onlineMusic/netease/neteaseMembership';
import { NETEASE_QUALITY_LEVELS, actualNeteaseQuality } from '../../../src/services/onlineMusic/netease/neteaseQuality';
import { resolveStoredAudioQuality } from '../../../src/stores/useAudioSettingsStore';

// Membership dates come from the API; unknown dates and expired higher tiers cannot grant access.
const now = 1800000000000;
describe('membership details', () => {
    it('reads the active SVIP tier, level and exact expiry', () => {
        expect(normalizeNeteaseMembership({ code: 200, data: { redVipLevel: 8, redplus: { expireTime: now + 1000 } } }, now))
            .toEqual({ tier: 'svip', level: 8, expiresAt: now + 1000, active: true });
    });
    it('prefers an active lower tier over an expired higher tier', () => {
        expect(normalizeNeteaseMembership({ code: 200, data: { redplus: { expireTime: now - 1 }, associator: { expireTime: now + 1 } } }, now)?.tier).toBe('vip');
    });
    it('shows an expired product as expired', () => {
        expect(normalizeNeteaseMembership({ code: 200, data: { redplus: { expireTime: now - 1 } } }, now)?.active).toBe(false);
    });
    it('does not invent an expiry from a rights badge', () => {
        expect(normalizeNeteaseMembership({ code: 200, data: { associator: { rights: true } } }, now)).toEqual({ tier: 'vip', active: true });
    });
    it.each([null, { code: 301 }, { code: 200, data: {} }, { code: 200, data: { redplus: { expireTime: 0 } } }])('keeps unavailable details unknown: %j', value => {
        expect(normalizeNeteaseMembership(value, now)).toBeUndefined();
    });
    it.each(['spatial', 'master', 'surround'] as const)('persists the %s preference', quality => {
        expect(resolveStoredAudioQuality(quality)).toBe(quality);
        expect(NETEASE_QUALITY_LEVELS).toContain(quality);
    });
    it('normalizes the actual returned level', () => {
        expect(actualNeteaseQuality('exhigh', 'master')).toBe('high');
        expect(actualNeteaseQuality('sky', 'surround')).toBe('surround');
    });
});
