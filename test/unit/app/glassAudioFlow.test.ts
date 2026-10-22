import { describe, expect, it } from 'vitest';
import {
    resolveGlassFlowSeed,
    stepGlassAudioFrame,
    type GlassAudioFrame,
} from '../../../src/components/shared/liquid-glass/glassAudioFlow';

// Keep musical response bounded and ensure nearby glass hosts do not all point the same way.
describe('audio-driven liquid glass flow', () => {
    const silent: GlassAudioFrame = { time: 0, power: 0, bass: 0, mid: 0, treble: 0, beat: 0 };

    it('turns a low-frequency attack into a bounded beat and then decays it', () => {
        const hit = stepGlassAudioFrame(silent, { power: 0.8, bass: 0.9, mid: 0.3, treble: 0.2 }, 1 / 30);
        expect(hit.beat).toBeGreaterThan(0.5);
        expect(hit.bass).toBeGreaterThan(0);
        expect(hit.bass).toBeLessThanOrEqual(1);

        let quiet = hit;
        for (let index = 0; index < 30; index += 1) {
            quiet = stepGlassAudioFrame(quiet, { power: 0, bass: 0, mid: 0, treble: 0 }, 1 / 30);
        }
        expect(quiet.beat).toBeLessThan(0.01);
        expect(quiet.bass).toBeLessThan(0.01);
    });

    it('gives deterministically different directions to hosts in different places', () => {
        const left = resolveGlassFlowSeed({ left: 20, top: 40, width: 200, height: 60 }, 0);
        const right = resolveGlassFlowSeed({ left: 900, top: 640, width: 360, height: 80 }, 1);
        expect(left.angle).not.toBeCloseTo(right.angle, 2);
        expect(left.phase).not.toBeCloseTo(right.phase, 2);
        expect(resolveGlassFlowSeed({ left: 20, top: 40, width: 200, height: 60 }, 0)).toEqual(left);
    });
});
