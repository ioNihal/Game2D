/**
 * Hitbox — an axis-aligned bounding box spawned by a Fighter during an attack.
 * Lives for a fixed number of frames and can only hit each target once.
 */
export default class Hitbox {
    /**
     * @param {{
     *   owner: object,
     *   offsetX: number,
     *   offsetY: number,
     *   width: number,
     *   height: number,
     *   damage: number,
     *   knockbackX: number,
     *   knockbackY: number,
     *   durationFrames: number,
     * }} config
     */
    constructor({ owner, offsetX, offsetY, width, height, damage, knockbackX, knockbackY, durationFrames }) {
        this.owner = owner;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.width = width;
        this.height = height;
        this.damage = damage;
        this.knockbackX = knockbackX;
        this.knockbackY = knockbackY;
        this.duration = durationFrames;
        this.age = 0;

        /** @type {Set<object>} — prevents hitting the same target twice */
        this._hitTargets = new Set();
    }

    //  Lifecycle 

    update() { this.age++; }
    isExpired() { return this.age >= this.duration; }
    markHit(target) { this._hitTargets.add(target); }

    //  Geometry 

    getBounds() {
        const { owner, offsetX, width } = this;
        const x = owner.facingRight
            ? owner.x + offsetX
            : owner.x + owner.width - offsetX - width;
        const y = owner.y + this.offsetY;
        return { x, y, width: this.width, height: this.height };
    }

    checkCollision(target) {
        if (target === this.owner) return false;
        if (this._hitTargets.has(target)) return false;

        const hb = this.getBounds();
        const tb = target.getHurtboxBounds();

        // AABB overlap test
        return (
            hb.x < tb.x + tb.width &&
            hb.x + hb.width > tb.x &&
            hb.y < tb.y + tb.height &&
            hb.y + hb.height > tb.y
        );
    }

    //  Debug 

    drawDebug(ctx) {
        const { x, y, width, height } = this.getBounds();
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 50, 50, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        ctx.restore();
    }
}