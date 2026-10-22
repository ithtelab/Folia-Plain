import { hasBlockingWindow, hasOpenSheet, isKeyCaptureTarget } from '../../../utils/keyboardTargets';

// Own a fullscreen session's Escape priority and one idle timer, without per-move React updates.
export const FULLSCREEN_CURSOR_IDLE_MS = 3000;
export function createFullscreenSession(root: HTMLElement, exitNative: () => Promise<unknown>) {
    const document = root.ownerDocument;
    let native = false;
    let dragging = false;
    let exiting = false;
    let disposed = false;
    let hidden = false;
    let lastActivity = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const fullscreen = () => native || Boolean(document.fullscreenElement);
    const blocked = () => hasBlockingWindow() || hasOpenSheet() || Boolean(document.querySelector('[role="listbox"], [role="menu"], [role="combobox"][aria-expanded="true"]'));
    const show = () => { if (hidden) { root.removeAttribute('data-fullscreen-cursor-hidden'); hidden = false; } };
    const clear = () => { clearTimeout(timer); timer = undefined; };
    const hide = () => {
        timer = undefined;
        if (disposed || !fullscreen() || document.hidden || dragging || blocked()) return;
        const remaining = FULLSCREEN_CURSOR_IDLE_MS - (performance.now() - lastActivity);
        if (remaining > 0) timer = setTimeout(hide, remaining);
        else { root.setAttribute('data-fullscreen-cursor-hidden', 'true'); hidden = true; }
    };
    const activity = () => {
        if (disposed) return;
        show();
        lastActivity = performance.now();
        if (!fullscreen() || document.hidden) clear();
        else if (!timer) timer = setTimeout(hide, FULLSCREEN_CURSOR_IDLE_MS);
    };
    return {
        sync(fullscreenNative: boolean) { native = fullscreenNative; activity(); },
        activity,
        suspend() { clear(); show(); },
        pointerDown() { dragging = true; activity(); },
        pointerUp() { dragging = false; activity(); },
        keydown(event: KeyboardEvent) {
            activity();
            if (event.key !== 'Escape' || event.repeat || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey
                || event.defaultPrevented || !fullscreen() || blocked() || isKeyCaptureTarget(event.target)) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            if (exiting) return;
            exiting = true;
            void Promise.resolve().then(() => document.fullscreenElement ? document.exitFullscreen() : exitNative())
                .catch(error => console.warn('[Fullscreen] Could not exit fullscreen', error))
                .finally(() => { exiting = false; });
        },
        dispose() { disposed = true; clear(); show(); },
    };
}
