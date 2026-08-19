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
 * @returns {Record<string, { frameCount: number, frameDuration: number, loop: boolean, imageKeys: string[], drawOffsetY?: number }>}
 */
export function buildAnimationsConfig(character) {
    const result = {};
    for (const [animKey, cfg] of Object.entries(character.sprites)) {
        const frames = cfg.frames
            ?? Array.from({ length: cfg.frameCount }, (_, i) => String(i + 1));
        const imageKeys = frames.map(f => `${character.id}_${animKey}${f}`);
        result[animKey] = {
            frameCount: cfg.frameCount,
            frameDuration: cfg.frameDuration,
            loop: cfg.loop,
            imageKeys,
            drawOffsetY: cfg.drawOffsetY,
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