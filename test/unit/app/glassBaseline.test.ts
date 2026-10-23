import { describe, expect, it } from 'vitest';
import {
    GLASS_BLUR_STD_DEVIATION,
    GLASS_DISPLACEMENT_SCALE,
    GLASS_TONE_CURVE,
} from '@/components/shared/liquid-glass/glassBaseline';

// These values are the glass material's look. They were tuned against each other - the displacement
// scale sized for the blur above it - and the README's "Frozen baseline" section documents what each
// one does. This test fails when one moves, so a change is deliberate: update the value, this
// expectation AND that section together, and re-check the material on both a pale and a dark
// backdrop.
//
// There is deliberately no chromatic-separation entry here: a three-channel split was tried on the
// rim and taken back out, because on this app's surfaces it read as a coloured border rather than
// as refraction. See the README section for why it should not come back as a "tuning" change.

describe('glass baseline', () => {
    it('keeps the frozen optical parameters', () => {
        expect(GLASS_BLUR_STD_DEVIATION).toBe(3.5);
        expect(GLASS_DISPLACEMENT_SCALE).toEqual({ light: 22, dark: 16 });
        expect(GLASS_TONE_CURVE).toEqual({
            light: '0 0.2 0.44 0.72 1',
            dark: '0 0.24 0.43 0.49 0.5',
        });
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
        // Light glass bends more: over a bright page the bend is what makes the pane read as glass
        // at all, where dark glass already has the contrast to show it.
        expect(GLASS_DISPLACEMENT_SCALE.light).toBeGreaterThan(GLASS_DISPLACEMENT_SCALE.dark);
        expect(GLASS_TONE_CURVE.light).not.toBe(GLASS_TONE_CURVE.dark);
    });
});
