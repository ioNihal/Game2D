import { CONFIG } from '../configs/config.js';

/**
 * FloatingText — a damage number that drifts upward and fades out.
 */
export default class FloatingText {
    constructor(text, x, y) {
        this.text = text;
        this.x = x;
        this.y = y;
        this.life = CONFIG.floatTextLife;
        this.maxLife = CONFIG.floatTextLife;
    }

    update() {
        this.y -= CONFIG.floatTextSpeed;
        this.life--;
    }

    isExpired() { return this.life <= 0; }

    draw(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `bold 18px 'Jersey 10', sans-serif`;
        ctx.fillStyle = '#ffdd44';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        ctx.strokeText(this.text, this.x, this.y);
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}
