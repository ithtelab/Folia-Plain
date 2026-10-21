import { useEffect } from 'react';
import { useAppChromeStore } from '../../../stores/useAppChromeStore';
import { createTitlebarHover } from './titlebarHover';

// Keep high-frequency pointer movement out of React unless the titlebar visibility changes.
export const useTitlebarReveal = (enabled: boolean) => {
    useEffect(() => {
        const setVisible = useAppChromeStore.getState().setIsTitlebarRevealed;
        setVisible(false);
        if (!enabled) return;

        const hover = createTitlebarHover(setVisible);
        const move = (event: MouseEvent) => hover.move(event.clientY);
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseleave', hover.leave);
        window.addEventListener('blur', hover.leave);
        return () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseleave', hover.leave);
            window.removeEventListener('blur', hover.leave);
            hover.dispose();
        };
    }, [enabled]);
};
