import { PLAYER_CHARACTER } from './characters/player.js';
import { ENEMY_CHARACTER } from './characters/enemy.js';

/** Every character the game can spawn — drives both preloading and factories. */
const CHARACTERS = Object.freeze([PLAYER_CHARACTER, ENEMY_CHARACTER]);

/**
 * Derives the image load list from character sprite configs.
 * Keys follow `${charId}_${animKey}${frame}` (e.g. "player_idle1").
 */
function buildImageManifest() {
    const images = [];
    for (const char of CHARACTERS) {
        for (const [animKey, cfg] of Object.entries(char.sprites)) {
            for (let i = 1; i <= cfg.frameCount; i++) {
                images.push({
                    key: `${char.id}_${animKey}${i}`,
                    url: `${cfg.path}${i}${cfg.extension}`,
                });
            }
        }
    }
    return images;
}

/** Shared audio assets (both fighters currently use the same sounds). */
const AUDIO = Object.freeze([
    { key: 'bgm_fight', urls: ['assets/sfx/bgm/bgm_fight.mp3', 'assets/sfx/bgm/bgm_fight.ogg'] },
    { key: 'bgm_menu',  urls: ['assets/main.mp3'] },
    { key: 'hover',     urls: ['assets/hover.mp3'] },
    { key: 'jump', urls: ['assets/sfx/jump/sfx_jump.mp3', 'assets/sfx/jump/sfx_jump.ogg'] },
    { key: 'punch', urls: ['assets/sfx/punch/sfx_punch.mp3', 'assets/sfx/punch/sfx_punch.ogg'] },
    { key: 'hit', urls: ['assets/sfx/hit/sfx_hit.mp3', 'assets/sfx/hit/sfx_hit.ogg'] },
    { key: 'block', urls: ['assets/sfx/block/sfx_block.mp3', 'assets/sfx/block/sfx_block.ogg'] },
    { key: 'ko', urls: ['assets/sfx/ko/sfx_ko.mp3', 'assets/sfx/ko/sfx_ko.ogg'] },
]);

/**
 * ASSET_MANIFEST — every asset the game needs to load.
 * Images are derived from character configs, so adding a character or an
 * animation state automatically preloads it.
 */
export const ASSET_MANIFEST = Object.freeze({
    images: Object.freeze(buildImageManifest()),
    audio: AUDIO,
});
