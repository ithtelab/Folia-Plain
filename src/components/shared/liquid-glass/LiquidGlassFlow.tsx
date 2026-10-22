import React, { useEffect, useRef } from 'react';
import { liquidMetalFragmentShader, ShaderMount } from '@paper-design/shaders';
import { PAPER_SHADER_CONTEXT_ATTRIBUTES } from '../../../utils/paperShaderContext';
import { updatePaperShaderUniforms } from '../../../utils/paperShaderUniforms';
import {
    resolveGlassFlowSeed,
    subscribeGlassAudioFlow,
    type GlassAudioFrame,
} from './glassAudioFlow';

// The reference's flowing metallic reflection, confined to the glass rim instead of its content.
// A blended WebGL sibling makes Chromium skip the backdrop filter below it. Emit translucent
// reflections in the shader instead, so normal alpha compositing preserves the real glass blur.
const glassReflectionShader = liquidMetalFragmentShader.replace('void main()', 'void paintReflection()') + `
void main() {
    paintReflection();
    float luminance = dot(fragColor.rgb, vec3(0.2126, 0.7152, 0.0722));
    float alpha = smoothstep(0.12, 0.98, luminance) * fragColor.a * 0.75;
    vec3 reflection = clamp(fragColor.rgb / max(luminance, 0.001), 0.9, 1.0);
    fragColor = vec4(reflection * alpha, alpha);
}
`;

let flowInstance = 0;

export default function LiquidGlassFlow({ mode }: { mode: 'ambient' | 'interactive' | 'static' }) {
    const elementRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = elementRef.current;
        const host = element?.closest<HTMLElement>('.liquid-glass-host');
        if (!element || !host) return;
        const seed = resolveGlassFlowSeed(host.getBoundingClientRect(), flowInstance++);
        element.dataset.glassFlowAngle = seed.angle.toFixed(2);
        element.dataset.glassFlowDirection = seed.direction < 0 ? 'reverse' : 'forward';
        let mount: ShaderMount;
        try {
            // Reuse the installed shader/runtime; no copied WebGL renderer or remote image.
            mount = new ShaderMount(element, glassReflectionShader, {
                u_colorBack: [0, 0, 0, 0], u_colorTint: [1, 1, 1, 1],
                u_repetition: 4, u_softness: 0.5, u_angle: 45, u_distortion: 0,
                u_contour: 0, u_shiftRed: 0.3, u_shiftBlue: 0.3, u_isImage: false, u_shape: 0,
                u_fit: 1, u_scale: 8, u_rotation: 0, u_originX: 0.5, u_originY: 0.5,
                u_offsetX: 0.1, u_offsetY: -0.1, u_worldWidth: 0, u_worldHeight: 0,
            }, PAPER_SHADER_CONTEXT_ATTRIBUTES, 0, 0, 2, 128_000);
        } catch (error) {
            console.warn('[LiquidGlass] Flow unavailable; keeping the static material.', error);
            for (const canvas of element.querySelectorAll('canvas')) {
                canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext();
                canvas.remove();
            }
            return;
        }
        const abort = new AbortController();
        const dispose = () => {
            abort.abort();
            const gl = mount.canvasElement.getContext('webgl2');
            mount.dispose();
            gl?.getExtension('WEBGL_lose_context')?.loseContext();
        };
        // Keep the same reflection shader, frozen at its initial frame, with no input listeners.
        if (mode === 'static') return dispose;
        const options = { passive: true, signal: abort.signal };
        let hovered = host.matches(':hover');
        let focused = host.contains(document.activeElement);
        let pressed = false;
        let windowActive = document.hasFocus();
        let latestAudio: GlassAudioFrame = { time: 0, power: 0, bass: 0, mid: 0, treble: 0, beat: 0 };
        const moving = () => windowActive && (mode === 'ambient' || pressed || hovered || focused);
        const speedFor = () => {
            if (!windowActive) return 0;
            const musicalLift = latestAudio.power * 0.5 + latestAudio.beat * 0.85;
            if (pressed) return 2.3 + musicalLift;
            if (hovered) return 0.9 + musicalLift;
            if (focused) return 0.62 + musicalLift * 0.6;
            return mode === 'ambient' ? 0.32 + latestAudio.power * 0.55 + latestAudio.beat * 0.8 : 0;
        };
        const update = () => mount.setSpeed(speedFor());
        const paintAudio = (frame: GlassAudioFrame) => {
            latestAudio = frame;
            update();
            if (!moving()) return;
            const orbit = frame.time * (0.65 + frame.power * 1.15 + frame.beat * 0.75) + seed.phase;
            const angleTravel = 5 + frame.power * 13 + frame.beat * 24;
            const distortion = 0.035 + frame.bass * 0.16 + frame.beat * 0.38 + frame.treble * 0.05;
            updatePaperShaderUniforms(mount, {
                u_angle: seed.angle + seed.direction * Math.sin(orbit) * angleTravel + frame.treble * 9,
                u_distortion: distortion,
                u_offsetX: seed.offsetX + Math.sin(orbit * 1.17 + seed.phase) * (0.025 + frame.power * 0.045),
                u_offsetY: seed.offsetY + Math.cos(orbit * 0.91 + seed.phase) * (0.02 + frame.mid * 0.04),
                u_rotation: seed.rotation + seed.direction * Math.cos(orbit * 0.73) * (1.8 + frame.mid * 5),
                u_scale: 8 - frame.beat * 0.45 + frame.treble * 0.22,
                u_shiftRed: 0.3 + frame.beat * 0.16,
                u_shiftBlue: 0.3 - frame.beat * 0.08,
                u_softness: 0.5 + frame.treble * 0.035,
            }, true);
        };
        const enter = () => { hovered = true; update(); };
        const leave = () => { hovered = false; pressed = false; update(); };
        const down = (event: PointerEvent) => {
            if (event.button !== 0 || (event.target instanceof Element && event.target.closest(':disabled, [aria-disabled="true"]'))) return;
            pressed = true;
            update();
        };
        const up = () => { if (pressed) { pressed = false; update(); } };
        const focus = () => { focused = true; update(); };
        const focusOut = (event: FocusEvent) => {
            if (event.relatedTarget instanceof Node && host.contains(event.relatedTarget)) return;
            focused = false;
            update();
        };
        const blurWindow = () => { windowActive = false; pressed = false; update(); };
        const focusWindow = () => {
            windowActive = true;
            hovered = host.matches(':hover');
            focused = host.contains(document.activeElement);
            update();
        };
        host.addEventListener('pointerenter', enter, options);
        host.addEventListener('pointerleave', leave, options);
        host.addEventListener('pointerdown', down, { ...options, capture: true });
        host.addEventListener('pointercancel', leave, options);
        host.addEventListener('focusin', focus, options);
        host.addEventListener('focusout', focusOut, options);
        window.addEventListener('pointerup', up, options);
        window.addEventListener('blur', blurWindow, options);
        window.addEventListener('focus', focusWindow, options);
        const unsubscribeAudio = subscribeGlassAudioFlow(paintAudio);
        update();
        return () => {
            unsubscribeAudio();
            dispose();
        };
    }, [mode]);

    return <div ref={elementRef} className="liquid-glass-flow" data-glass-flow={mode} aria-hidden="true" />;
}
