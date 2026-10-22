import { audioPower, bass, mid, treble } from '../../../stores/motionSignals';

// Shared rhythm source for every flowing glass edge. One RAF serves all surfaces and never enters React state.

export type GlassAudioFrame = {
    time: number;
    power: number;
    bass: number;
    mid: number;
    treble: number;
    beat: number;
};

export type GlassFlowSeed = {
    angle: number;
    direction: -1 | 1;
    offsetX: number;
    offsetY: number;
    phase: number;
    rotation: number;
};

const TAU = Math.PI * 2;
const EMIT_INTERVAL_MS = 1000 / 30;
const listeners = new Set<(frame: GlassAudioFrame) => void>();
let audioFrame: GlassAudioFrame = { time: 0, power: 0, bass: 0, mid: 0, treble: 0, beat: 0 };
let frameId: number | null = null;
let lastEmit = 0;
let lastTime = 0;

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const band = (value: number) => clamp(value > 1 ? value / 255 : value);
const follow = (current: number, target: number, delta: number) => (
    current + (target - current) * clamp(delta * (target > current ? 18 : 4.5))
);

/** One stable audio step, kept separate from RAF so its bounds and decay are testable. */
export const stepGlassAudioFrame = (
    previous: GlassAudioFrame,
    bands: Omit<GlassAudioFrame, 'time' | 'beat'>,
    deltaSeconds: number,
): GlassAudioFrame => {
    const delta = clamp(deltaSeconds, 0.001, 0.1);
    const targetBass = band(bands.bass);
    const targetMid = band(bands.mid);
    const targetTreble = band(bands.treble);
    const targetPower = band(bands.power);
    const nextBass = follow(previous.bass, targetBass, delta);
    const onset = targetBass > 0.18 && targetBass > previous.bass + 0.055
        ? clamp((targetBass - previous.bass) * 3.2)
        : 0;
    const beat = Math.max(onset, previous.beat * Math.exp(-delta * 5.8));
    const power = follow(previous.power, targetPower, delta);
    return {
        time: previous.time + delta,
        power,
        bass: nextBass,
        mid: follow(previous.mid, targetMid, delta),
        treble: follow(previous.treble, targetTreble, delta),
        beat,
    };
};

/** A stable flow orientation from screen position plus an instance offset for coincident hosts. */
export const resolveGlassFlowSeed = (
    rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
    instance: number,
): GlassFlowSeed => {
    const spatial = Math.abs(rect.left) * 0.013 + Math.abs(rect.top) * 0.021
        + rect.width * 0.007 + rect.height * 0.011;
    const phase = (spatial / 180 + (instance + 1) * 0.61803398875) % 1;
    const direction = phase < 0.5 ? -1 : 1;
    return {
        angle: 32 + phase * 108,
        direction,
        offsetX: direction * (0.03 + phase * 0.06),
        offsetY: (phase - 0.5) * 0.13,
        phase: phase * TAU,
        rotation: -14 + phase * 28,
    };
};

/**
 * Subscribe a glass surface to the one shared audio clock. Updates are capped at 30 Hz; the WebGL
 * shader keeps drawing independently, and all values are read from MotionValues without renders.
 */
export const subscribeGlassAudioFlow = (listener: (frame: GlassAudioFrame) => void) => {
    listeners.add(listener);
    listener(audioFrame);
    if (frameId === null) {
        lastEmit = 0;
        lastTime = 0;
        const tick = (time: number) => {
            const delta = lastTime ? (time - lastTime) / 1000 : 1 / 30;
            lastTime = time;
            if (time - lastEmit >= EMIT_INTERVAL_MS) {
                audioFrame = stepGlassAudioFrame(audioFrame, {
                    power: audioPower.get(),
                    bass: bass.get(),
                    mid: mid.get(),
                    treble: treble.get(),
                }, Math.min(delta, EMIT_INTERVAL_MS / 1000 * 2));
                lastEmit = time;
                for (const send of listeners) send(audioFrame);
            }
            frameId = listeners.size > 0 ? requestAnimationFrame(tick) : null;
        };
        frameId = requestAnimationFrame(tick);
    }
    return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && frameId !== null) {
            cancelAnimationFrame(frameId);
            frameId = null;
            audioFrame = { time: 0, power: 0, bass: 0, mid: 0, treble: 0, beat: 0 };
        }
    };
};
