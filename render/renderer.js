import { CONFIG } from '../configs/config.js';

/**
 * Renderer — owns the canvas/context, DPR-aware sizing, the arena background,
 * and the screen-shake transform that wraps world layers (background, fighters,
 * floating text). HUD/overlays draw after endWorld() so they are never shaken.
 */
export default class Renderer {
    constructor(canvas) {
        this._canvas = canvas;
        this._ctx = canvas.getContext('2d');
    }

    /** The shared 2D context. */
    get ctx() { return this._ctx; }

    /**
     * Fit the canvas to the window and apply DPR for crisp rendering on
     * high-DPI displays. Drawing stays in logical (CONFIG) coordinates.
     */
    resize() {
        const dpr = window.devicePixelRatio || 1;
        this._dpr = dpr;
        this._canvas.width = Math.round(CONFIG.canvasWidth * dpr);
        this._canvas.height = Math.round(CONFIG.canvasHeight * dpr);
        this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const scaleX = window.innerWidth / CONFIG.canvasWidth;
        const scaleY = window.innerHeight / CONFIG.canvasHeight;
        const scale = Math.min(scaleX, scaleY);
        this._canvas.style.width = `${CONFIG.canvasWidth * scale}px`;
        this._canvas.style.height = `${CONFIG.canvasHeight * scale}px`;
    }

    //  World transform (screen shake)

    /** Save + translate by the shake offset. Call before world layers. */
    beginWorld(shakeX = 0, shakeY = 0) {
        this._ctx.save();
        this._ctx.translate(Math.round(shakeX), Math.round(shakeY));
    }

    /** Restore the transform — HUD/overlays draw after this (unshaken). */
    endWorld() {
        this._ctx.restore();
    }

    //  Background

    drawBackground(ctx = this._ctx) {
        const W = CONFIG.canvasWidth;
        const H = CONFIG.canvasHeight;
        const G = CONFIG.groundY;

        // Sky gradient
        const sky = ctx.createLinearGradient(0, 0, 0, G);
        sky.addColorStop(0, '#0a0a1a');
        sky.addColorStop(0.6, '#1a1030');
        sky.addColorStop(1, '#2a1545');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, G);

        // Ground
        const ground = ctx.createLinearGradient(0, G, 0, H);
        ground.addColorStop(0, '#1a1020');
        ground.addColorStop(1, '#0d0810');
        ctx.fillStyle = ground;
        ctx.fillRect(0, G, W, H - G);

        // Neon floor line
        ctx.save();
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 18;
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, G);
        ctx.lineTo(W, G);
        ctx.stroke();
        ctx.restore();

        // Arena edge pillars (decorative)
        this._drawPillar(ctx, 30, G);
        this._drawPillar(ctx, W - 55, G);

        // Crowd silhouette
        this._drawCrowd(ctx, W, G);

        // Ground grid lines (perspective)
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 1;
        const rows = 5;
        for (let r = 0; r <= rows; r++) {
            const t = r / rows;
            const y = G + t * (H - G);
            const xL = W / 2 * (1 - t);
            const xR = W - xL;
            ctx.beginPath();
            ctx.moveTo(xL, y);
            ctx.lineTo(xR, y);
            ctx.stroke();
        }
        const cols = 7;
        for (let c = 0; c <= cols; c++) {
            const t = c / cols;
            ctx.beginPath();
            ctx.moveTo(W * t, G);
            ctx.lineTo(W / 2 * (1 - (1 - t * 2 < 0 ? -(t * 2 - 1) : 1 - t * 2)), H);
            ctx.stroke();
        }
        ctx.restore();

        // Black footer behind sprite overflow
        ctx.fillStyle = '#0d0810';
        ctx.fillRect(0, G + 1, 120, H - G - 1);
        ctx.fillRect(W - 145, G + 1, 145, H - G - 1);
    }

    _drawPillar(ctx, x, groundY) {
        const h = 160;
        ctx.save();
        const grad = ctx.createLinearGradient(x, groundY - h, x + 25, groundY - h);
        grad.addColorStop(0, '#6b21a8');
        grad.addColorStop(1, '#1e0a2e');
        ctx.fillStyle = grad;
        ctx.fillRect(x, groundY - h, 25, h);

        // Neon edge
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, groundY - h, 25, h);
        ctx.restore();
    }

    _drawCrowd(ctx, W, G) {
        ctx.save();
        ctx.globalAlpha = 0.18;
        // Simple crowd of silhouette bumps
        ctx.fillStyle = '#4a1d6e';
        for (let i = 0; i < W; i += 18) {
            const h = 20 + Math.sin(i * 0.3) * 8 + Math.sin(i * 0.7 + 1) * 5;
            ctx.beginPath();
            ctx.arc(i + 9, G - h, 9, Math.PI, 0);
            ctx.fill();
        }
        ctx.restore();
    }
}
