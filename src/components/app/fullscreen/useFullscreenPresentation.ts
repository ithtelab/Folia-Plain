import { useEffect, type RefObject } from 'react';
import { createFullscreenSession } from './fullscreenSession';
import './fullscreen.css';

// Electron's native fullscreen has no document.fullscreenElement; subscribe to its preload events too.
export function useFullscreenPresentation(rootRef: RefObject<HTMLElement | null>) {
    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        let native = false;
        let received = false;
        let disposed = false;
        const session = createFullscreenSession(root, async () => {
            if (window.electron?.exitFullscreenWindow) await window.electron.exitFullscreenWindow();
            else if (await window.electron?.isWindowFullscreen?.()) await window.electron?.toggleFullscreenWindow?.();
        });
        const unsubscribe = window.electron?.onWindowFullscreenChanged?.(fullscreen => {
            received = true;
            native = fullscreen;
            session.sync(native);
        });
        void window.electron?.isWindowFullscreen?.().then(fullscreen => {
            if (disposed || received) return;
            native = fullscreen;
            session.sync(native);
        }).catch(error => console.warn('[Fullscreen] Could not read fullscreen state', error));
        const sync = () => session.sync(native);
        window.addEventListener('keydown', session.keydown, true);
        window.addEventListener('pointermove', session.activity, { passive: true });
        window.addEventListener('pointerdown', session.pointerDown, { passive: true });
        window.addEventListener('pointerup', session.pointerUp, { passive: true });
        window.addEventListener('pointercancel', session.pointerUp, { passive: true });
        window.addEventListener('blur', session.suspend);
        window.addEventListener('focus', session.activity);
        document.addEventListener('fullscreenchange', sync);
        document.addEventListener('visibilitychange', session.activity);
        sync();
        return () => {
            disposed = true;
            unsubscribe?.();
            session.dispose();
            window.removeEventListener('keydown', session.keydown, true);
            window.removeEventListener('pointermove', session.activity);
            window.removeEventListener('pointerdown', session.pointerDown);
            window.removeEventListener('pointerup', session.pointerUp);
            window.removeEventListener('pointercancel', session.pointerUp);
            window.removeEventListener('blur', session.suspend);
            window.removeEventListener('focus', session.activity);
            document.removeEventListener('fullscreenchange', sync);
            document.removeEventListener('visibilitychange', session.activity);
        };
    }, [rootRef]);
}
