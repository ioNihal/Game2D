/**
 * ANIMATION_CONFIG — sprite sheet metadata for every character and animation state.
 *
 * Both 'player' and 'enemy' currently share the same sprite assets.
 * When you add unique enemy sprites, just override the individual entries.
 *
 * hurtbox — the rectangle (relative to the fighter's bounding box) that can
 *            receive hits.  { offsetX, offsetY, width, height }
 */

/** Base animation entries shared by all characters */
const SHARED_ANIMS = Object.freeze({
    idle: {
        frameCount:    8,
        path:         'assets/animations/idle/idle',
        extension:    '.png',
        frameDuration: 10,
        loop:          true,
        hurtbox:       { offsetX: 100, offsetY: 180, width: 55, height: 100 },
    },
    walk: {
        frameCount:    8,
        path:         'assets/animations/walk/walk',
        extension:    '.png',
        frameDuration: 8,
        loop:          true,
        hurtbox:       { offsetX: 100, offsetY: 180, width: 55, height: 100 },
    },
    jump: {
        frameCount:    5,
        path:         'assets/animations/jump/jump',
        extension:    '.png',
        frameDuration: 10,
        loop:          false,
        hurtbox:       { offsetX: 100, offsetY: 180, width: 55, height: 100 },
    },
    lightPunch: {
        frameCount:    3,
        path:         'assets/animations/lightPunch/lightPunch',
        extension:    '.png',
        frameDuration: 6,
        loop:          false,
        hurtbox:       { offsetX: 100, offsetY: 180, width: 65, height: 100 },
    },
    airPunch: {
        frameCount:    2,
        path:         'assets/animations/airPunch/airPunch',
        extension:    '.png',
        frameDuration: 6,
        loop:          false,
        hurtbox:       { offsetX: 100, offsetY: 180, width: 65, height: 100 },
    },
    hit: {
        frameCount:    4,
        path:         'assets/animations/hit/hit',
        extension:    '.png',
        frameDuration: 10,
        loop:          false,
        hurtbox:       { offsetX: 100, offsetY: 180, width: 50, height: 100 },
    },
    block: {
        frameCount:    3,
        path:         'assets/animations/block/block',
        extension:    '.png',
        frameDuration: 10,
        loop:          false,
        hurtbox:       { offsetX: 100, offsetY: 180, width: 55, height: 100 },
    },
    blockHit: {
        frameCount:    1,
        path:         'assets/animations/blockHit/blockHit',
        extension:    '.png',
        frameDuration: 6,
        loop:          false,
        hurtbox:       { offsetX: 100, offsetY: 180, width: 50, height: 100 },
    },
    ko: {
        frameCount:    10,
        path:         'assets/animations/ko/ko',
        extension:    '.png',
        frameDuration: 10,
        loop:          false,
        hurtbox:       { offsetX: 85, offsetY: 230, width: 100, height: 50 },
    },
});

export const ANIMATION_CONFIG = Object.freeze({
    player: SHARED_ANIMS,
    enemy:  SHARED_ANIMS,   // override individual keys here when enemy gets unique sprites
});
