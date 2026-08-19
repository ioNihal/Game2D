import { BASE_SPRITES, BASE_ATTACKS, BASE_PHYSICS } from './base.js';

/**
 * PLAYER_CHARACTER — the human-controlled fighter.
 * Override sprites / attacks / physics here; base.js holds the defaults.
 */
export const PLAYER_CHARACTER = Object.freeze({
    id: 'player',
    displayName: 'Player',

    sprites: BASE_SPRITES,
    attacks: BASE_ATTACKS,
    physics: { ...BASE_PHYSICS },

    start: {
        x: 100,
        facingRight: true,
    },
});
