import { describe, expect, it } from 'vitest';
import {
    GLASS_BLUR_STD_DEVIATION,
    GLASS_CHROMATIC_FRINGE,
    GLASS_DISPLACEMENT_SCALE,
    GLASS_THIN_PANE_PX,
    GLASS_TONE_CURVE,
    glassChromaticFringe,
} from '@/components/shared/liquid-glass/glassBaseline';

// These values are the glass material's look. They were tuned against each other - a fringe sized
// for one displacement scale, a displacement scale sized for one blur - and the README's "Frozen
// baseline" section documents what each one does. This test fails when one moves, so a change is
// deliberate: update the value, this expectation AND that section together, and re-check the
// material on both a pale and a dark backdrop.

describe('glass baseline', () => {
    it('keeps the frozen optical parameters', () => {
        expect(GLASS_BLUR_STD_DEVIATION).toBe(3.5);
        expect(GLASS_DISPLACEMENT_SCALE).toEqual({ light: 22, dark: 16 });
        expect(GLASS_CHROMATIC_FRINGE).toEqual({ light: 0.85, dark: 1.15 });
        expect(GLASS_THIN_PANE_PX).toBe(56);
        expect(GLASS_TONE_CURVE).toEqual({
            light: '0 0.2 0.44 0.72 1',
            dark: '0 0.24 0.43 0.49 0.5',
        });
    });

    it('gives a pane at or above the thin threshold its full fringe, and a thinner one none', () => {
        expect(glassChromaticFringe(true, GLASS_THIN_PANE_PX)).toBe(GLASS_CHROMATIC_FRINGE.light);
        expect(glassChromaticFringe(false, GLASS_THIN_PANE_PX)).toBe(GLASS_CHROMATIC_FRINGE.dark);
        // The 40 px nav strip: no fringe, because the split would be a single-pixel colour line.
        expect(glassChromaticFringe(true, 40)).toBe(0);
        expect(glassChromaticFringe(false, 40)).toBe(0);
        // A small square control and a one-pixel-shy pane still get none.
        expect(glassChromaticFringe(true, GLASS_THIN_PANE_PX - 1)).toBe(0);
        // The settings panel and the player bar are well over.
        expect(glassChromaticFringe(true, 600)).toBe(GLASS_CHROMATIC_FRINGE.light);
        expect(glassChromaticFringe(false, 176)).toBe(GLASS_CHROMATIC_FRINGE.dark);
    });

    it('keeps the tone curves in the shape feComponentTransfer accepts', () => {
        // `tableValues` is a space-separated list; a stray comma makes the primitive silently inert.
        for (const curve of [GLASS_TONE_CURVE.light, GLASS_TONE_CURVE.dark]) {
            expect(curve).not.toContain(',');
            const values = curve.split(' ').map(Number);
            expect(values.every(value => Number.isFinite(value))).toBe(true);
            // Both curves start at 0 on purpose: lifting pure black put a bright floor under the
            // displaced rim, which showed as a pale halo around glass on dark artwork.
            expect(values[0]).toBe(0);
        }
        // Light glass runs all the way up; dark glass stops at 0.5, so a bright backdrop cannot
        // out-shout the material's own highlights.
        expect(Number(GLASS_TONE_CURVE.light.split(' ').at(-1))).toBe(1);
        expect(Number(GLASS_TONE_CURVE.dark.split(' ').at(-1))).toBe(0.5);
    });

    it('keeps the light and dark materials distinct', () => {
        // Light glass bends more and splits less: it has to read as glass over a bright page, where
        // a colour cast shows most. Dark glass can carry the wider split in shadow.
        expect(GLASS_DISPLACEMENT_SCALE.light).toBeGreaterThan(GLASS_DISPLACEMENT_SCALE.dark);
        expect(GLASS_CHROMATIC_FRINGE.light).toBeLessThan(GLASS_CHROMATIC_FRINGE.dark);
        expect(GLASS_TONE_CURVE.light).not.toBe(GLASS_TONE_CURVE.dark);
    });
});
