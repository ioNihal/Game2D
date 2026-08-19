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

    // Input action → attack name. Adding a new attack style = append an
    // attack entry here and (optionally) point an action at it.
    controls: Object.freeze({
        lightPunch: 'lightPunch',
        heavyPunch: 'heavyPunch',
        sweepKick: 'sweepKick',
        airPunch: 'airPunch',
    }),

    // Sound effects for this character. `ref` reuses a shared GAME_AUDIO.sfx
    // key; provide `urls` to load a character-specific sound instead.
    audio: Object.freeze({
        jump: Object.freeze({ ref: 'jump' }),
        punch: Object.freeze({ ref: 'punch' }),
        hit: Object.freeze({ ref: 'hit' }),
        block: Object.freeze({ ref: 'block' }),
        ko: Object.freeze({ ref: 'ko' }),
    }),

    start: {
        x: 100,
        facingRight: true,
    },
});
