/**
 * ATTACKS — all move definitions shared between Player and Enemy.
 *
 * Fields:
 *   name          — unique string identifier
 *   startup       — frames before hitbox appears
 *   active        — total active frames (hitbox alive for this long)
 *   recovery      — frames after active before returning to idle
 *   hitFrame      — frame within active phase when hitbox spawns (0-indexed)
 *   damage        — raw HP damage (before block reduction)
 *   knockbackX    — horizontal impulse applied to target (signed, owner applies direction)
 *   knockbackY    — vertical impulse applied to target (negative = upward)
 *   animKey       — key into animationsConfig for this attack's animation
 *   offsetX/Y     — hitbox offset from fighter's top-left (mirrored when facing left)
 *   width/height  — hitbox dimensions
 *   cooldownExtra — extra idle frames appended after recovery before next attack
 *   allowAI       — set false to prevent AI from choosing this move
 */
export const ATTACKS = Object.freeze([
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
