/**
 * configs/audio.js — central audio config.
 *
 * Game-level audio lives here. Per-character sounds live in each character's
 * `audio` block (configs/characters/*.js) and are merged by configs/assets.js.
 *
 * Shape:
 *   sfx   — shared one-shot sounds. Characters override them via `ref`.
 *   ui    — menu / interface sounds + menu BGM.
 *   bgm   — fight music: `tracks` declares loadable tracks; `fight` maps a
 *           round number to a track (`_default` is the fallback); `final` is
 *           played on the deciding round.
 */
export const GAME_AUDIO = Object.freeze({
    sfx: Object.freeze({
        jump: Object.freeze({
            urls: ['assets/sfx/jump/sfx_jump.mp3', 'assets/sfx/jump/sfx_jump.ogg'],
        }),
        punch: Object.freeze({
            urls: ['assets/sfx/punch/sfx_punch.mp3', 'assets/sfx/punch/sfx_punch.ogg'],
        }),
        hit: Object.freeze({
            urls: ['assets/sfx/hit/sfx_hit.mp3', 'assets/sfx/hit/sfx_hit.ogg'],
        }),
        block: Object.freeze({
            urls: ['assets/sfx/block/sfx_block.mp3', 'assets/sfx/block/sfx_block.ogg'],
        }),
        ko: Object.freeze({
            urls: ['assets/sfx/ko/sfx_ko.mp3', 'assets/sfx/ko/sfx_ko.ogg'],
        }),
    }),

    ui: Object.freeze({
        bgm_menu: Object.freeze({ urls: ['assets/main.mp3'] }),
        hover: Object.freeze({ urls: ['assets/hover.mp3'] }),
    }),

    bgm: Object.freeze({
        // Track key → files. Only entries here are preloaded.
        tracks: Object.freeze({
            bgm_fight: Object.freeze({
                urls: ['assets/sfx/bgm/bgm_fight.mp3', 'assets/sfx/bgm/bgm_fight.ogg'],
            }),
        }),

        // Round number → { track, volume, loop }. `_default` covers unlisted rounds.
        // Add a row here (and a matching `tracks` entry) to get round-specific BGM.
        fight: Object.freeze({
            _default: Object.freeze({ track: 'bgm_fight', volume: 0.5, loop: true }),
            1: Object.freeze({ track: 'bgm_fight', volume: 0.5, loop: true }),
            2: Object.freeze({ track: 'bgm_fight', volume: 0.5, loop: true }),
        }),

        // Played on the deciding round (match point).
        final: Object.freeze({ track: 'bgm_fight', volume: 0.5, loop: true }),
    }),
});