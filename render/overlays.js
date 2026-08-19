import { CONFIG } from '../configs/config.js';

/**
 * Overlays — full-screen drawn layers: round intro, game-over, and combo text.
 * Pure rendering: receives a plain state object each frame.
 */
export default class Overlays {
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {{ round: number, timer: number }} s
     */
    drawIntro(ctx, s) {
        const W = CONFIG.canvasWidth;
        const H = CONFIG.canvasHeight;
        const t = 1 - s.timer / CONFIG.roundIntroMs;

        // Fade-in → hold → fade-out
        let alpha;
        if (t < 0.2) alpha = t / 0.2;
        else if (t < 0.7) alpha = 1;
        else alpha = (1 - t) / 0.3;

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, W, H);

        const roundDone = t > 0.65;
        const text = roundDone ? 'FIGHT!' : `ROUND ${s.round}`;

        ctx.font = `bold 72px 'Jersey 10', sans-serif`;
        ctx.textAlign = 'center';
        ctx.shadowColor = roundDone ? '#fbbf24' : '#c084fc';
        ctx.shadowBlur = 30;
        ctx.fillStyle = roundDone ? '#fef08a' : '#e9d5ff';
        ctx.fillText(text, W / 2, H / 2 + 20);
        ctx.restore();
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {{ winner: string|null, playerWins: number, enemyWins: number }} s
     */
    drawGameOver(ctx, s) {
        const W = CONFIG.canvasWidth;
        const H = CONFIG.canvasHeight;
        const matchOver = s.playerWins >= CONFIG.roundsToWin || s.enemyWins >= CONFIG.roundsToWin;

        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(0, 0, W, H);

        ctx.save();
        ctx.textAlign = 'center';

        // Result text
        let resultText;
        if (matchOver) {
            resultText = s.playerWins >= CONFIG.roundsToWin ? 'YOU WIN THE MATCH!' : 'ENEMY WINS THE MATCH';
        } else {
            resultText = s.winner === 'player' ? 'ROUND WIN!' : 'ROUND LOST';
        }

        ctx.font = `bold 52px 'Jersey 10', sans-serif`;
        ctx.shadowColor = s.winner === 'player' ? '#22c55e' : '#ef4444';
        ctx.shadowBlur = 25;
        ctx.fillStyle = s.winner === 'player' ? '#86efac' : '#fca5a5';
        ctx.fillText(resultText, W / 2, H / 2 - 20);

        // Score
        ctx.font = `24px 'Jersey 10', sans-serif`;
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#c4b5fd';
        ctx.fillText(`${s.playerWins} — ${s.enemyWins}`, W / 2, H / 2 + 20);

        // Rematch hint
        ctx.font = `18px 'Jersey 10', sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText(matchOver ? 'Press REMATCH to play again' : 'Press NEXT ROUND or QUIT', W / 2, H / 2 + 55);
        ctx.restore();
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} count
     */
    drawCombo(ctx, count) {
        if (count < 2) return;
        const W = CONFIG.canvasWidth;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = `bold 28px 'Jersey 10', sans-serif`;
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#fef08a';
        ctx.fillText(`${count}-HIT COMBO!`, W / 2, CONFIG.canvasHeight - 30);
        ctx.restore();
    }
}
