/**
 * base.js — shared character data used as defaults by every character config.
 *
 * Individual characters (player.js / enemy.js) spread these and override only
 * what differs, so giving the enemy a different sprite, hurtbox, attacks, or
 * physics never touches the player.
 *
 * Sprite fields:
 *   frameCount/path/extension/frameDuration/loop — animation metadata
 *   hurtbox — { offsetX, offsetY, width, height } rectangle (relative to the
 *             fighter's bounding box) that can receive hits.
 *
 * Attack fields:
 *   name, startup, active, recovery, hitFrame, damage, knockbackX/Y,
 *   offsetX/Y, width/height (hitbox), animKey, cooldownExtra, allowAI
 */

/** Base sprite pack shared by all characters by default. */
export const BASE_SPRITES = Object.freeze({
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

/** Base move set shared by all characters by default. */
export const BASE_ATTACKS = Object.freeze([
    {
        name:         'lightPunch',
        startup:       5,
        active:        3,
        recovery:     10,
        hitFrame:      1,
        damage:        8,
        knockbackX:    5,
        knockbackY:   -3,
        animKey:      'lightPunch',
        offsetX:      135,
        offsetY:      225,
        width:         40,
        height:        25,
        cooldownExtra: 5,
    },
    {
        name:         'heavyPunch',
        startup:       10,
        active:        4,
        recovery:      18,
        hitFrame:      1,
        damage:        18,
        knockbackX:    10,
        knockbackY:   -5,
        animKey:      'lightPunch',   // reuse sprite — replace when you add art
        offsetX:      135,
        offsetY:      210,
        width:         50,
        height:        30,
        cooldownExtra: 8,
    },
    {
        name:         'sweepKick',
        startup:       8,
        active:        4,
        recovery:      14,
        hitFrame:      1,
        damage:        12,
        knockbackX:    8,
        knockbackY:   -1,
        animKey:      'lightPunch',   // reuse sprite — replace when you add art
        offsetX:      120,
        offsetY:      260,            // low — aimed at legs
        width:         55,
        height:        20,
        cooldownExtra: 6,
    },
    {
        name:         'airPunch',
        startup:       4,
        active:        2,
        recovery:     12,
        hitFrame:      1,
        damage:        6,
        knockbackX:    4,
        knockbackY:   -2,
        animKey:      'airPunch',
        offsetX:      135,
        offsetY:      260,
        width:         30,
        height:        20,
        cooldownExtra: 5,
    },
    {
        // Developer cheat — full-screen one-hit KO, never given to AI
        name:         'killswitch',
        startup:       6,
        active:        5,
        recovery:     20,
        hitFrame:      2,
        damage:       100,
        knockbackX:   12,
        knockbackY:   -8,
        animKey:      'lightPunch',
        offsetX:      135,
        offsetY:      160,
        width:        320,
        height:       100,
        cooldownExtra: 10,
        allowAI:      false,
    },
]);

/** Default physical dimensions shared by all characters by default. */
export const BASE_PHYSICS = Object.freeze({
    width: 250,
    height: 280,
    maxHealth: 100,
});
