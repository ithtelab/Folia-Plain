import { createRequire } from 'module';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// test/unit/electron/backgroundThrottling.test.ts
// The 后台节流 switch in the main process: the main window is throttled only while the switch is on
// and nothing needs the window live, and the renderer hears of every change exactly once.
const require = createRequire(import.meta.url);
const { createBackgroundThrottling } = require('../../../electron/backgroundThrottling.cjs') as {
    createBackgroundThrottling: (deps: {
        isEnabled: () => boolean;
        getStandDownReason: () => string | null;
    }) => { attach: (win: unknown) => void; refresh: () => void; isActive: () => boolean };
};

const createWindow = () => {
    const win = {
        destroyed: false,
        isDestroyed: () => win.destroyed,
        webContents: {
            setBackgroundThrottling: vi.fn(),
            send: vi.fn(),
        },
    };
    return win;
};

describe('backgroundThrottling', () => {
    let enabled: boolean;
    let reason: string | null;
    const create = () => createBackgroundThrottling({ isEnabled: () => enabled, getStandDownReason: () => reason });

    beforeEach(() => {
        enabled = false;
        reason = null;
        vi.spyOn(console, 'info').mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('leaves a new window unthrottled while the switch is off', () => {
        const throttling = create();
        const win = createWindow();
        throttling.attach(win);

        expect(throttling.isActive()).toBe(false);
        expect(win.webContents.setBackgroundThrottling).not.toHaveBeenCalled();
        expect(win.webContents.send).not.toHaveBeenCalled();
    });

    it('throttles the window and tells the renderer when switched on, and undoes both when switched off', () => {
        const throttling = create();
        const win = createWindow();
        throttling.attach(win);

        enabled = true;
        throttling.refresh();
        throttling.refresh();
        expect(throttling.isActive()).toBe(true);
        expect(win.webContents.setBackgroundThrottling).toHaveBeenCalledTimes(1);
        expect(win.webContents.setBackgroundThrottling).toHaveBeenLastCalledWith(true);
        expect(win.webContents.send).toHaveBeenCalledTimes(1);
        expect(win.webContents.send).toHaveBeenLastCalledWith('background-throttling-changed', true);

        enabled = false;
        throttling.refresh();
        expect(throttling.isActive()).toBe(false);
        expect(win.webContents.setBackgroundThrottling).toHaveBeenLastCalledWith(false);
        expect(win.webContents.send).toHaveBeenLastCalledWith('background-throttling-changed', false);
    });

    it('stands down while something needs the window live, and comes back after', () => {
        enabled = true;
        const throttling = create();
        const win = createWindow();
        throttling.attach(win);
        expect(throttling.isActive()).toBe(true);

        reason = 'video export';
        throttling.refresh();
        expect(throttling.isActive()).toBe(false);
        expect(win.webContents.setBackgroundThrottling).toHaveBeenLastCalledWith(false);

        // Another reason in place of the first changes nothing the window or the renderer can see.
        reason = 'OBS browser source';
        throttling.refresh();
        expect(win.webContents.setBackgroundThrottling).toHaveBeenCalledTimes(2);
        expect(win.webContents.send).toHaveBeenCalledTimes(2);

        reason = null;
        throttling.refresh();
        expect(throttling.isActive()).toBe(true);
        expect(win.webContents.setBackgroundThrottling).toHaveBeenLastCalledWith(true);
    });

    it('starts a rebuilt window from scratch and ignores a destroyed one', () => {
        enabled = true;
        const throttling = create();
        const first = createWindow();
        throttling.attach(first);

        // A window built in wallpaper mode starts standing down and is never throttled.
        reason = 'wallpaper mode';
        const second = createWindow();
        throttling.attach(second);
        expect(throttling.isActive()).toBe(false);
        expect(second.webContents.setBackgroundThrottling).not.toHaveBeenCalled();

        second.destroyed = true;
        reason = null;
        throttling.refresh();
        expect(second.webContents.setBackgroundThrottling).not.toHaveBeenCalled();
        expect(first.webContents.setBackgroundThrottling).toHaveBeenCalledTimes(1);
    });
});
