import { describe, expect, it } from 'vitest';
import { createLensImageCache } from '../../../src/components/shared/liquid-glass/lensImageCache';

// Accounting for the shared lens images: a held entry is never revoked, and only released entries
// beyond the cap go, oldest first.
describe('lens image cache', () => {
    const make = (maxEntries = 2) => {
        const revoked: string[] = [];
        const cache = createLensImageCache({ maxEntries, revoke: url => revoked.push(url) });
        return { cache, revoked };
    };

    it('hands the same image to every holder until the last one releases it', () => {
        const { cache, revoked } = make(3);
        cache.publish('a', 'url-a');
        expect(cache.retain('a')).toBe('url-a');
        expect(cache.retain('a')).toBe('url-a');
        cache.release('a');
        expect(cache.peek('a')?.refs).toBe(1);
        expect(revoked).toEqual([]);
        cache.release('a');
        expect(cache.peek('a')?.refs).toBe(0);
    });

    it('keeps the image being published from being pruned in the same pass', () => {
        const { cache, revoked } = make(1);
        cache.publish('a', 'url-a');
        cache.retain('a');
        cache.publish('b', 'url-b');
        // The slot for 'b' was reserved before it was inserted, so only the released 'a' could go
        // -- and it is held, so nothing goes at all.
        expect(cache.peek('b')?.url).toBe('url-b');
        expect(revoked).toEqual([]);
    });

    it('drops the oldest released entries first', () => {
        const { cache, revoked } = make(2);
        for (const key of ['a', 'b', 'c', 'd']) {
            cache.publish(key, `url-${key}`);
        }
        expect(cache.size()).toBe(2);
        expect(revoked).toEqual(['url-a', 'url-b']);
        expect(cache.peek('c')).toBeTruthy();
        expect(cache.peek('d')).toBeTruthy();
    });

    it('treats an unknown key as a no-op rather than a crash', () => {
        const { cache } = make();
        expect(cache.retain('nope')).toBeUndefined();
        expect(() => cache.release('nope')).not.toThrow();
    });
});
