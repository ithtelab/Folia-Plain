// src/components/shared/liquid-glass/lensImageCache.ts
// The reference-counted cache behind `glassLensImages.ts`, with no DOM in it: a store of encoded
// lens images keyed by the geometry they were built for, plus the rule for which entry can go.
// Kept apart from the browser module so the accounting is testable without a canvas.

export type LensImageCacheEntry = { url: string; refs: number };

export type LensImageCacheOptions = {
    maxEntries: number;
    revoke: (url: string) => void;
};

export const createLensImageCache = ({ maxEntries, revoke }: LensImageCacheOptions) => {
    const entries = new Map<string, LensImageCacheEntry>();

    const prune = (reserve = 0) => {
        const target = Math.max(0, maxEntries - reserve);
        if (entries.size <= target) return;
        // Map iteration is insertion order, so this drops the oldest released entries first.
        for (const [key, entry] of entries) {
            if (entries.size <= target) break;
            if (entry.refs > 0) continue;
            entries.delete(key);
            revoke(entry.url);
        }
    };

    return {
        /** The published entry for `key`, if one exists. */
        peek: (key: string): LensImageCacheEntry | undefined => entries.get(key),
        /**
         * Publishes an encoded image; the caller then takes its own hold with `retain`. One slot is
         * reserved for it first, so the entry being published can never be the one pruned in the
         * same pass — otherwise the caller's `retain` would arrive just after its image was revoked.
         */
        publish: (key: string, url: string) => {
            prune(1);
            entries.set(key, { url, refs: 0 });
        },
        /** Takes one hold on an entry, which keeps it from being pruned. */
        retain: (key: string): string | undefined => {
            const entry = entries.get(key);
            if (!entry) return undefined;
            entry.refs += 1;
            return entry.url;
        },
        /** Gives one hold back. The entry stays until the cache is over its cap. */
        release: (key: string) => {
            const entry = entries.get(key);
            if (!entry) return;
            entry.refs = Math.max(0, entry.refs - 1);
            prune();
        },
        /** Drops an entry outright, whatever its holds (unmount of the whole material). */
        drop: (key: string) => {
            const entry = entries.get(key);
            if (!entry) return;
            entries.delete(key);
            revoke(entry.url);
        },
        size: () => entries.size,
    };
};
