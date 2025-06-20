export const ANIMATIONS = {
    idle: { frames: 1, frameDuration: 10, loop: true, color: '#FFFFFF' },
    walk: { frames: 2, frameDuration: 8, loop: true, color: '#00FF00' },
    jump: { frames: 1, frameDuration: 10, loop: false, color: '#FFA500' },
    lightPunch: { frames: 3, frameDuration: 6, loop: false, color: '#FF0000' },
    airPunch: { frames: 2, frameDuration: 6, loop: false, color: '#FF5555' },
    hit: { frames: 1, frameDuration: 10, loop: false, color: '#FF00FF' },

};

export class AnimationController {
    constructor(animations) {
        this.animations = animations;
        this.current = 'idle';
        this.frameIndex = 0;
        this.frameTimer = 0;
    }

    setAnimation(key) {
        if (this.current !== key) {
            this.current = key;
            this.frameIndex = 0;
            this.frameTimer = 0;
        }
    }

    update() {
        const anim = this.animations[this.current];
        if (!anim) return;
        this.frameTimer++;

        if (this.frameTimer >= anim.frameDuration) {
            this.frameTimer = 0;
            this.frameIndex++;
            if (this.frameIndex >= anim.frames) {
                if (anim.loop) {
                    this.frameIndex = 0;
                } else {
                    this.frameIndex = anim.frames - 1;
                }
            }
        }
    }

    drawPlaceholder(ctx, x, y, width, height, facingRight = true) {
        const anim = this.animations[this.current];
        if (!anim) {
            ctx.fillStyle = '#888';
        } else {
            ctx.fillStyle = anim.color;
        }
        ctx.fillRect(x, y, width, height);

        // Optional: draw a small indicator of frameIndex
        ctx.fillStyle = '#000';
        ctx.font = '10px sans-serif';
        ctx.fillText(this.current + ':' + this.frameIndex, x, y + height / 2);
    }
}