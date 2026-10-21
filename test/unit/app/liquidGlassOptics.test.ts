import { describe, expect, it } from 'vitest';
import { createGlassLensMap } from '../../../src/components/shared/liquid-glass/liquidGlassOptics';

// Optical invariants: a flat centre, inward-facing edge normals, and bounded allocation.
const pixel = (map: ReturnType<typeof createGlassLensMap>, x: number, y: number) => (
    Array.from(map.pixels.slice((y * map.width + x) * 4, (y * map.width + x) * 4 + 4))
);

describe('glass lens map', () => {
    it('keeps the centre undistorted and outside the optical rim', () => {
        const map = createGlassLensMap(480, 72, 999);
        expect(pixel(map, map.width / 2, map.height / 2)).toEqual([128, 128, 0, 255]);
    });

    it('bends opposite edges in opposite directions with equal coverage', () => {
        const map = createGlassLensMap(480, 72, 999);
        const left = pixel(map, 4, map.height / 2);
        const right = pixel(map, map.width - 5, map.height / 2);
        expect(left[0]).toBeGreaterThan(128);
        expect(right[0]).toBeLessThan(128);
        expect(left[0] + right[0]).toBe(256);
        expect(left[2]).toBe(right[2]);
        expect(left[2]).toBeGreaterThan(0);
    });

    it('rounds corners without leaking optical coverage outside the shape', () => {
        const map = createGlassLensMap(200, 80, 16);
        expect(pixel(map, 0, 0)).toEqual([128, 128, 0, 255]);
        const nearCorner = pixel(map, Math.round(map.width * 0.04), Math.round(map.height * 0.1));
        expect(nearCorner[0]).toBeGreaterThan(128);
        expect(nearCorner[1]).toBeGreaterThan(128);
    });

    it('caps texture memory for large windows and uses the same map at high display scale', () => {
        const map = createGlassLensMap(7680, 2160, 999);
        expect(map.width).toBeLessThanOrEqual(1024);
        expect(map.height).toBeLessThanOrEqual(256);
        expect(map.pixels.byteLength).toBeLessThanOrEqual(1024 * 256 * 4);
    });

    it('handles the small rounded buttons without a degenerate rim', () => {
        const map = createGlassLensMap(40, 40, 999);
        expect(pixel(map, map.width / 2, map.height / 2)).toEqual([128, 128, 0, 255]);
        expect(map.pixels).toHaveLength(map.width * map.height * 4);
    });

    it('supersamples small rounded edges without exceeding the existing memory cap', () => {
        const map = createGlassLensMap(40, 40, 999);
        expect(map.width).toBe(80);
        expect(map.height).toBe(80);
        const coverage = Array.from({ length: map.width * map.height }, (_, index) => map.pixels[index * 4 + 2]);
        expect(coverage.some(value => value > 0 && value < 255)).toBe(true);
    });
});
