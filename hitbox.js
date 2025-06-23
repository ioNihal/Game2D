export default class Hitbox {
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
        this.hasHit = new Set();
    }

    update() {
        this.age++;
    }

    isExpired() {
        return this.age >= this.duration;
    }

    getBounds() {
        const owner = this.owner;
        let x;
        if (owner.facingRight) {
            x = owner.x + this.offsetX;
        } else {
            x = owner.x + owner.width - this.offsetX - this.width;
        }

        const y = owner.y + this.offsetY;
        return { x, y, width: this.width, height: this.height };
    }

    checkCollision(target) {
        if (target === this.owner) return false;
        if (this.hasHit.has(target)) return false;
        const hb = this.getBounds();
        const tb =  target.getHurtboxBounds();

        //AABB collison

        if (
            hb.x < tb.x + tb.width &&
            hb.x + hb.width > tb.x &&
            hb.y < tb.y + tb.height &&
            hb.y + hb.height > tb.y
        ) {
            return true;
        }
        return false
    }

    markHit(target) {
        this.hasHit.add(target);
    }

    //fordebug
    drawDebug(ctx) {
        const { x, y, width, height } = this.getBounds();
        ctx.save();
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        ctx.restore();
    }
}