/**
 * configs/arena.js — arena/backdrop/floor theme.
 *
 * Renderer.drawBackground reads this config instead of hardcoded colors, so
 * swapping the look of the fight stage is a config-only change. `enabled`
 * flags turn whole layers off. The defaults mirror the original neon arena.
 *
 * Optional `background.image` is an asset URL drawn behind everything (pixel
 * art backdrops); omit it for a pure procedural background.
 */
export const ARENA_THEME = Object.freeze({
    id: 'neon-arena',

    background: Object.freeze({
        image: null, // e.g. 'assets/arenas/rooftop.png'
    }),

    sky: Object.freeze({
        colors: [
            { pos: 0,   color: '#0a0a1a' },
            { pos: 0.6, color: '#1a1030' },
            { pos: 1,   color: '#2a1545' },
        ],
    }),

    ground: Object.freeze({
        colors: [
            { pos: 0, color: '#1a1020' },
            { pos: 1, color: '#0d0810' },
        ],
    }),

    floorLine: Object.freeze({
        enabled: true,
        color: '#c084fc',
        glow: '#a855f7',
        glowBlur: 18,
        width: 2,
    }),

    grid: Object.freeze({
        enabled: true,
        color: '#c084fc',
        alpha: 0.12,
        rows: 5,
        cols: 7,
        width: 1,
    }),

    pillars: Object.freeze({
        enabled: true,
        // x is absolute; negative x counts from the right edge (x = W + x).
        columns: Object.freeze([
            Object.freeze({ x: 30, width: 25, height: 160 }),
            Object.freeze({ x: -55, width: 25, height: 160 }),
        ]),
        gradient: Object.freeze([
            { pos: 0, color: '#6b21a8' },
            { pos: 1, color: '#1e0a2e' },
        ]),
        edge: Object.freeze({ color: '#7c3aed', glow: '#a855f7', glowBlur: 10, width: 1 }),
    }),

    crowd: Object.freeze({
        enabled: true,
        color: '#4a1d6e',
        alpha: 0.18,
        spacing: 18,
        radius: 9,
    }),

    footer: Object.freeze({
        enabled: true,
        color: '#0d0810',
        leftWidth: 120,
        rightWidth: 145,
        offsetY: 1,
    }),
});