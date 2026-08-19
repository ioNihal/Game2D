/** Pure math helpers shared across the codebase. */

/** Clamp `v` into [min, max]. */
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/** Axis-aligned bounding box overlap test. Each box is { x, y, width, height }. */
export const aabbOverlap = (a, b) =>
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y;

/** Linear interpolation between a and b by t (0..1). */
export const lerp = (a, b, t) => a + (b - a) * t;
