import type { ProviderMembership } from '../../../types/onlineMusic';

// Normalize the VIP endpoint's expiry-bearing products, keeping missing details unknown.
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
        return [{ tier, ...(level ? { level } : {}), ...(expiresAt ? { expiresAt } : {}),
            active: product.rights !== false && (expiresAt ? expiresAt > now : product.rights === true) }];
    });
    return memberships.find(item => item.active) ?? memberships[0];
}
