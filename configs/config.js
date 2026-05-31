/** Central game constants. Import everywhere instead of magic numbers. */
export const CONFIG = Object.freeze({
    // Canvas
    canvasWidth:  800,
    canvasHeight: 450,

    // World
    groundY:      310,
    gravity:      0.7,

    // Movement
    walkSpeed:     3.5,
    jumpVelocity: -13,

    // Combat
    hitStunFrames:         20,
    blockDamageReduction:  0.15,  // blocked attacks deal 15% of original damage
    blockKnockbackReduction: 0.2,
    blockStunFrames:       8,
    blockHitFrames:        6,

    // Visual
    shakeDecay:      0.85,   // multiplier applied to shake magnitude each frame
    shakeMagnitude:  6,      // px shake on heavy hit
    floatTextSpeed:  1.2,    // px/frame upward drift for floating damage numbers
    floatTextLife:   45,     // frames a floating text lives
    ghostBarSpeed:   2,      // px/frame the ghost health bar drains

    // Rounds
    roundsToWin:  2,         // first to this many round wins takes the match
    roundIntroMs: 1500,      // ms before "FIGHT!" fades and combat begins
});