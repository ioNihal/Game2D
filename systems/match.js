import { CONFIG } from '../configs/config.js';

const FRAME_MS = 1000 / 60;

/**
 * MatchSystem — owns match/round state: round number, win counts, the round
 * intro countdown, and the KO delay. All timing is frame-based (1/60 s each)
 * so round transitions are deterministic at any refresh rate — no `setTimeout`.
 *
 * Phases: 'idle' → 'intro' → 'fighting' → ('koDelay' → 'roundEnd' | 'matchOver')
 *
 * Events emitted on the bus:
 *   match:roundStart  { round }                     — new round begins (intro)
 *   match:fight       { round }                     — intro over, combat begins
 *   match:ko          { winner }                    — a fighter was KO'd (delay starts)
 *   match:roundEnd    { winner, playerWins, enemyWins, round, matchOver }
 */
export default class MatchSystem {
    /**
     * @param {{ bus: import('../core/eventBus.js').default }} deps
     */
    constructor({ bus }) {
        this._bus = bus;
        this.reset();
    }

    reset() {
        this.phase = 'idle';
        this.round = 0;
        this.playerWins = 0;
        this.enemyWins = 0;
        this.winner = null;
        this._introFrames = 0;
        this._koDelayFrames = 0;
    }

    //  Public API

    get isIdle() { return this.phase === 'idle'; }
    get isIntro() { return this.phase === 'intro'; }
    get isFighting() { return this.phase === 'fighting'; }
    get isRoundEnd() { return this.phase === 'roundEnd'; }
    get isMatchOver() { return this.phase === 'matchOver'; }
    /** A round is settled — fighters should not be updated. */
    get isSettled() { return this.phase === 'roundEnd' || this.phase === 'matchOver'; }
    /** Remaining intro time in ms (for the intro overlay countdown). */
    get introMs() { return this._introFrames * FRAME_MS; }

    /** Begin a fresh match at round 1. */
    startMatch() {
        this.playerWins = 0;
        this.enemyWins = 0;
        this._beginRound(1);
    }

    /** Start the next round (after a settled round). */
    nextRound() {
        if (!this.isSettled) return;
        if (this.isMatchOver) {
            this.playerWins = 0;
            this.enemyWins = 0;
            this._beginRound(1);           // full rematch
        } else {
            this._beginRound(this.round + 1);
        }
    }

    /** Advance one fixed logic step (1/60 s). Call every frame from the loop. */
    update() {
        if (this.isIntro) {
            this._introFrames--;
            if (this._introFrames <= 0) {
                this.phase = 'fighting';
                this._bus.emit('match:fight', { round: this.round });
            }
        } else if (this.phase === 'koDelay') {
            this._koDelayFrames--;
            if (this._koDelayFrames <= 0) this._resolveRound();
        }
    }

    /** Called when a fighter enters 'ko'; winner is 'player' | 'enemy'. */
    onKO(winner) {
        if (!this.isFighting) return;
        this.winner = winner;
        this.phase = 'koDelay';
        this._koDelayFrames = Math.round(CONFIG.koDelayMs / FRAME_MS);
        this._bus.emit('match:ko', { winner });
    }

    //  Internals

    _beginRound(round) {
        this.round = round;
        this.winner = null;
        this.phase = 'intro';
        this._introFrames = Math.round(CONFIG.roundIntroMs / FRAME_MS);
        this._bus.emit('match:roundStart', { round });
    }

    _resolveRound() {
        if (this.winner === 'player') this.playerWins++;
        else this.enemyWins++;

        const matchOver = this.playerWins >= CONFIG.roundsToWin
            || this.enemyWins >= CONFIG.roundsToWin;
        this.phase = matchOver ? 'matchOver' : 'roundEnd';

        this._bus.emit('match:roundEnd', {
            winner: this.winner,
            playerWins: this.playerWins,
            enemyWins: this.enemyWins,
            round: this.round,
            matchOver,
        });
    }
}