import type { ProviderMembership } from '../../../types/onlineMusic';

// Normalize the VIP endpoint's expiry-bearing products, keeping missing details unknown.
const badgeUrlOf = (value: unknown): string | undefined => {
    if (typeof value !== 'string' || !value.trim()) return undefined;
    try {
        const url = new URL(value);
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return undefined;
        if (!url.hostname.endsWith('.music.126.net') && !url.hostname.endsWith('.music.163.com')) return undefined;
        url.protocol = 'https:';
        return url.href;
    } catch { return undefined; }
};
export function normalizeNeteaseMembership(response: any, now = Date.now()): ProviderMembership | undefined {
    if (Number(response?.code) !== 200) return undefined;
    const data = response?.data;
    if (!data || typeof data !== 'object') return undefined;
    const products: Array<[ProviderMembership['tier'], any]> = [
        ['svip', data.redplus], ['vip', data.associator], ['music-package', data.musicPackage],
    ];
    const memberships = products.flatMap(([tier, product]) => {
        if (!product || typeof product !== 'object') return [];
        const value = Number(product.expireTime);
        const expiresAt = Number.isFinite(value) && value > 1e11 && value < 8.64e15 ? value : undefined;
        if (!expiresAt && product.rights !== true) return [];
        const rawLevel = Number(data.redVipLevel ?? product.vipLevel);
        const level = Number.isInteger(rawLevel) && rawLevel > 0 ? rawLevel : undefined;
        const badgeUrl = badgeUrlOf(product.iconUrl) ?? (tier === 'vip' ? badgeUrlOf(data.redVipLevelIcon) : undefined);
        return [{ tier, ...(level ? { level } : {}), ...(expiresAt ? { expiresAt } : {}),
            ...(badgeUrl ? { badgeUrl } : {}),
            active: product.rights !== false && (expiresAt ? expiresAt > now : product.rights === true) }];
    });
    return memberships.find(item => item.active) ?? memberships[0];
}
