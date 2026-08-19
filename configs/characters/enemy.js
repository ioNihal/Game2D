import { CONFIG } from '../config.js';
import { BASE_SPRITES, BASE_ATTACKS, BASE_PHYSICS } from './base.js';

/**
 * ENEMY_CHARACTER — the AI-controlled fighter.
 * Give the enemy a different sprite, hurtbox, attacks, or physics by overriding
 * only what differs — the player config stays untouched.
 */
export const ENEMY_CHARACTER = Object.freeze({
    id: 'enemy',
    displayName: 'Enemy',

    sprites: BASE_SPRITES,
    attacks: BASE_ATTACKS,
    physics: { ...BASE_PHYSICS },

    start: {
        x: CONFIG.canvasWidth - 100 - BASE_PHYSICS.width,
        facingRight: false,
    },

    // Difficulty tuning consumed by the AIController (Phase 5).
    ai: {},
});
