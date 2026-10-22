// src/components/shared/liquid-glass/glassPressOrigin.ts
// Where a press ripple starts: the pointer inside the host, as percentages so the ripple can be
// positioned in CSS without measuring on every frame.

export type GlassPressOrigin = { x: number; y: number };

/**
 * The pointer's place inside `rect`, clamped to the host so a press on the very edge still starts
 * the ripple inside the card instead of leaving half of it outside the clip.
 */
export const resolvePressOrigin = (
    rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
    clientX: number,
    clientY: number,
): GlassPressOrigin => {
    if (rect.width <= 0 || rect.height <= 0) return { x: 50, y: 50 };
    const clamp = (value: number) => Math.max(0, Math.min(100, value));
    return {
        x: clamp((clientX - rect.left) / rect.width * 100),
        y: clamp((clientY - rect.top) / rect.height * 100),
    };
};
