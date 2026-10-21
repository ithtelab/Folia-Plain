// Small, bounded spring steps shared by the material's transient optical motion.
export interface GlassSpring {
    value: number;
    velocity: number;
}

/** Mutate one scalar spring, substepping slow frames; return whether it still needs another frame. */
export function advanceGlassSpring(spring: GlassSpring, target: number, elapsed: number): boolean {
    const duration = Math.max(0, Math.min(elapsed, 0.032));
    const steps = Math.max(1, Math.ceil(duration / 0.008));
    const step = duration / steps;
    for (let i = 0; i < steps; i += 1) {
        spring.velocity += ((target - spring.value) * 260 - spring.velocity * 24) * step;
        spring.value += spring.velocity * step;
    }
    if (Math.abs(spring.value - target) < 0.0008 && Math.abs(spring.velocity) < 0.007) {
        spring.value = target;
        spring.velocity = 0;
        return false;
    }
    return true;
}
