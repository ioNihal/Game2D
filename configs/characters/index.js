import { PLAYER_CHARACTER } from './player.js';
import { ENEMY_CHARACTER } from './enemy.js';

/**
 * Character registry — the single place that lists every playable/spawnable
 * character. Adding a character = add a file in configs/characters/ with a
 * `character.doc`-shaped config, then register it in CHARACTERS. The image
 * manifest (configs/assets.js) and factories read from this list.
 */
export const CHARACTERS = Object.freeze([PLAYER_CHARACTER, ENEMY_CHARACTER]);

/** id → character config lookup. */
export const CHARACTER_MAP = new Map(CHARACTERS.map(c => [c.id, c]));

/** Resolve a character config by id (returns null when unknown). */
export function getCharacter(id) {
    return CHARACTER_MAP.get(id) ?? null;
}