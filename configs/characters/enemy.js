import { CONFIG } from '../config.js';
import { BASE_SPRITES, BASE_ATTACKS, BASE_PHYSICS } from './base.js';

/**
 * ENEMY_CHARACTER — the AI-controlled fighter.
 * Give the enemy a different sprite, hurtbox, attacks, or physics by overriding
 * only what differs — the player config stays untouched.
 *
 * The `ai` block holds per-difficulty tuning overrides consumed by AIController.
 * Keys merge onto DEFAULT_TUNING; any omitted key inherits the default.
 */
export const ENEMY_CHARACTER = Object.freeze({
    id: 'enemy',
    displayName: 'Enemy',

    sprites: BASE_SPRITES,
    attacks: BASE_ATTACKS,
    physics: { ...BASE_PHYSICS },

    controls: Object.freeze({
        lightPunch: 'lightPunch',
        heavyPunch: 'heavyPunch',
        sweepKick: 'sweepKick',
        airPunch: 'airPunch',
    }),

    audio: Object.freeze({
        jump: Object.freeze({ ref: 'jump' }),
        punch: Object.freeze({ ref: 'punch' }),
        hit: Object.freeze({ ref: 'hit' }),
        block: Object.freeze({ ref: 'block' }),
        ko: Object.freeze({ ref: 'ko' }),
    }),

    start: {
        x: CONFIG.canvasWidth - 100 - BASE_PHYSICS.width,
        facingRight: false,
    },

    ai: Object.freeze({
        easy: Object.freeze({
            preferredRange: 110,
            blockProbability: 0.25,
            retreatProbability: 0.03,
            jumpProbability: 0.015,
            reactionDelay: 18,
            mistakeChance: 0.35,
            aggressionMult: 0.6,
            comboWindow: 10,
            stats: Object.freeze({
                maxHealth: 0.8,
                damage: 0.8,
                walkSpeed: 0.9,
                jump: 0.95,
            }),
        }),
        normal: Object.freeze({
            preferredRange: 90,
            blockProbability: 0.5,
            retreatProbability: 0.015,
            jumpProbability: 0.007,
            reactionDelay: 10,
            mistakeChance: 0.18,
            aggressionMult: 1.0,
            comboWindow: 20,
            stats: Object.freeze({
                maxHealth: 1.0,
                damage: 1.0,
                walkSpeed: 1.0,
                jump: 1.0,
            }),
        }),
        hard: Object.freeze({
            preferredRange: 70,
            blockProbability: 0.78,
            retreatProbability: 0.005,
            jumpProbability: 0.012,
            reactionDelay: 4,
            mistakeChance: 0.05,
            aggressionMult: 1.4,
            comboWindow: 30,
            stats: Object.freeze({
                maxHealth: 1.25,
                damage: 1.25,
                walkSpeed: 1.15,
                jump: 1.1,
            }),
        }),
    }),
});
