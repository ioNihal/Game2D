import { AnimationController } from '../render/animationController.js';
import Fighter from './fighter.js';

/**
 * CharacterFactory — builds a Fighter (+ its AnimationController) from one
 * character config. The animation config (image keys) is derived from the
 * character's sprites, so `Fighter` no longer needs to know about asset keys.
 */

/**
 * Build the AnimationController config (image keys) from a character's sprites.
 * @param {object} character
 * @returns {Record<string, { frameCount: number, frameDuration: number, loop: boolean, imageKeys: string[] }>}
 */
export function buildAnimationsConfig(character) {
    const result = {};
    for (const [animKey, cfg] of Object.entries(character.sprites)) {
        const imageKeys = [];
        for (let i = 1; i <= cfg.frameCount; i++) {
            imageKeys.push(`${character.id}_${animKey}${i}`);
        }
        result[animKey] = {
            frameCount: cfg.frameCount,
            frameDuration: cfg.frameDuration,
            loop: cfg.loop,
            imageKeys,
        };
    }
    return result;
}

/**
 * @param {{
 *   character: object,
 *   x: number,
 *   y: number,
 *   assetLoader?: import('../utils/assetLoader.js').default,
 *   bus?: import('../core/eventBus.js').default,
 * }} cfg
 * @returns {Fighter}
 */
export function buildFighter({ character, x, y, assetLoader, bus }) {
    const animController = (assetLoader && character.sprites)
        ? new AnimationController(buildAnimationsConfig(character), assetLoader)
        : null;
    return new Fighter({ character, x, y, animController, bus });
}