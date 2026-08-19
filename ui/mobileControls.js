import InputHandler from '../input/inputHandler.js';

/**
 * MobileControls — binds touch/mouse on mobile buttons directly to InputHandler.
 * No pass-through through Game; actions go straight to the input layer.
 */
export default class MobileControls {
    /**
     * @param {{ input: InputHandler, settingsStore: import('../ui/settingsStore.js').default }} deps
     */
    constructor({ input, settingsStore }) {
        this._input = input;
        this._settingsStore = settingsStore;

        /** @type {HTMLElement|null} */
        this._container = document.getElementById('mobileControls');
        if (!this._container) return;

        this._bindButton('btnLeft', 'moveLeft');
        this._bindButton('btnRight', 'moveRight');
        this._bindButton('btnJump', 'jump');
        this._bindButton('btnAttack', 'lightPunch');
        this._bindButton('btnHeavy', 'heavyPunch');
        this._bindButton('btnSweep', 'sweepKick');
        this._bindButton('btnBlock', 'block');
    }

    /** Binds touch + mouse events on a button element to an action. */
    _bindButton(elemId, action) {
        const el = document.getElementById(elemId);
        if (!el) return;

        const down = () => this._input.setVirtualDown(action);
        const up = () => this._input.setVirtualUp(action);

        el.addEventListener('touchstart', e => { e.preventDefault(); down(); }, { passive: false });
        el.addEventListener('touchend', e => { e.preventDefault(); up(); }, { passive: false });
        el.addEventListener('mousedown', e => { e.preventDefault(); down(); });
        el.addEventListener('mouseup', e => { e.preventDefault(); up(); });
        el.addEventListener('mouseleave', e => { e.preventDefault(); up(); });
    }
}
