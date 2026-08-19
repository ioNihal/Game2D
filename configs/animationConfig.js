/**
 * TEMPORARY shim — kept until Phase 2 migrates consumers to character configs.
 * Re-exports the base sprite pack in the old shared shape.
 */
import { BASE_SPRITES } from './characters/base.js';

export const ANIMATION_CONFIG = Object.freeze({
    player: BASE_SPRITES,
    enemy:  BASE_SPRITES,   // override individual keys here when enemy gets unique sprites
});
