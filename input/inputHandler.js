import { KEY_TO_ACTION } from './keyBindings.js';

/**
 * InputHandler — tracks semantic actions (not key codes) for the current and
 * previous frame. Mobile/touch code injects actions via setVirtualDown/Up.
 */
export default class InputHandler {
    constructor() {
        /** @type {Record<string, boolean>} */
        this._down = {};
        /** @type {Record<string, boolean>} */
        this._prevDown = {};

        window.addEventListener('keydown', e => {
            const action = KEY_TO_ACTION[e.code];
            if (action) this._down[action] = true;
        });

        window.addEventListener('keyup', e => {
            const action = KEY_TO_ACTION[e.code];
            if (action) this._down[action] = false;
        });
    }

    //  Query

    /** True while the action is held. */
    isDown(action) {
        return !!this._down[action];
    }

    /** True only on the first frame the action was activated (rising edge). */
    justPressed(action) {
        return !!this._down[action] && !this._prevDown[action];
    }

    //  Virtual inputs (touch / mobile)

    setVirtualDown(action) { this._down[action] = true; }
    setVirtualUp(action) { this._down[action] = false; }

    //  Frame update

    /** Must be called at the END of each game frame. */
    update() {
        this._prevDown = { ...this._down };
    }
}
