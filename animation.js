export const ANIMATIONS = {
    idle: { frames: 1, frameDuration: 10, loop: true, color: '#FFFFFF' },
    walk: { frames: 2, frameDuration: 8, loop: true, color: '#00FF00' },
    jump: { frames: 1, frameDuration: 10, loop: false, color: '#FFA500' },
    lightPunch: { frames: 3, frameDuration: 6, loop: false, color: '#FF0000' },
    airPunch: { frames: 2, frameDuration: 6, loop: false, color: '#FF5555' },
    hit: { frames: 1, frameDuration: 10, loop: false, color: '#FF00FF' },
    ko: { frames: 1, frameDuration: 10, loop: false, color: '#000000' },
    block: { frames: 1, frameDuration: 10, loop: true, color: '#0000FF' },
    blockHit: { frames: 1, frameDuration: 6, loop: false, color: '#5555FF' },

};

export class AnimationController {
    constructor(animationsConfig, assetLoader) {
        this.animationsConfig = animationsConfig;
        this.assetLoader = assetLoader;

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
        const anim = this.animationsConfig[this.current];
        if (!anim) return;
        this.frameTimer++;

        if (this.frameTimer >= anim.frameDuration) {
            this.frameTimer = 0;
            this.frameIndex++;
            if (this.frameIndex >= anim.frameCount) {
                if (anim.loop) {
                    this.frameIndex = 0;
                } else {
                    this.frameIndex = anim.frameCount - 1;
                }
            }
        }
    }

    draw(ctx, x, y, width, height, facingRight = true) {
        const anim = this.animationsConfig[this.current];
        if (!anim) {
            // console.warn(`[AnimationController] No animationConfig for key='${this.current}'`);
            ctx.fillStyle = '#888';
            ctx.fillRect(x, y, width, height);
            return;
        }

        // const frameIndex = this.frameIndex;
        // const imageKeys = anim.imageKeys;
        // // Log the array and index if out of bounds
        // if (!Array.isArray(imageKeys)) {
        //     console.warn(`[AnimationController] imageKeys for animation='${this.current}' is not an array:`, imageKeys);
        // }
        // if (frameIndex < 0 || frameIndex >= imageKeys.length) {
        //     console.warn(`[AnimationController] frameIndex out of bounds for animation='${this.current}': frameIndex=${frameIndex}, imageKeys.length=${imageKeys.length}`);
        // }


        const imageKey = anim.imageKeys[this.frameIndex];
        const img = this.assetLoader.getImage(imageKey);
        if (!img) {
            ctx.fillStyle = '#f0f';
            ctx.fillRect(x, y, width, height);
            console.warn(`Missing image for key ${imageKey}`);
            return;
        }
        if (facingRight) {
            ctx.drawImage(img, x, y, width, height);
        } else {
            ctx.save();
            ctx.translate(x + width / 2, y + height / 2);
            ctx.scale(-1, 1);
            ctx.drawImage(img, -width / 2, -height / 2, width, height);
            ctx.restore();
        }
    }

    // drawPlaceholder(ctx, x, y, width, height, facingRight = true) {
    //     const anim = this.animations[this.current];
    //     if (!anim) {
    //         ctx.fillStyle = '#888';
    //     } else {
    //         ctx.fillStyle = anim.color;
    //     }
    //     ctx.fillRect(x, y, width, height);

    //     // Optional: draw a small indicator of frameIndex
    //     ctx.fillStyle = '#000';
    //     ctx.font = '10px sans-serif';
    //     ctx.fillText(this.current + ':' + this.frameIndex, x, y + height / 2);
    // }
}