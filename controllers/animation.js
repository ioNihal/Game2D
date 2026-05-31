/**
 * AnimationController — drives frame-by-frame sprite playback.
 * Handles looping vs. one-shot animations and horizontal flip for
 * left-facing characters.
 */
export class AnimationController {
    /**
     * @param {Record<string, { frameCount: number, frameDuration: number, loop: boolean, imageKeys: string[] }>} animationsConfig
     * @param {import('../utils/assetLoader.js').default} assetLoader
     */
    constructor(animationsConfig, assetLoader) {
        this._config = animationsConfig;
        this._loader = assetLoader;
        this.current = 'idle';
        this._frameIndex = 0;
        this._frameTimer = 0;
    }

    //  Control 

    /** Switch to `key`; resets to frame 0 only when the key actually changes. */
    setAnimation(key) {
        if (this.current === key) return;
        this.current = key;
        this._frameIndex = 0;
        this._frameTimer = 0;
    }

    /** Advances the frame timer; must be called once per game frame. */
    update() {
        const anim = this._config[this.current];
        if (!anim) return;

        this._frameTimer++;
        if (this._frameTimer >= anim.frameDuration) {
            this._frameTimer = 0;
            this._frameIndex++;
            if (this._frameIndex >= anim.frameCount) {
                this._frameIndex = anim.loop ? 0 : anim.frameCount - 1;
            }
        }
    }

    //  Rendering 

    /**
     * Draws the current frame onto `ctx`.
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     * @param {boolean} [facingRight=true]
     * @param {number} [drawOffsetY=70]  — vertical nudge to align sprite in bounding box
     */
    draw(ctx, x, y, width, height, facingRight = true, drawOffsetY = 70) {
        const anim = this._config[this.current];
        if (!anim) {
            ctx.fillStyle = '#888';
            ctx.fillRect(x, y, width, height);
            return;
        }

        const imageKey = anim.imageKeys[this._frameIndex];
        const img = this._loader.getImage(imageKey);

        if (!img) {
            ctx.fillStyle = '#f0f';
            ctx.fillRect(x, y, width, height);
            return;
        }

        const drawY = y + drawOffsetY;

        if (facingRight) {
            ctx.drawImage(img, x, drawY, width, height);
        } else {
            ctx.save();
            ctx.translate(x + width / 2, drawY + height / 2);
            ctx.scale(-1, 1);
            ctx.drawImage(img, -width / 2, -height / 2, width, height);
            ctx.restore();
        }
    }
}