import { CHARACTERS } from './characters/index.js';
import { GAME_AUDIO } from './audio.js';
import { ARENA_THEME } from './arena.js';

/**
 * Builds the image load list from character sprite configs.
 * Keys follow `${charId}_${animKey}${frame}` (e.g. "player_idle1").
 * A sprite config may override `frames` (array of suffixes) for non-sequential
 * filenames; otherwise frames are "1".."frameCount".
 */
function buildImageManifest() {
    const images = [];
    for (const char of CHARACTERS) {
        for (const [animKey, cfg] of Object.entries(char.sprites)) {
            const frames = cfg.frames
                ?? Array.from({ length: cfg.frameCount }, (_, i) => String(i + 1));
            for (const frame of frames) {
                images.push({
                    key: `${char.id}_${animKey}${frame}`,
                    url: `${cfg.path}${frame}${cfg.extension}`,
                });
            }
        }
    }
    // Optional arena backdrop image (configs/arena.js).
    if (ARENA_THEME.background?.image) {
        images.push({ key: 'arena_bg', url: ARENA_THEME.background.image });
    }
    return images;
}

/** Character-specific sounds that have their own `urls` (loaded under `${id}_${name}`). */
function buildCharacterAudioManifest() {
    const items = [];
    for (const char of CHARACTERS) {
        for (const [name, entry] of Object.entries(char.audio ?? {})) {
            if (entry?.urls) {
                items.push({ key: `${char.id}_${name}`, urls: [...entry.urls] });
            }
        }
    }
    return items;
}

/** BGM tracks declared in GAME_AUDIO.bgm.tracks. */
function buildBGMManifest() {
    const items = [];
    for (const [key, entry] of Object.entries(GAME_AUDIO.bgm?.tracks ?? {})) {
        if (entry?.urls) items.push({ key, urls: [...entry.urls] });
    }
    return items;
}

/**
 * ASSET_MANIFEST — every asset the game needs to load.
 * Images and audio are derived from configs, so adding a character sprite,
 * a character sound, or a BGM track preloads automatically.
 */
export const ASSET_MANIFEST = Object.freeze({
    images: Object.freeze(buildImageManifest()),
    audio: Object.freeze([
        ...Object.entries(GAME_AUDIO.sfx ?? {}).map(([key, e]) => ({ key, urls: [...e.urls] })),
        ...Object.entries(GAME_AUDIO.ui ?? {}).map(([key, e]) => ({ key, urls: [...e.urls] })),
        ...buildCharacterAudioManifest(),
        ...buildBGMManifest(),
    ]),
});