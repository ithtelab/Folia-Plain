import { describe, expect, it } from 'vitest';
import { advanceGlassSpring } from '../../../src/components/shared/liquid-glass/glassSpring';

// Verify convergence and slow-frame stability rather than mirroring the spring's integration.
describe('liquid glass spring', () => {
    it('converges exactly so the material can stop requesting frames', () => {
        const spring = { value: 0, velocity: 0 };
        let moving = true;
        let frames = 0;
        while (moving && frames++ < 180) moving = advanceGlassSpring(spring, 1, 1 / 60);
        expect(moving).toBe(false);
        expect(spring).toEqual({ value: 1, velocity: 0 });
    });

    it('settles a release impulse back to the undistorted material', () => {
        const spring = { value: 0, velocity: 5 };
        let peak = 0;
        for (let i = 0; i < 180; i++) {
            advanceGlassSpring(spring, 0, 1 / 60);
            peak = Math.max(peak, spring.value);
        }
        expect(peak).toBeGreaterThan(0.05);
        expect(peak).toBeLessThan(0.5);
        expect(spring).toEqual({ value: 0, velocity: 0 });
    });

    it('remains bounded after delayed frames and a reversed pointer target', () => {
        const spring = { value: 1, velocity: 0 };
        for (let i = 0; i < 180; i++) {
            advanceGlassSpring(spring, -1, i % 5 === 0 ? 2 : 1 / 60);
            expect(Number.isFinite(spring.value)).toBe(true);
            expect(Math.abs(spring.value)).toBeLessThan(1.5);
        }
        expect(spring).toEqual({ value: -1, velocity: 0 });
    });

    it('does not move an idle spring or allocate time to a negative interval', () => {
        const idle = { value: 0, velocity: 0 };
        expect(advanceGlassSpring(idle, 0, 1 / 60)).toBe(false);
        advanceGlassSpring(idle, 1, -1);
        expect(idle).toEqual({ value: 0, velocity: 0 });
    });
});
