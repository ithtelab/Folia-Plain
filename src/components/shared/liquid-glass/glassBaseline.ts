// src/components/shared/liquid-glass/glassBaseline.ts
// The frozen optical baseline of the glass material.
//
// These are the numbers the material's look is made of. They were tuned against each other - a
// displacement scale sized for one blur, a fringe sized for one displacement - so changing one
// without re-checking the rest is how the material regresses (a rim that reads as a drawn border,
// a light pane that goes flat, a warm cast over a pale page). `README.md`'s "Frozen baseline"
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

/**
 * How far apart the rim's three channels sit, in CSS pixels: the chromatic separation that makes a
 * bent edge read as refracting rather than as painted.
 *
 * Light glass gets less because a pale backdrop is where a colour cast shows most; dark glass
 * hides it in shadow.
 */
export const GLASS_CHROMATIC_FRINGE = { light: 0.85, dark: 1.15 } as const;

/**
 * Below this pane thickness (the shorter side, in CSS pixels) the chromatic separation is dropped
 * to zero.
 *
 * Measured on the 40 px navigation strip, a 0.85 px fringe put an 18/255 (7%) yellow line along the
 * edge where the same band without it read 1/255: on a strip that thin the split lands inside a
 * single pixel column and reads as a drawn border. The 600 px settings panel moves its rim's blue
 * channel by 25/255 over about three pixels at the same setting, which reads as a lit edge. So the
 * value is a property of the material, not of a particular control.
 */
export const GLASS_THIN_PANE_PX = 56;

/** The fringe for a pane of this thickness and tone, in CSS pixels. */
export const glassChromaticFringe = (isDaylight: boolean, paneThicknessPx: number): number => (
    (paneThicknessPx >= GLASS_THIN_PANE_PX ? 1 : 0) * (isDaylight ? GLASS_CHROMATIC_FRINGE.light : GLASS_CHROMATIC_FRINGE.dark)
);
