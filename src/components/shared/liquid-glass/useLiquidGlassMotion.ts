import { useEffect, type RefObject } from 'react';
import { useReducedMotionFor } from '../../../hooks/useReducedMotionFor';
import { advanceGlassSpring, type GlassSpring } from './glassSpring';

// Transient material-only motion: never move the host, its text, or its pointer hit area.
export function useLiquidGlassMotion(
    rootRef: RefObject<HTMLSpanElement | null>,
    displacementRef: RefObject<SVGFEDisplacementMapElement | null>,
    normalOffsetRef: RefObject<SVGFEOffsetElement | null>,
    active: boolean,
) {
    const reduced = useReducedMotionFor('uiMicroMotion');
    useEffect(() => {
        const root = rootRef.current;
        const host = root?.parentElement;
        if (!root || !host || !active || reduced || typeof window.matchMedia !== 'function' || typeof ResizeObserver === 'undefined') return;
        const blocked = window.matchMedia('(prefers-reduced-transparency: reduce), (prefers-contrast: more), (forced-colors: active)');
        const abort = new AbortController();
        const options = { passive: true, signal: abort.signal };
        const x: GlassSpring = { value: 0, velocity: 0 };
        const y: GlassSpring = { value: 0, velocity: 0 };
        const energy: GlassSpring = { value: 0, velocity: 0 };
        const pressure: GlassSpring = { value: 0, velocity: 0 };
        const wave: GlassSpring = { value: 0, velocity: 0 };
        let targetX = 0;
        let targetY = 0;
        let targetEnergy = 0;
        let targetPressure = 0;
        let hovered = false;
        let focused = false;
        let frame: number | null = null;
        let lastTime = 0;
        let bounds = host.getBoundingClientRect();
        let dirtyBounds = false;
        let previousWidth = root.clientWidth;
        let previousHeight = root.clientHeight;
        const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
        const allowed = () => !document.hidden && !blocked.matches && root.isConnected;

        const paint = () => {
            const e = clamp(energy.value, 0, 1.1);
            const p = clamp(pressure.value, -0.2, 1.1);
            const w = clamp(wave.value, -0.5, 0.5);
            const sx = 1 + e * 0.006 - p * 0.018 + w * 0.055;
            const sy = 1 + e * 0.026 - p * 0.11 - w * 0.035;
            root.style.transform = `translate(${(x.value * e * 1.2).toFixed(3)}px, ${(y.value * e * 0.8).toFixed(3)}px) scale(${sx.toFixed(5)}, ${sy.toFixed(5)})`;
            root.style.setProperty('--glass-pointer-x', `${(50 + x.value * 48).toFixed(2)}%`);
            root.style.setProperty('--glass-pointer-y', `${(50 + y.value * 48).toFixed(2)}%`);
            root.style.setProperty('--glass-energy', clamp(e * 0.85 + p * 0.25 + Math.abs(w), 0, 1).toFixed(4));
            displacementRef.current?.setAttribute('scale', (16 + e * 9 + p * 12 + Math.abs(w) * 14).toFixed(3));
            normalOffsetRef.current?.setAttribute('dx', (x.value * e * 1.2).toFixed(3));
            normalOffsetRef.current?.setAttribute('dy', (y.value * e * 1.2).toFixed(3));
        };

        const tick = (time: number) => {
            frame = null;
            if (!allowed()) { reset(); return; }
            const elapsed = lastTime ? (time - lastTime) / 1000 : 1 / 60;
            lastTime = time;
            // Evaluate every spring; short-circuiting would freeze the later channels.
            const movingX = advanceGlassSpring(x, targetX, elapsed);
            const movingY = advanceGlassSpring(y, targetY, elapsed);
            const movingEnergy = advanceGlassSpring(energy, targetEnergy, elapsed);
            const movingPressure = advanceGlassSpring(pressure, targetPressure, elapsed);
            const movingWave = advanceGlassSpring(wave, 0, elapsed);
            paint();
            if (movingX || movingY || movingEnergy || movingPressure || movingWave) {
                frame = requestAnimationFrame(tick);
            } else {
                if (!targetEnergy && !targetPressure) root.style.removeProperty('transform');
                root.dataset.glassMotion = 'settled';
            }
        };
        const wake = () => {
            if (frame !== null || !allowed()) return;
            lastTime = 0;
            root.dataset.glassMotion = 'moving';
            frame = requestAnimationFrame(tick);
        };
        const reset = () => {
            if (frame !== null) cancelAnimationFrame(frame);
            frame = null;
            lastTime = 0;
            targetX = targetY = targetEnergy = targetPressure = 0;
            hovered = focused = false;
            for (const spring of [x, y, energy, pressure, wave]) { spring.value = 0; spring.velocity = 0; }
            paint();
            root.style.removeProperty('transform');
            root.dataset.glassMotion = 'settled';
        };
        const point = (event: PointerEvent) => {
            if (dirtyBounds) { bounds = host.getBoundingClientRect(); dirtyBounds = false; }
            if (!bounds.width || !bounds.height) return;
            const nextX = clamp((event.clientX - bounds.left) / bounds.width * 2 - 1, -1, 1);
            const nextY = clamp((event.clientY - bounds.top) / bounds.height * 2 - 1, -1, 1);
            const changed = nextX !== targetX || nextY !== targetY;
            targetX = nextX;
            targetY = nextY;
            return changed;
        };
        const release = () => {
            const nextEnergy = hovered ? 1 : focused ? 0.45 : 0;
            if (!targetPressure && targetEnergy === nextEnergy) return;
            if (targetPressure > 0) wave.velocity = clamp(wave.velocity + 2.8, -5, 5);
            targetPressure = 0;
            targetEnergy = nextEnergy;
            wake();
        };
        const enter = (event: PointerEvent) => {
            if (event.pointerType === 'touch') return;
            hovered = true;
            bounds = host.getBoundingClientRect();
            point(event);
            targetEnergy = 1;
            wake();
        };
        const move = (event: PointerEvent) => {
            if (!hovered && !targetPressure) return;
            if (point(event)) wake();
        };
        const leave = () => {
            hovered = false;
            targetX = targetY = 0;
            release();
        };
        const down = (event: PointerEvent) => {
            if (event.button !== 0 || (event.target instanceof Element && event.target.closest(':disabled, [aria-disabled="true"]'))) return;
            bounds = host.getBoundingClientRect();
            point(event);
            targetPressure = 1;
            targetEnergy = 1;
            wake();
        };
        const focus = () => { focused = true; targetEnergy = hovered ? 1 : 0.45; wake(); };
        const focusOut = (event: FocusEvent) => {
            if (event.relatedTarget instanceof Node && host.contains(event.relatedTarget)) return;
            focused = false;
            release();
        };
        const keyDown = (event: KeyboardEvent) => {
            if (event.repeat || event.isComposing || ![' ', 'Enter'].includes(event.key)) return;
            if (!(event.target instanceof Element) || !event.target.closest('button, [role="button"]')) return;
            targetPressure = 0.85;
            targetEnergy = 1;
            wake();
        };
        const keyUp = (event: KeyboardEvent) => { if ([' ', 'Enter'].includes(event.key)) release(); };
        const invalidateBounds = () => { dirtyBounds = true; };
        const restore = () => {
            if (!allowed()) return;
            hovered = host.matches(':hover');
            focused = host.contains(document.activeElement);
            targetEnergy = hovered ? 1 : focused ? 0.45 : 0;
            dirtyBounds = true;
            if (targetEnergy) wake();
        };
        const visibility = () => { if (!allowed()) reset(); else restore(); };
        const observer = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            if (width > 0 && height > 0 && previousWidth > 0 && previousHeight > 0) {
                const change = (width - previousWidth) / previousWidth + (height - previousHeight) / previousHeight;
                if (Math.abs(change) > 0.015) {
                    wave.velocity = clamp(wave.velocity + change * 5, -5, 5);
                    wake();
                }
            }
            previousWidth = width;
            previousHeight = height;
            dirtyBounds = true;
        });
        observer.observe(root);
        host.addEventListener('pointerenter', enter, options);
        host.addEventListener('pointermove', move, options);
        host.addEventListener('pointerleave', leave, options);
        host.addEventListener('pointerdown', down, { ...options, capture: true });
        host.addEventListener('pointercancel', leave, options);
        host.addEventListener('focusin', focus, options);
        host.addEventListener('focusout', focusOut, options);
        host.addEventListener('keydown', keyDown, options);
        host.addEventListener('keyup', keyUp, options);
        window.addEventListener('pointerup', release, options);
        window.addEventListener('blur', reset, options);
        window.addEventListener('focus', restore, options);
        window.addEventListener('resize', invalidateBounds, options);
        window.addEventListener('scroll', invalidateBounds, { ...options, capture: true });
        document.addEventListener('visibilitychange', visibility, options);
        blocked.addEventListener('change', visibility);
        root.dataset.glassMotion = 'settled';
        restore();
        return () => {
            abort.abort();
            observer.disconnect();
            blocked.removeEventListener('change', visibility);
            reset();
            delete root.dataset.glassMotion;
        };
    }, [active, reduced, rootRef, displacementRef, normalOffsetRef]);
}
