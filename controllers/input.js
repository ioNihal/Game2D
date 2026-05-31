/**
 * InputHandler — tracks keyboard state for the current and previous frame.
 * Virtual key methods allow mobile/touch code to inject inputs.
 */
export default class InputHandler {
    constructor() {
        /** @type {Record<string, boolean>} */
        this._keys = {};
        /** @type {Record<string, boolean>} */
        this._prevKeys = {};

        window.addEventListener('keydown', e => {
            this._keys[e.code] = true;
        });

        window.addEventListener('keyup', e => {
            this._keys[e.code] = false;
        });
    }

    //  Query 

    /** True while the key is held. */
    isKeyDown(code) {
        return !!this._keys[code];
    }

    /** True only on the first frame the key is pressed (rising edge). */
    isKeyJustPressed(code) {
        return !!this._keys[code] && !this._prevKeys[code];
    }

    //  Virtual inputs (touch / mobile) 

    setVirtualKeyDown(code) { this._keys[code] = true; }
    setVirtualKeyUp(code) { this._keys[code] = false; }

    //  Frame update 

    /** Must be called at the END of each game frame. */
    update() {
        this._prevKeys = { ...this._keys };
    }
}