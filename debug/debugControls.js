import { CONFIG } from '../configs/config.js';

/**
 * DebugControls — killswitch and hitbox visualization, only active when
 * CONFIG.debug is true (URL param `?debug`).
 *
 * Killswitch (L key): instantly KO the opponent — handy for testing game-over flow.
 * Hitbox debug: draws active hitbox/hurtbox outlines over fighters.
 */
export default class DebugControls {
    /**
     * @param {{ input: import('../input/inputHandler.js').default, bus: import('../core/eventBus.js').default }} deps
     */
    constructor({ input, bus }) {
        this._input = input;
        this._bus = bus;
        this._showHitboxes = false;

        if (!CONFIG.debug) return;

        window.addEventListener('keydown', e => {
            if (e.code === 'KeyL') this._killswitch();
        });
    }

    _killswitch() {
        this._bus.emit('debug:killswitch');
    }

    /** Toggles hitbox debug overlay on/off. */
    toggleHitboxDebug() {
        this._showHitboxes = !this._showHitboxes;
    }

    get showHitboxes() { return this._showHitboxes; }

    /**
     * Draws hitbox and hurtbox outlines for both fighters.
     * Call from Game._draw() when CONFIG.debug is true.
     */
    drawDebugHitboxes(ctx, player, enemy) {
        if (!this._showHitboxes) return;

        for (const fighter of [player, enemy]) {
            // Hurtbox
            const hb = fighter.getHurtboxBounds();
            ctx.strokeStyle = 'rgba(0,255,0,0.6)';
            ctx.lineWidth = 1;
            ctx.strokeRect(hb.x, hb.y, hb.width, hb.height);

            // Pending hitbox
            if (fighter.pendingHitbox) {
                const ph = fighter.pendingHitbox;
                ctx.strokeStyle = 'rgba(255,0,0,0.6)';
                ctx.strokeRect(
                    fighter.x + ph.offsetX,
                    fighter.y + ph.offsetY,
                    ph.width,
                    ph.height
                );
            }
        }
    }
}
