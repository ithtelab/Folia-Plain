import { describe, expect, it } from 'vitest';
import { resolvePressOrigin } from '../../../src/components/shared/liquid-glass/glassPressOrigin';

// The ripple starts where the pointer is, never outside the card it has to spread from.
describe('glass press origin', () => {
    const rect = { left: 100, top: 50, width: 200, height: 100 };

    it('maps a pointer to its percentage position inside the host', () => {
        expect(resolvePressOrigin(rect, 200, 100)).toEqual({ x: 50, y: 50 });
        expect(resolvePressOrigin(rect, 100, 50)).toEqual({ x: 0, y: 0 });
        expect(resolvePressOrigin(rect, 300, 150)).toEqual({ x: 100, y: 100 });
    });

    it('clamps a press that lands on or past the edge', () => {
        expect(resolvePressOrigin(rect, 60, 20)).toEqual({ x: 0, y: 0 });
        expect(resolvePressOrigin(rect, 380, 260)).toEqual({ x: 100, y: 100 });
    });

    it('falls back to the middle before the card has been laid out', () => {
        expect(resolvePressOrigin({ left: 0, top: 0, width: 0, height: 0 }, 10, 10)).toEqual({ x: 50, y: 50 });
    });
});
