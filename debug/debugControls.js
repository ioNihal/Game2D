import { CONFIG } from '../configs/config.js';

/**
 * DebugControls — killswitch and hitbox visualization, only active when
 * CONFIG.debug is true (URL param `?debug`).
 *
 * Killswitch (L key): instantly KO the opponent — handy for testing game-over flow.
 * Hitbox debug (B key): toggles active hitbox/hurtbox outlines over fighters.
 */
export default class DebugControls {
    /**
     * @param {{ bus: import('../core/eventBus.js').default }} deps
     */
    constructor({ bus }) {
        this._bus = bus;
        this._showHitboxes = false;

        if (!CONFIG.debug) return;

        window.addEventListener('keydown', e => {
            if (e.code === 'KeyL') this._killswitch();
            if (e.code === 'KeyB') this.toggleHitboxDebug();
        });
    }

    _killswitch() {
        this._bus.emit('debug:killswitch');
    }

    /** Toggles hitbox debug overlay on/off. */
    toggleHitboxDebug() {
        this._showHitboxes = !this._showHitboxes;
    }

    /**
     * Draws hitbox (red) and hurtbox (blue) outlines over fighters.
     * Call from Game._draw() when CONFIG.debug is true.
     * @param {{ x: number, y: number, width: number, height: number }} hurtbox
     * @param {import('../entities/hitbox.js').default[]} hitboxes — active hitboxes
     */
    drawDebugHitboxes(ctx, player, enemy, hitboxes) {
        if (!this._showHitboxes) return;

        // Hurtboxes — blue
        for (const fighter of [player, enemy]) {
            const hb = fighter.getHurtboxBounds();
            ctx.strokeStyle = 'rgba(0, 120, 255, 0.8)';
            ctx.lineWidth = 1;
            ctx.strokeRect(hb.x, hb.y, hb.width, hb.height);
        }

        // Active hitboxes — red
        for (const hb of hitboxes) {
            const b = hb.getBounds();
            ctx.strokeStyle = 'rgba(255, 60, 60, 0.9)';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(b.x, b.y, b.width, b.height);
        }
    }
}
