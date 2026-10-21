import React, { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { createGlassLensMap } from './liquidGlassOptics';
import './liquidGlass.css';
import { useLiquidGlassMotion } from './useLiquidGlassMotion';
import { useReducedMotionFor } from '../../../hooks/useReducedMotionFor';

// Decorative material only: the host keeps its own layout, controls, hit area and semantics.
const LiquidGlassFlow = lazy(() => import('./LiquidGlassFlow'));

interface LiquidGlassSurfaceProps {
    isDaylight?: boolean;
    radius?: number;
    /** Hidden surfaces release the optical layer rather than continuing to filter offscreen. */
    active?: boolean;
    interactive?: boolean;
    /** Ambient flow is reserved for primary navigation and playback controls. */
    flow?: 'ambient' | 'interactive';
}

interface LensGeometry {
    width: number;
    height: number;
    image: string;
}

export default function LiquidGlassSurface({ isDaylight = false, radius = 999, active = true, interactive = true, flow = 'interactive' }: LiquidGlassSurfaceProps) {
    const rootRef = useRef<HTMLSpanElement>(null);
    const filterRef = useRef<SVGFilterElement>(null);
    const imageRef = useRef<SVGFEImageElement>(null);
    const displacementRef = useRef<SVGFEDisplacementMapElement>(null);
    const normalOffsetRef = useRef<SVGFEOffsetElement>(null);
    const id = `glass-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const [lens, setLens] = useState<LensGeometry | null>(null);
    const [flowAllowed, setFlowAllowed] = useState(false);
    const reducedUiMotion = useReducedMotionFor('uiMicroMotion');
    useLiquidGlassMotion(rootRef, displacementRef, normalOffsetRef, active && interactive);

    useEffect(() => {
        const root = rootRef.current;
        if (!root || !active) return;
        // SVG backdrop filters are verified in Chromium (including Electron); other engines keep
        // the ordinary CSS frost instead of losing the entire backdrop to an unsupported URL filter.
        if (!/(?:Chrome|Chromium|Edg)\//.test(navigator.userAgent)) return;
        const reduced = window.matchMedia('(prefers-reduced-transparency: reduce), (prefers-contrast: more), (forced-colors: active)');
        let timer: number | undefined;
        let previous = '';
        const update = () => {
            window.clearTimeout(timer);
            const allowed = !reduced.matches && !document.hidden;
            setFlowAllowed(current => current === allowed ? current : allowed);
            if (reduced.matches || document.hidden) {
                setLens(current => current === null ? current : null);
                previous = '';
                return;
            }
            // Wait for resizing to settle. No RAF, pointer tracking, polling, or per-frame React state.
            timer = window.setTimeout(() => {
                const width = Math.round(root.clientWidth);
                const height = Math.round(root.clientHeight);
                if (width < 2 || height < 2) return;
                const key = `${width}:${height}:${radius}`;
                if (key === previous) return;
                const map = createGlassLensMap(width, height, radius);
                const canvas = document.createElement('canvas');
                canvas.width = map.width;
                canvas.height = map.height;
                const context = canvas.getContext('2d');
                if (!context) return;
                const image = context.createImageData(map.width, map.height);
                image.data.set(map.pixels);
                context.putImageData(image, 0, 0);
                setLens({ width, height, image: canvas.toDataURL() });
                previous = key;
            }, 100);
        };
        const observer = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            // Stretch the existing map during layout animation; regenerate it only after settling.
            // Otherwise the previous pixel-sized filter clips the newly expanded half of the bar.
            for (const node of [filterRef.current, imageRef.current]) {
                node?.setAttribute('width', String(width));
                node?.setAttribute('height', String(height));
            }
            update();
        });
        observer.observe(root);
        reduced.addEventListener('change', update);
        document.addEventListener('visibilitychange', update);
        update();
        return () => {
            window.clearTimeout(timer);
            observer.disconnect();
            reduced.removeEventListener('change', update);
            document.removeEventListener('visibilitychange', update);
        };
    }, [active, radius]);

    const enhanced = active && lens !== null;
    // Compress extreme backdrops locally so a white cover cannot wash out dark-mode labels,
    // and a black cover cannot erase light-mode labels. Artwork elsewhere stays untouched.
    const toneCurve = isDaylight ? '0.48 0.56 0.7 0.85 1' : '0 0.24 0.43 0.49 0.5';
    return (
        <span ref={rootRef} aria-hidden="true" className="liquid-glass-surface"
            data-glass-tone={isDaylight ? 'light' : 'dark'} data-glass-active={active}
            data-glass-optics={enhanced ? 'lens' : 'frost'}>
            {enhanced && <svg className="liquid-glass-definitions" width="0" height="0" focusable="false">
                <defs>
                    <filter ref={filterRef} id={id} x="0" y="0" width={lens.width} height={lens.height}
                        filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="frost" />
                        <feImage ref={imageRef} href={lens.image} x="0" y="0" width={lens.width} height={lens.height}
                            preserveAspectRatio="none" result="normals" />
                        <feOffset ref={normalOffsetRef} in="normals" dx="0" dy="0" result="movingNormals" />
                        <feDisplacementMap ref={displacementRef} in="SourceGraphic" in2="movingNormals" scale="16"
                            xChannelSelector="R" yChannelSelector="G" result="bent" />
                        <feColorMatrix in="normals" type="matrix"
                            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 1 0 0" result="rim" />
                        <feComposite in="bent" in2="rim" operator="in" result="edge" />
                        <feComposite in="frost" in2="rim" operator="out" result="centre" />
                        <feComposite in="centre" in2="edge" operator="arithmetic"
                            k1="0" k2="1" k3="1" k4="0" result="glass" />
                        <feComponentTransfer in="glass">
                            <feFuncR type="table" tableValues={toneCurve} />
                            <feFuncG type="table" tableValues={toneCurve} />
                            <feFuncB type="table" tableValues={toneCurve} />
                        </feComponentTransfer>
                    </filter>
                </defs>
            </svg>}
            <span className="liquid-glass-backdrop" style={enhanced ? {
                backdropFilter: `url("#${id}")`,
                WebkitBackdropFilter: `url("#${id}")`,
            } : undefined} />
            <span className="liquid-glass-tint" />
            <span className="liquid-glass-rim" />
            {active && interactive && flowAllowed && !reducedUiMotion && <Suspense fallback={null}><LiquidGlassFlow mode={flow} /></Suspense>}
            <span className="liquid-glass-sheen" />
            <span className="liquid-glass-glow" />
        </span>
    );
}
