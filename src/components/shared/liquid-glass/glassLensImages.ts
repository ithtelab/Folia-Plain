import { createGlassLensMap } from './liquidGlassOptics';
import { createLensImageCache } from './lensImageCache';

// src/components/shared/liquid-glass/glassLensImages.ts
// The lens normal map as an image URL for `<feImage>`, shared between surfaces.
//
// The map depends on nothing but width, height and corner radius, and the app has many surfaces of
// the same geometry (the panel's groups, repeated cards, the player's controls). Building and
// encoding it per surface meant one CPU pass over up to 1024x256 pixels *and* a synchronous
// `canvas.toDataURL()` -- PNG encoding on the main thread, measured at ~7 ms per surface when the
// side panel opened. Here the encode is asynchronous (`toBlob`) and each distinct geometry is
// encoded once; callers hold a reference so an entry in use is never revoked.

const MAX_ENTRIES = 64;

const cache = createLensImageCache({
    maxEntries: MAX_ENTRIES,
    revoke: url => URL.revokeObjectURL(url),
});
const pending = new Map<string, Promise<string>>();

const keyFor = (width: number, height: number, radius: number) => `${width}:${height}:${radius}`;

const encodeLensMap = (width: number, height: number, radius: number): Promise<string> => {
    const map = createGlassLensMap(width, height, radius);
    const canvas = document.createElement('canvas');
    canvas.width = map.width;
    canvas.height = map.height;
    const context = canvas.getContext('2d');
    if (!context) return Promise.reject(new Error('the lens map has no 2d context'));
    const image = context.createImageData(map.width, map.height);
    image.data.set(map.pixels);
    context.putImageData(image, 0, 0);
    return new Promise((resolve, reject) => {
        // `toBlob` encodes off the main thread; `toDataURL` blocked it for the whole PNG.
        canvas.toBlob(blob => {
            if (!blob) {
                reject(new Error('the lens map could not be encoded'));
                return;
            }
            resolve(URL.createObjectURL(blob));
        }, 'image/png');
    });
};

/**
 * The shared lens image for these dimensions. Every successful call must be paired with
 * `releaseGlassLensImage` using the same dimensions, or the entry is kept for the page's lifetime.
 */
export const acquireGlassLensImage = (width: number, height: number, radius: number): Promise<string> => {
    const key = keyFor(width, height, radius);
    const held = cache.retain(key);
    if (held !== undefined) return Promise.resolve(held);

    const inFlight = pending.get(key);
    if (inFlight) {
        // A second surface asked while the first is still encoding: take its hold once published.
        return inFlight.then(url => cache.retain(key) ?? url);
    }

    const request = encodeLensMap(width, height, radius).then(url => {
        cache.publish(key, url);
        pending.delete(key);
        return url;
    }).catch(error => {
        pending.delete(key);
        throw error;
    });
    pending.set(key, request);
    return request.then(url => cache.retain(key) ?? url);
};

/** Gives one hold back. An entry nobody holds is dropped once the cache is over its cap. */
export const releaseGlassLensImage = (width: number, height: number, radius: number): void => {
    cache.release(keyFor(width, height, radius));
};
