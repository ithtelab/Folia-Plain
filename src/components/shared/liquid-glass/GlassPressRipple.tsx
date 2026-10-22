import React, { useEffect, useRef } from 'react';
import { resolvePressOrigin } from './glassPressOrigin';

// src/components/shared/liquid-glass/GlassPressRipple.tsx
// The liquid a glass card gives back when pressed: two blurred, irregular lobes leave the pointer
// and spread past the card's own edge before fading. DOM-only (one attribute toggle per press),
// so the press never re-renders the card it sits in.

export default function GlassPressRipple({ enabled = true }: { enabled?: boolean }) {
    const layerRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const layer = layerRef.current;
        const host = layer?.parentElement;
        if (!layer || !host || !enabled) return;
        let releaseTimer = 0;
        const release = () => {
            window.clearTimeout(releaseTimer);
            host.removeAttribute('data-liquid-card-press');
        };
        const down = (event: PointerEvent) => {
            if (event.button !== 0) return;
            if (event.target instanceof Element && event.target.closest(':disabled, [aria-disabled="true"]')) return;
            const origin = resolvePressOrigin(host.getBoundingClientRect(), event.clientX, event.clientY);
            layer.style.setProperty('--glass-press-x', `${origin.x.toFixed(2)}%`);
            layer.style.setProperty('--glass-press-y', `${origin.y.toFixed(2)}%`);
            // Drop the attribute and force one reflow: a second press while the first ripple is
            // still running has to restart both waves from the new point, not resume the old run.
            host.removeAttribute('data-liquid-card-press');
            void layer.offsetWidth;
            host.setAttribute('data-liquid-card-press', '');
            // Fallback for a hidden wave (reduced motion hides them, so no animationend arrives).
            window.clearTimeout(releaseTimer);
            releaseTimer = window.setTimeout(release, 900);
        };
        const animationEnd = (event: AnimationEvent) => {
            if (event.target instanceof Element && event.target.classList.contains('is-secondary')) release();
        };
        host.addEventListener('pointerdown', down, { passive: true });
        layer.addEventListener('animationend', animationEnd);
        return () => {
            window.clearTimeout(releaseTimer);
            host.removeEventListener('pointerdown', down);
            layer.removeEventListener('animationend', animationEnd);
            host.removeAttribute('data-liquid-card-press');
        };
    }, [enabled]);

    return (
        <span ref={layerRef} className="liquid-card-fluid" aria-hidden="true">
            <span className="liquid-card-fluid-wave" />
            <span className="liquid-card-fluid-wave is-secondary" />
        </span>
    );
}
