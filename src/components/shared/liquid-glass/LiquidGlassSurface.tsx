import React, { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { acquireGlassLensImage, releaseGlassLensImage } from './glassLensImages';
import './liquidGlass.css';
import { useLiquidGlassMotion } from './useLiquidGlassMotion';
import { useReducedMotionFor } from '../../../hooks/useReducedMotionFor';
import { useGlassSettingsStore } from '../../../stores/useGlassSettingsStore';

// Decorative material only: the host keeps its own layout, controls, hit area and semantics.
const LiquidGlassFlow = lazy(() => import('./LiquidGlassFlow'));

interface LiquidGlassSurfaceProps {
    isDaylight?: boolean;
    radius?: number;
    /** Hidden surfaces release the optical layer rather than continuing to filter offscreen. */
    active?: boolean;
    interactive?: boolean;
    /** Ambient flow is reserved for primary navigation; the bottom player disables interaction entirely. */
    flow?: 'ambient' | 'interactive' | 'static' | 'none';
    legacy?: 'control' | 'navigation' | 'search' | 'player-expanded' | 'player-collapsed' | 'card' | 'toast' | 'login' | 'provider' | 'surface';
}

interface LensGeometry {
    width: number;
    height: number;
    image: string;
}

export default function LiquidGlassSurface({ isDaylight = false, radius = 999, active = true, interactive = true, flow = 'interactive', legacy = 'control' }: LiquidGlassSurfaceProps) {
    const enabled = useGlassSettingsStore(state => state.liquidGlassEnabled);
    const rootRef = useRef<HTMLSpanElement>(null);
    const filterRef = useRef<SVGFilterElement>(null);
    const imageRef = useRef<SVGFEImageElement>(null);
    const displacementRef = useRef<SVGFEDisplacementMapElement>(null);
    const normalOffsetRef = useRef<SVGFEOffsetElement>(null);
    const id = `glass-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const [lens, setLens] = useState<LensGeometry | null>(null);
    const [flowAllowed, setFlowAllowed] = useState(false);
    const reducedUiMotion = useReducedMotionFor('uiMicroMotion');
    useLiquidGlassMotion(rootRef, displacementRef, normalOffsetRef, enabled && active && interactive, isDaylight ? 22 : 16);

    useEffect(() => {
        const root = rootRef.current;
        if (!root || !active || !enabled) return;
        // SVG backdrop filters are verified in Chromium (including Electron); other engines keep
        // the ordinary CSS frost instead of losing the entire backdrop to an unsupported URL filter.
        if (!/(?:Chrome|Chromium|Edg)\//.test(navigator.userAgent)) return;
        const reduced = window.matchMedia('(prefers-reduced-transparency: reduce), (prefers-contrast: more), (forced-colors: active)');
        let timer: number | undefined;
        let previous = '';
        // Bumped on every rebuild and on unmount: an encode that finishes late sees a stale token
        // and gives its hold back instead of publishing a map for geometry that is no longer current.
        let generation = 0;
        // The geometry whose shared lens image this surface is holding, released on unmount so the
        // shared entry can go away (glassLensImages.ts).
        let held: { width: number; height: number } | null = null;
        const release = () => {
            if (!held) return;
            releaseGlassLensImage(held.width, held.height, radius);
            held = null;
        };
        const update = () => {
            window.clearTimeout(timer);
            const allowed = !reduced.matches && !document.hidden;
            setFlowAllowed(current => current === allowed ? current : allowed);
            if (reduced.matches || document.hidden) {
                setLens(current => current === null ? current : null);
                previous = '';
                release();
                return;
            }
            // Wait for resizing to settle. No RAF, pointer tracking, polling, or per-frame React state.
            timer = window.setTimeout(() => {
                const width = Math.round(root.clientWidth);
                const height = Math.round(root.clientHeight);
                if (width < 2 || height < 2) return;
                const key = `${width}:${height}:${radius}`;
                if (key === previous) return;
                previous = key;
                const token = ++generation;
                void acquireGlassLensImage(width, height, radius).then(image => {
                    if (token !== generation) {
                        releaseGlassLensImage(width, height, radius);
                        return;
                    }
                    release();
                    held = { width, height };
                    setLens({ width, height, image });
                }).catch(error => {
                    // Stay on the CSS frost rather than losing the surface.
                    if (token === generation) previous = '';
                    console.warn('[LiquidGlass] Could not build the lens map.', error);
                });
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
            generation += 1;
            observer.disconnect();
            reduced.removeEventListener('change', update);
            document.removeEventListener('visibilitychange', update);
            release();
        };
    }, [active, enabled, radius]);

    const enhanced = enabled && active && lens !== null;
    // How far apart the rim's three channels sit, in CSS pixels.
    //
    // Only a pane thick enough to have a rim gets it. Measured on the 40 px nav strip, a 0.85 px
    // fringe put an 18/255 (7%) yellow line along its edge where the same band without chromatic
    // separation read 1/255: on a strip that thin the split lands in a single pixel column and
    // reads as a drawn border, not as refraction, so thin controls keep the plain rim. The 600 px
    // settings panel moves its rim's blue channel by 25/255 over about three pixels - a lit edge.
    //
    // A light pane over a bright page is also where a colour cast shows most, so it gets less than
    // dark glass, which hides it in shadow.
    const THIN_PANE_PX = 56;
    const paneThickness = lens ? Math.min(lens.width, lens.height) : 0;
    const thicknessScale = paneThickness >= THIN_PANE_PX ? 1 : 0;
    const chromatic = { fringe: (isDaylight ? 0.85 : 1.15) * thicknessScale };
    // Compress extreme backdrops locally so a white cover cannot wash out dark-mode labels,
    // and a black cover cannot erase light-mode labels. Artwork elsewhere stays untouched.
    //
    // The two curves are not mirror images on purpose. Every highlight this material draws is
    // white, so on a dark backdrop white reads immediately; on a pale one it disappears. Light
    // glass therefore compresses its backdrop downward — a pane of real glass over a bright wall
    // reads as slightly darker and cooler than the wall, with a lit top edge and a shaded bottom
    // one. That is what gives it the same presence dark glass gets for free.
    // The output 0 at pure black is deliberate: lifting it put a bright floor under the displaced
    // rim, which showed as a pale halo around glass sitting on dark artwork.
    const toneCurve = isDaylight ? '0 0.2 0.44 0.72 1' : '0 0.24 0.43 0.49 0.5';
    if (!enabled && legacy === 'surface') return null;
    if (!enabled) return <span aria-hidden="true" className="liquid-glass-surface" data-glass-tone={isDaylight ? 'light' : 'dark'} data-glass-optics="classic" data-glass-legacy={legacy}><span className="liquid-glass-classic" /></span>;
    return (
        <span ref={rootRef} aria-hidden="true" className="liquid-glass-surface"
            data-glass-tone={isDaylight ? 'light' : 'dark'} data-glass-active={active}
            // The kind of control this surface belongs to, present in both materials: the styles
            // tell a text-heavy window (needs a real ground) from a control over a live backdrop
            // (needs its tint thin enough to keep that backdrop visible).
            data-glass-legacy={legacy}
            data-glass-optics={enhanced ? 'lens' : 'frost'}>
            {enhanced && <svg className="liquid-glass-definitions" width="0" height="0" focusable="false">
                <defs>
                    <filter ref={filterRef} id={id} x="0" y="0" width={lens.width} height={lens.height}
                        filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                        {/* A thin pane: 3.5px, so shapes behind it stay recognisable.
                            The rim's own bend supplies the "glass" read; the centre does not need to
                            erase the backdrop to do its job. */}
                        <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="frost" />
                        <feImage ref={imageRef} href={lens.image} x="0" y="0" width={lens.width} height={lens.height}
                            preserveAspectRatio="none" result="normals" />
                        <feOffset ref={normalOffsetRef} in="normals" dx="0" dy="0" result="movingNormals" />
                        <feDisplacementMap ref={displacementRef} in="SourceGraphic" in2="movingNormals"
                            scale={isDaylight ? 22 : 16}
                            xChannelSelector="R" yChannelSelector="G" result="bent" />
                        {/* A real pane splits colour at its bend: the rim refracts long wavelengths
                            less than short ones, so a bright edge on one side and a cool one on the
                            other sit a fraction of a pixel apart. Only the rim carries it - the
                            centre is flat glass, and splitting it would read as a blurry fringe
                            instead of a refracting edge.

                            Done by offsetting the one displaced result per channel rather than
                            displacing three times: measured on the surfaces this app actually
                            shows at once (one to three), three separate displacements cost 28%
                            more than this for the same edge, because each one re-runs the whole
                            Gaussian and image lookup. The chromatic split is what the eye reads;
                            how it was produced is not.

                            `fringe` scales the separation, so the strength stays one number. */}
                        <feOffset in="bent" dx={chromatic.fringe} dy={0} result="bentWarm" />
                        <feOffset in="bent" dx={-chromatic.fringe} dy={0} result="bentCool" />
                        <feColorMatrix in="bentWarm" type="matrix"
                            values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0 1" result="chromeR" />
                        <feColorMatrix in="bent" type="matrix"
                            values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 0 1" result="chromeG" />
                        <feColorMatrix in="bentCool" type="matrix"
                            values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 0 1" result="chromeB" />
                        <feComposite in="chromeR" in2="chromeG" operator="arithmetic"
                            k1="0" k2="1" k3="1" k4="0" result="chromeRG" />
                        <feComposite in="chromeRG" in2="chromeB" operator="arithmetic"
                            k1="0" k2="1" k3="1" k4="0" result="chrome" />
                        <feColorMatrix in="normals" type="matrix"
                            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 1 0 0" result="rim" />
                        <feComposite in="chrome" in2="rim" operator="in" result="edge" />
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
            {active && flow !== 'none' && (interactive || flow === 'static') && flowAllowed && !reducedUiMotion && <Suspense fallback={null}><LiquidGlassFlow mode={flow} /></Suspense>}
            <span className="liquid-glass-sheen" />
            <span className="liquid-glass-glow" />
        </span>
    );
}
