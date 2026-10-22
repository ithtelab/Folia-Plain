import { useEffect, useRef, useState } from 'react';

// src/components/app/presentation/useHomeReveal.ts
// When Home's layer starts fading in. Returning to Home remounts the entire library surface in one
// long commit; the fade must not begin before that commit has painted, or the first frame with
// content lands at whatever opacity the fade already reached and the page appears to jump in.
// A hidden layer is reported at once; a reveal waits for two animation frames (one to commit, one
// to paint) and only then starts the transition. `instant` keeps the cases that must not fade at
// all - a wall still over the layer - on the same frame as the view change.

export type HomeRevealState = 'hidden' | 'shown';

export const useHomeReveal = (visible: boolean, instant: boolean): HomeRevealState => {
    const [state, setState] = useState<HomeRevealState>(visible ? 'shown' : 'hidden');
    const frameRef = useRef(0);

    useEffect(() => {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
        if (!visible) {
            setState('hidden');
            return undefined;
        }
        if (instant) {
            setState('shown');
            return undefined;
        }
        let inner = 0;
        const outer = requestAnimationFrame(() => {
            inner = requestAnimationFrame(() => setState('shown'));
        });
        frameRef.current = outer;
        return () => {
            cancelAnimationFrame(outer);
            cancelAnimationFrame(inner);
        };
    }, [visible, instant]);

    return state;
};
