import { CONFIG } from '../configs/config.js';
import { ARENA_THEME } from '../configs/arena.js';

/**
 * Renderer — owns the canvas/context, DPR-aware sizing, the arena background
 * (drawn from the config-driven ARENA_THEME), and the screen-shake transform
 * that wraps world layers (background, fighters, floating text). HUD/overlays
 * draw after endWorld() so they are never shaken.
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

    /**
     * Draws the arena from ARENA_THEME (configs/arena.js). Every layer can be
     * toggled/restyled via config; an optional backdrop image (asset key
     * 'arena_bg', injected by Game) is drawn behind everything.
     */
    drawBackground(ctx = this._ctx, backgroundImage = null) {
        const W = CONFIG.canvasWidth;
        const H = CONFIG.canvasHeight;
        const G = CONFIG.groundY;
        const theme = ARENA_THEME;

        if (backgroundImage) {
            ctx.drawImage(backgroundImage, 0, 0, W, H);
        }

        this._drawSky(ctx, theme, W, G);
        this._drawGround(ctx, theme, W, H, G);
        this._drawFloorLine(ctx, theme, W, G);

        if (theme.pillars?.enabled) this._drawPillars(ctx, theme, W, G);
        if (theme.crowd?.enabled) this._drawCrowd(ctx, theme, W, G);
        if (theme.grid?.enabled) this._drawGrid(ctx, theme, W, H, G);
        if (theme.footer?.enabled) this._drawFooter(ctx, theme, W, H, G);
    }

    //  Theme helpers

    /** Vertical linear gradient from { pos, color } stops. */
    _makeVerticalGradient(ctx, y0, y1, stops) {
        const grad = ctx.createLinearGradient(0, y0, 0, y1);
        for (const s of stops ?? []) grad.addColorStop(s.pos, s.color);
        return grad;
    }

    _drawSky(ctx, theme, W, G) {
        ctx.fillStyle = this._makeVerticalGradient(ctx, 0, G, theme.sky?.colors);
        ctx.fillRect(0, 0, W, G);
    }

    _drawGround(ctx, theme, W, H, G) {
        ctx.fillStyle = this._makeVerticalGradient(ctx, G, H, theme.ground?.colors);
        ctx.fillRect(0, G, W, H - G);
    }

    _drawFloorLine(ctx, theme, W, G) {
        const fl = theme.floorLine ?? {};
        ctx.save();
        if (fl.glow) {
            ctx.shadowColor = fl.glow;
            ctx.shadowBlur = fl.glowBlur ?? 18;
        }
        ctx.strokeStyle = fl.color ?? '#c084fc';
        ctx.lineWidth = fl.width ?? 2;
        ctx.beginPath();
        ctx.moveTo(0, G);
        ctx.lineTo(W, G);
        ctx.stroke();
        ctx.restore();
    }

    _drawPillars(ctx, theme, W, G) {
        for (const col of theme.pillars.columns ?? []) {
            const x = col.x < 0 ? W + col.x : col.x;
            this._drawPillar(ctx, theme, x, G, col);
        }
    }

    _drawPillar(ctx, theme, x, groundY, col) {
        const w = col.width ?? 25;
        const h = col.height ?? 160;
        ctx.save();
        const grad = ctx.createLinearGradient(x, groundY - h, x + w, groundY - h);
        for (const s of theme.pillars.gradient ?? []) grad.addColorStop(s.pos, s.color);
        ctx.fillStyle = grad;
        ctx.fillRect(x, groundY - h, w, h);

        // Neon edge
        const e = theme.pillars.edge ?? {};
        if (e.glow) {
            ctx.shadowColor = e.glow;
            ctx.shadowBlur = e.glowBlur ?? 10;
        }
        ctx.strokeStyle = e.color ?? '#7c3aed';
        ctx.lineWidth = e.width ?? 1;
        ctx.strokeRect(x, groundY - h, w, h);
        ctx.restore();
    }

    _drawCrowd(ctx, theme, W, G) {
        const c = theme.crowd ?? {};
        ctx.save();
        ctx.globalAlpha = c.alpha ?? 0.18;
        ctx.fillStyle = c.color ?? '#4a1d6e';
        const spacing = c.spacing ?? 18;
        const radius = c.radius ?? 9;
        for (let i = 0; i < W; i += spacing) {
            const h = 20 + Math.sin(i * 0.3) * 8 + Math.sin(i * 0.7 + 1) * 5;
            ctx.beginPath();
            ctx.arc(i + 9, G - h, radius, Math.PI, 0);
            ctx.fill();
        }
        ctx.restore();
    }

    _drawGrid(ctx, theme, W, H, G) {
        const g = theme.grid ?? {};
        ctx.save();
        ctx.globalAlpha = g.alpha ?? 0.12;
        ctx.strokeStyle = g.color ?? '#c084fc';
        ctx.lineWidth = g.width ?? 1;

        const rows = g.rows ?? 5;
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

        const cols = g.cols ?? 7;
        for (let c = 0; c <= cols; c++) {
            const t = c / cols;
            ctx.beginPath();
            ctx.moveTo(W * t, G);
            ctx.lineTo(W / 2 * (1 - (1 - t * 2 < 0 ? -(t * 2 - 1) : 1 - t * 2)), H);
            ctx.stroke();
        }
        ctx.restore();
    }

    _drawFooter(ctx, theme, W, H, G) {
        const f = theme.footer ?? {};
        ctx.fillStyle = f.color ?? '#0d0810';
        const off = f.offsetY ?? 1;
        ctx.fillRect(0, G + off, f.leftWidth ?? 120, H - G - off);
        ctx.fillRect(W - (f.rightWidth ?? 145), G + off, f.rightWidth ?? 145, H - G - off);
    }
}