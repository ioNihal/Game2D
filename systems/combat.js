/**
 * CombatSystem — resolves active hitboxes against fighters and emits events so
 * rendering / audio side-effects stay out of gameplay logic.
 *
 * Events:
 *   combat:hit  { attacker, target, damage, blocked, ko, x, y, big }
 *     — fired once per landed hit that dealt damage (blocked hits still deal
 *       reduced damage, so they fire too). `ko` is true only when the target
 *       actually fell (unblocked, lethal).
 */
export default class CombatSystem {
    /**
     * @param {{ bus?: import('../core/eventBus.js').default }} cfg
     */
    constructor({ bus } = {}) {
        this._bus = bus ?? null;
        this._fighters = [];
        this._hitboxes = [];
    }

    /** Set the fighters that can be hit (usually [player, enemy]). */
    setFighters(fighters) {
        this._fighters = fighters;
    }

    /** Push a fighter's pending hitbox (if any) into the active pool. */
    collect(fighter) {
        if (fighter.pendingHitbox) {
            this._hitboxes.push(fighter.pendingHitbox);
            fighter.pendingHitbox = null;
        }
    }

    /** All hitboxes currently resolving (for debug overlay). */
    getActiveHitboxes() {
        return [...this._hitboxes];
    }

    /** Advance hitboxes and resolve collisions for one frame. */
    update() {
        for (let i = this._hitboxes.length - 1; i >= 0; i--) {
            const hb = this._hitboxes[i];
            hb.update();

            for (const target of this._fighters) {
                if (!hb.checkCollision(target)) continue;

                const dir = hb.owner.facingRight ? 1 : -1;
                const prevHP = target.health;
                const blocked = target.state === 'block' && target.onGround;

                target.takeHit(hb.damage, hb.knockbackX * dir, hb.knockbackY);
                hb.markHit(target);

                const damage = prevHP - target.health;
                if (damage <= 0) continue;

                const hurtbox = target.getHurtboxBounds();
                this._bus?.emit('combat:hit', {
                    attacker: hb.owner,
                    target,
                    damage,
                    blocked,
                    ko: target.state === 'ko',
                    x: hurtbox.x + hurtbox.width / 2,
                    y: hurtbox.y,
                    big: hb.owner.currentAttack?.name === 'heavyPunch',
                });
            }

            if (hb.isExpired()) this._hitboxes.splice(i, 1);
        }
    }

    /** Drop all active hitboxes (new round). */
    clear() {
        this._hitboxes.length = 0;
    }
}
