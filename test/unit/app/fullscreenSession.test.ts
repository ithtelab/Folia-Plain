// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFullscreenSession, FULLSCREEN_CURSOR_IDLE_MS } from '../../../src/components/app/fullscreen/fullscreenSession';

// Fullscreen uses native state as well as the DOM API; Escape must not also navigate the page.
let session: ReturnType<typeof createFullscreenSession>;
let root: HTMLDivElement;
let exit = vi.fn(async () => false);
beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
    root = document.createElement('div');
    document.body.append(root);
    exit = vi.fn(async () => false);
    session = createFullscreenSession(root, exit);
});
afterEach(() => { session.dispose(); document.body.replaceChildren(); vi.useRealTimers(); });
describe('fullscreen Escape and cursor', () => {
    it('exits native fullscreen even though the DOM fullscreen element is absent', async () => {
        session.sync(true);
        const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
        session.keydown(event);
        await Promise.resolve();
        expect(event.defaultPrevented).toBe(true);
        expect(exit).toHaveBeenCalledOnce();
    });
    it('lets a modal keep Escape and avoids hiding its pointer', async () => {
        const modal = document.createElement('div'); modal.dataset.foliaKeyboardWindow = 'true'; document.body.append(modal);
        session.sync(true);
        const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
        session.keydown(event);
        vi.advanceTimersByTime(FULLSCREEN_CURSOR_IDLE_MS);
        await Promise.resolve();
        expect(event.defaultPrevented).toBe(false);
        expect(exit).not.toHaveBeenCalled();
        expect(root.hasAttribute('data-fullscreen-cursor-hidden')).toBe(false);
    });
    it('hides after idle and restores immediately on activity', () => {
        session.sync(true);
        vi.advanceTimersByTime(FULLSCREEN_CURSOR_IDLE_MS);
        expect(root.dataset.fullscreenCursorHidden).toBe('true');
        session.activity();
        expect(root.hasAttribute('data-fullscreen-cursor-hidden')).toBe(false);
    });
    it('keeps one idle timer while pointer activity postpones hiding', () => {
        session.sync(true);
        vi.advanceTimersByTime(2000);
        for (let n = 0; n < 100; n++) session.activity();
        expect(vi.getTimerCount()).toBe(1);
        vi.advanceTimersByTime(2000);
        expect(root.hasAttribute('data-fullscreen-cursor-hidden')).toBe(false);
        vi.advanceTimersByTime(1000);
        expect(root.dataset.fullscreenCursorHidden).toBe('true');
    });
    it('does not hide during pointer dragging', () => {
        session.sync(true); session.pointerDown();
        vi.advanceTimersByTime(FULLSCREEN_CURSOR_IDLE_MS);
        expect(root.hasAttribute('data-fullscreen-cursor-hidden')).toBe(false);
        session.pointerUp();
        vi.advanceTimersByTime(FULLSCREEN_CURSOR_IDLE_MS);
        expect(root.dataset.fullscreenCursorHidden).toBe('true');
    });
    it('restores the cursor and removes its timer on leaving fullscreen', () => {
        session.sync(true); vi.advanceTimersByTime(FULLSCREEN_CURSOR_IDLE_MS);
        session.sync(false);
        expect(root.hasAttribute('data-fullscreen-cursor-hidden')).toBe(false);
        expect(vi.getTimerCount()).toBe(0);
    });
    it('does not consume Escape outside fullscreen or on repeats', async () => {
        session.keydown(new KeyboardEvent('keydown', { key: 'Escape' }));
        session.sync(true);
        session.keydown(new KeyboardEvent('keydown', { key: 'Escape', repeat: true }));
        await Promise.resolve();
        expect(exit).not.toHaveBeenCalled();
    });
});
