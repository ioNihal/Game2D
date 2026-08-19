/**
 * GameLoop — fixed-timestep accumulator loop.
 *
 * Logic (update) advances at a fixed 60 Hz step so gameplay is deterministic
 * and frame-rate independent (kills the 144 Hz = 2.4× speedup bug). Rendering
 * (render) runs on every requestAnimationFrame; extra time is clamped to avoid
 * a catch-up burst after tab switches or pauses.
 *
 * `update` is called at least zero times per rAF, exactly once per 16.67 ms
 * of elapsed time. `render` is called once per rAF.
 */
export default class GameLoop {
    /**
     * @param {{ update: () => void, render: () => void, stepMs?: number }} opts
     */
    constructor({ update, render, stepMs = 1000 / 60 }) {
        this._update = update;
        this._render = render;
        this._stepMs = stepMs;

        this._accumulator = 0;
        this._lastTime = null;
        this._rafId = null;
        this._running = false;
        this._boundTick = this._tick.bind(this);
    }

    start() {
        if (this._running) return;
        this._running = true;
        this._lastTime = null;
        this._accumulator = 0;
        this._rafId = requestAnimationFrame(this._boundTick);
    }

    stop() {
        if (!this._running) return;
        this._running = false;
        if (this._rafId !== null) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
    }

    isRunning() { return this._running; }

    /** Clear accumulated time so no catch-up burst fires (e.g. on resume). */
    resetTiming() {
        this._lastTime = null;
        this._accumulator = 0;
    }

    _tick(timestamp) {
        if (!this._running) return;

        if (this._lastTime !== null) {
            let frameMs = timestamp - this._lastTime;
            if (frameMs > 250) frameMs = 250; // clamp big gaps (background tab / resume)
            this._accumulator += frameMs;

            while (this._accumulator >= this._stepMs) {
                this._update();
                this._accumulator -= this._stepMs;
            }
        }
        this._lastTime = timestamp;

        this._render();
        this._rafId = requestAnimationFrame(this._boundTick);
    }
}