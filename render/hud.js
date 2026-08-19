import { CONFIG } from '../configs/config.js';

/**
 * HUD — health bars (with ghost bar), name plates, round info, and win pips.
 * Pure rendering: receives a plain state object each frame.
 */
export default class HUD {
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {{
     *   playerHealth: number, playerGhostHP: number, playerMaxHealth: number,
     *   enemyHealth: number,  enemyGhostHP:  number,  enemyMaxHealth:  number,
     *   playerWins: number, enemyWins: number, round: number,
     * }} s
     */
    draw(ctx, s) {
        const BAR_W = 220;
        const BAR_H = 18;
        const PAD = 20;
        const BAR_Y = PAD;

        // Player bar (left)
        this._drawHealthBar(ctx, PAD, BAR_Y, BAR_W, BAR_H, s.playerHealth, s.playerGhostHP, s.playerMaxHealth);
        // Enemy bar (right)
        this._drawHealthBar(ctx, CONFIG.canvasWidth - BAR_W - PAD, BAR_Y, BAR_W, BAR_H, s.enemyHealth, s.enemyGhostHP, s.enemyMaxHealth);

        // Name plates
        ctx.save();
        ctx.font = `bold 13px 'Jersey 10', sans-serif`;
        ctx.fillStyle = '#e2e8f0';
        ctx.textAlign = 'left';
        ctx.fillText('YOU', PAD, BAR_Y + BAR_H + 14);
        ctx.textAlign = 'right';
        ctx.fillText('ENEMY', CONFIG.canvasWidth - PAD, BAR_Y + BAR_H + 14);
        ctx.restore();

        // Round + score indicator (top center)
        this._drawRoundInfo(ctx, s.round, s.playerWins, s.enemyWins);
    }

    _drawHealthBar(ctx, x, y, w, h, hp, ghostHp, maxHp) {
        const pct = Math.max(0, hp) / maxHp;
        const ghostPct = Math.max(0, ghostHp) / maxHp;

        // Background track
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(x - 2, y - 2, w + 4, h + 4);

        // Ghost bar (orange, lags behind real HP)
        ctx.fillStyle = 'rgba(251, 146, 60, 0.55)';
        ctx.fillRect(x, y, w * ghostPct, h);

        // Actual HP bar with gradient
        const hpW = w * pct;
        if (hpW > 0) {
            const grad = ctx.createLinearGradient(x, y, x + hpW, y);
            if (pct > 0.5) { grad.addColorStop(0, '#22c55e'); grad.addColorStop(1, '#4ade80'); }
            else if (pct > 0.25) { grad.addColorStop(0, '#f59e0b'); grad.addColorStop(1, '#fbbf24'); }
            else { grad.addColorStop(0, '#ef4444'); grad.addColorStop(1, '#f87171'); }
            ctx.fillStyle = grad;
            ctx.fillRect(x, y, hpW, h);
        }

        // Border
        ctx.save();
        ctx.shadowColor = pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#f59e0b' : '#ef4444';
        ctx.shadowBlur = 6;
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
    }

    _drawRoundInfo(ctx, round, playerWins, enemyWins) {
        const cx = CONFIG.canvasWidth / 2;
        ctx.save();
        ctx.textAlign = 'center';

        // Round label
        ctx.font = `bold 14px 'Jersey 10', sans-serif`;
        ctx.fillStyle = '#c4b5fd';
        ctx.fillText(`ROUND ${round}`, cx, 58);

        // Win pips
        const pipR = 5;
        const pipGap = 14;
        const total = CONFIG.roundsToWin;
        const rowY = 34;

        // Player pips (left of center)
        for (let i = 0; i < total; i++) {
            ctx.beginPath();
            ctx.arc(cx - 20 - i * pipGap, rowY, pipR, 0, Math.PI * 2);
            ctx.fillStyle = i < playerWins ? '#22c55e' : 'rgba(255,255,255,0.2)';
            ctx.fill();
        }
        // Enemy pips (right of center)
        for (let i = 0; i < total; i++) {
            ctx.beginPath();
            ctx.arc(cx + 20 + i * pipGap, rowY, pipR, 0, Math.PI * 2);
            ctx.fillStyle = i < enemyWins ? '#ef4444' : 'rgba(255,255,255,0.2)';
            ctx.fill();
        }
        ctx.restore();
    }
}
