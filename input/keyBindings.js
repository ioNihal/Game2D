/**
 * keyBindings — single source of truth mapping physical keys to semantic actions.
 *
 * Action names are what every system uses (Fighter, mobile controls, debug).
 * Change a key here and it applies everywhere; add a key and it's usable
 * everywhere.
 */
export const KEY_TO_ACTION = Object.freeze({
    // Movement
    ArrowLeft: 'moveLeft',
    KeyA:      'moveLeft',
    ArrowRight: 'moveRight',
    KeyD:      'moveRight',
    ArrowUp:   'jump',
    KeyW:      'jump',

    // Attacks
    KeyJ:      'lightPunch',
    KeyU:      'heavyPunch',
    KeyI:      'sweepKick',

    // Defense
    KeyK:      'block',

    // Debug
    KeyL:      'killswitch',
});

/** All action names, derived so it can't drift from the map above. */
export const ACTIONS = Object.freeze(
    [...new Set(Object.values(KEY_TO_ACTION))]
);
