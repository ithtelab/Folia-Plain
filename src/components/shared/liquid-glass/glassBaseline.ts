// src/components/shared/liquid-glass/glassBaseline.ts
// The frozen optical baseline of the glass material.
//
// These are the numbers the material's look is made of. They were tuned against each other - the
// displacement scale sized for the blur above it - so changing one without re-checking the rest is
// how the material regresses (a light pane that goes flat, a rim that stops reading as an edge).
// `README.md`'s "Frozen baseline"
// section says what each one does and what changing it breaks; `test/unit/app/glassBaseline.test.ts`
// fails when one of them moves, so a change here is deliberate rather than incidental.
//
// Change a value only together with that test and that section.

/** Pane softness behind the bent rim, in CSS pixels. */
export const GLASS_BLUR_STD_DEVIATION = 3.5;

/**
 * How far the rim pulls the backdrop inwards. Light glass gets more: over a bright page the bend is
 * what makes the pane read as glass at all, where dark glass already has the contrast to show it.
 */
export const GLASS_DISPLACEMENT_SCALE = { light: 22, dark: 16 } as const;

/**
 * Local tone compression, as `feFuncR/G/B` table values.
 *
 * Light glass compresses its backdrop *downward* - a pane over a bright wall reads slightly darker
 * and cooler than the wall. Dark glass keeps a lower floor: lifting it put a bright band under the
 * displaced rim, which showed as a pale halo around glass sitting on dark artwork.
 */
export const GLASS_TONE_CURVE = {
    light: '0 0.2 0.44 0.72 1',
    dark: '0 0.24 0.43 0.49 0.5',
} as const;
