import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTitlebarHover, TITLEBAR_REVEAL_DELAY_MS } from '../../../src/components/app/titlebar/titlebarHover';

// Regression coverage for accidental reveals while crossing the home navigation.
describe('titlebar hover activation', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('does not reveal when moving across navigation or the lower titlebar', () => {
        const change = vi.fn();
        const hover = createTitlebarHover(change);
        for (const y of [80, 56, 48, 32, 20, 17]) hover.move(y);
        vi.advanceTimersByTime(1000);
        expect(change).not.toHaveBeenCalled();
        hover.dispose();
    });

    it('requires continuous dwell at the edge and cancels a brief crossing', () => {
        const change = vi.fn();
        const hover = createTitlebarHover(change);
        hover.move(4);
        vi.advanceTimersByTime(TITLEBAR_REVEAL_DELAY_MS - 1);
        hover.move(56);
        vi.advanceTimersByTime(1000);
        expect(change).not.toHaveBeenCalled();
        hover.move(8);
        vi.advanceTimersByTime(TITLEBAR_REVEAL_DELAY_MS);
        expect(change.mock.calls).toEqual([[true]]);
        hover.dispose();
    });

    it('keeps a revealed bar reachable without publishing every movement', () => {
        const change = vi.fn();
        const hover = createTitlebarHover(change);
        hover.move(1);
        vi.advanceTimersByTime(TITLEBAR_REVEAL_DELAY_MS);
        for (const y of [4, 16, 24, 32, 39, 40]) hover.move(y);
        expect(change.mock.calls).toEqual([[true]]);
        hover.move(56);
        expect(change.mock.calls).toEqual([[true], [false]]);
        hover.dispose();
    });

    it('does not restart the timer on each movement along the edge', () => {
        const change = vi.fn();
        const hover = createTitlebarHover(change);
        hover.move(1);
        vi.advanceTimersByTime(100);
        hover.move(6);
        vi.advanceTimersByTime(TITLEBAR_REVEAL_DELAY_MS - 100);
        expect(change.mock.calls).toEqual([[true]]);
        hover.dispose();
    });

    it.each(['leave', 'dispose'] as const)('cancels pending activation on %s', action => {
        const change = vi.fn();
        const hover = createTitlebarHover(change);
        hover.move(2);
        hover[action]();
        vi.advanceTimersByTime(1000);
        expect(change).not.toHaveBeenCalled();
    });

    it('clears visible state only once on leave and cleanup', () => {
        const change = vi.fn();
        const hover = createTitlebarHover(change);
        hover.move(2);
        vi.advanceTimersByTime(TITLEBAR_REVEAL_DELAY_MS);
        hover.leave();
        hover.dispose();
        expect(change.mock.calls).toEqual([[true], [false]]);
    });
});
