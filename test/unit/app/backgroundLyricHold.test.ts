// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBackgroundLyricHold } from '@/components/app/backgroundThrottling/useBackgroundLyricHold';
import { isBackgroundLyricHeld } from '@/components/app/backgroundThrottling/backgroundLyricHoldStore';

// test/unit/app/backgroundLyricHold.test.ts
// When 后台节流 holds the lyric animation: only while the main process says the switch is in force,
// and only while the window is hidden or out of focus; focus coming back lets go at once.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let hasFocus: boolean;
let visibility: DocumentVisibilityState;
let pushActive: ((active: boolean) => void) | null;
let initialActive: boolean;
const unsubscribe = vi.fn();

const Probe = () => {
    useBackgroundLyricHold();
    return null;
};

const mount = async () => {
    await act(async () => root.render(createElement(Probe)));
};
const fire = (target: EventTarget, type: string) => {
    act(() => { target.dispatchEvent(new Event(type)); });
};

beforeEach(() => {
    hasFocus = true;
    visibility = 'visible';
    pushActive = null;
    initialActive = false;
    unsubscribe.mockClear();
    vi.spyOn(document, 'hasFocus').mockImplementation(() => hasFocus);
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
    window.electron = {
        getBackgroundThrottlingActive: () => Promise.resolve(initialActive),
        onBackgroundThrottlingChanged: (callback: (active: boolean) => void) => {
            pushActive = callback;
            return unsubscribe;
        },
    } as unknown as typeof window.electron;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(() => {
    act(() => root.unmount());
    container.remove();
    delete (window as { electron?: unknown }).electron;
    vi.restoreAllMocks();
});

describe('useBackgroundLyricHold', () => {
    it('never holds while the switch is not in force', async () => {
        await mount();
        hasFocus = false;
        fire(window, 'blur');
        expect(isBackgroundLyricHeld()).toBe(false);
    });

    it('holds out of focus and lets go when the focus comes back', async () => {
        initialActive = true;
        await mount();
        expect(isBackgroundLyricHeld()).toBe(false);

        hasFocus = false;
        fire(window, 'blur');
        expect(isBackgroundLyricHeld()).toBe(true);

        hasFocus = true;
        fire(window, 'focus');
        expect(isBackgroundLyricHeld()).toBe(false);
    });

    it('holds a hidden window even if it still reports the focus', async () => {
        initialActive = true;
        await mount();
        visibility = 'hidden';
        fire(document, 'visibilitychange');
        expect(isBackgroundLyricHeld()).toBe(true);
    });

    it('starts holding a window already in the background when the switch comes into force, and stops when it stands down', async () => {
        await mount();
        hasFocus = false;
        fire(window, 'blur');
        expect(isBackgroundLyricHeld()).toBe(false);

        act(() => pushActive?.(true));
        expect(isBackgroundLyricHeld()).toBe(true);

        act(() => pushActive?.(false));
        expect(isBackgroundLyricHeld()).toBe(false);
    });

    it('lets go and unsubscribes on unmount', async () => {
        initialActive = true;
        await mount();
        hasFocus = false;
        fire(window, 'blur');
        expect(isBackgroundLyricHeld()).toBe(true);

        act(() => root.unmount());
        root = createRoot(container);
        expect(isBackgroundLyricHeld()).toBe(false);
        expect(unsubscribe).toHaveBeenCalledTimes(1);
    });

    it('does nothing outside the desktop app', async () => {
        delete (window as { electron?: unknown }).electron;
        await mount();
        hasFocus = false;
        fire(window, 'blur');
        expect(isBackgroundLyricHeld()).toBe(false);
    });
});
