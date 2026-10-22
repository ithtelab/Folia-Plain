import { useEffect } from 'react';
import { useBackgroundLyricHoldStore } from './backgroundLyricHoldStore';

// src/components/app/backgroundThrottling/useBackgroundLyricHold.ts
// Holds the lyric animation while 后台节流 is in force and the window is in the background. The main
// process says whether the switch is in force (electron/backgroundThrottling.cjs: on, and not
// standing down); the focus is read here from the page's own events, so a click that brings the
// window back lands on lyrics that have already caught up instead of an IPC round trip later.

/** In the background: hidden (minimised, in the tray, covered), or another app has the focus. */
export const isWindowInBackground = (doc: Pick<Document, 'visibilityState' | 'hasFocus'>) => (
    doc.visibilityState === 'hidden' || !doc.hasFocus()
);

export const useBackgroundLyricHold = () => {
    useEffect(() => {
        const electron = window.electron;
        if (!electron?.getBackgroundThrottlingActive) {
            return;
        }
        let active = false;
        let disposed = false;
        const sync = () => {
            const held = active && isWindowInBackground(document);
            if (useBackgroundLyricHoldStore.getState().held !== held) {
                useBackgroundLyricHoldStore.setState({ held });
            }
        };

        const unsubscribe = electron.onBackgroundThrottlingChanged?.((next) => {
            active = next;
            sync();
        });
        electron.getBackgroundThrottlingActive()
            .then((next) => {
                if (disposed) return;
                active = next;
                sync();
            })
            .catch(error => console.warn('[BackgroundThrottling] Reading the switch failed', error));
        window.addEventListener('focus', sync);
        window.addEventListener('blur', sync);
        document.addEventListener('visibilitychange', sync);

        return () => {
            disposed = true;
            unsubscribe?.();
            window.removeEventListener('focus', sync);
            window.removeEventListener('blur', sync);
            document.removeEventListener('visibilitychange', sync);
            useBackgroundLyricHoldStore.setState({ held: false });
        };
    }, []);
};
