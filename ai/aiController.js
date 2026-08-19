/**
 * VirtualInput — a lightweight action buffer the AI writes to.
 * Mirrors the InputHandler query interface (isDown / justPressed) so the
 * fighter's state machine works identically whether driven by a human or AI.
 */
class VirtualInput {
    constructor() {
        /** @type {Record<string, boolean>} */
        this._held = {};
        /** @type {Record<string, boolean>} */
        this._justPressed = {};
        /** @type {Record<string, boolean>} */
        this._prev = {};
    }

    isDown(action) { return !!this._held[action]; }
    justPressed(action) { return !!this._justPressed[action]; }

    down(action) { this._held[action] = true; }
    up(action) { this._held[action] = false; }

    /** Snapshot for rising-edge detection — call once per frame AFTER the fighter reads input. */
    update() {
        for (const key of Object.keys(this._held)) {
            this._justPressed[key] = this._held[key] && !this._prev[key];
        }
        this._prev = { ...this._held };
    }
}

//  Per-difficulty tuning defaults (overridden by the enemy's `ai` config block) 
const DEFAULT_TUNING = Object.freeze({
    preferredRange: 90,
    blockProbability: 0.5,
    retreatProbability: 0.01,
    jumpProbability: 0.005,
    reactionDelay: 8,
    mistakeChance: 0.15,
    aggressionMult: 1.0,
    comboWindow: 20,
});

/**
 * AIController — drives an enemy fighter through a VirtualInput buffer.
 *
 * Instead of manipulating fighter state directly, the AI presses semantic
 * actions (moveLeft, moveRight, jump, block, lightPunch, heavyPunch,
 * sweepKick) and the fighter's own state machine resolves them exactly as
 * it would for a human player.
 *
 * Difficulty tuning is merged from three sources (last wins):
 *   1. DEFAULT_TUNING (hardcoded)
 *   2. The character config's `ai` block (per-difficulty overrides)
 *   3. SettingsStore difficulty (live-switchable)
 *
 * AI States:
 *   approach  — close the gap until preferred attack range is reached
 *   pressure  — in range; attacks and follows up on hits
 *   defensive — opponent is attacking nearby; block or jump back
 *   retreat   — temporarily back away to reset spacing
 *   punish    — opponent just finished a whiffed attack; go in hard
 */
export default class AIController {
    /**
     * @param {import('../entities/fighter.js').default} fighter
     * @param {import('../entities/fighter.js').default} opponent
     * @param {{ difficulty?: string, characterConfig?: object }} [opts]
     */
    constructor(fighter, opponent, opts = {}) {
        this.fighter = fighter;
        this.opponent = opponent;
        this._characterConfig = opts.characterConfig ?? {};

        // VirtualInput the fighter will read each frame
        this._input = new VirtualInput();

        // Merged tuning (apply defaults → config → difficulty)
        this._tuning = { ...DEFAULT_TUNING };
        this._applyCharacterTuning();
        this.setDifficulty(opts.difficulty ?? 'normal');

        // Internal AI state
        this._aiState = 'approach';
        this._stateTimer = 0;
        this._reactionTimer = 0;
        this._comboTimer = 0;
        this._retreatTimer = 0;
        this._blockHold = 0;        // frames to keep block held
        this._prevOpponentHealth = opponent.health;

        // Active attack being tracked (for follow-up decisions)
        this._activeAttack = null;
    }

    //  Difficulty 

    /** Returns the VirtualInput buffer for the current frame. */
    getInput() { return this._input; }

    setDifficulty(level) {
        // Merge: defaults → character config → difficulty-specific overrides
        this._applyCharacterTuning();
        const diffOverrides = this._characterConfig.ai?.[level] ?? {};
        Object.assign(this._tuning, diffOverrides);
    }

    /** Apply the character config's `ai` block (non-difficulty-specific keys). */
    _applyCharacterTuning() {
        const aiCfg = this._characterConfig.ai ?? {};
        const { easy, normal, hard, ...base } = aiCfg;
        Object.assign(this._tuning, base);
    }

    reset() {
        this._aiState = 'approach';
        this._stateTimer = 0;
        this._reactionTimer = 0;
        this._comboTimer = 0;
        this._retreatTimer = 0;
        this._blockHold = 0;
        this._activeAttack = null;
        this._prevOpponentHealth = this.opponent.health;
        this._releaseAll();
    }

    //  Main update 

    update() {
        const f = this.fighter;
        const p = this.opponent;
        const t = this._tuning;

        // Dead — no decisions
        if (f.state === 'ko') return;
        // Mid-attack — let it play out
        if (['attack_startup', 'attack_active', 'attack_recovery'].includes(f.state)) return;
        // Hitstun — physics handles recovery
        if (f.state === 'hitstun' && f.stunTimer > 0) return;
        // In the air — no decisions while airborne
        if (f.state === 'jump_rise' || f.state === 'jump_fall') return;

        // Tick timers
        this._stateTimer++;
        if (this._reactionTimer > 0) this._reactionTimer--;
        if (this._comboTimer > 0) this._comboTimer--;
        if (this._retreatTimer > 0) this._retreatTimer--;

        // Handle block hold release
        if (this._blockHold > 0) {
            this._blockHold--;
            if (this._blockHold <= 0) {
                this._input.up('block');
            }
            return; // hold position while blocking
        }

        // Detect landed hit (opponent HP dropped)
        if (p.health < this._prevOpponentHealth) {
            this._comboTimer = t.comboWindow;
        }
        this._prevOpponentHealth = p.health;

        // Difficulty-based mistake chance
        if (Math.random() < t.mistakeChance) return;

        const dx = p.x - f.x;
        const absDx = Math.abs(dx);
        const panicking = f.health / f.maxHealth < 0.3;

        //  Choose AI state 

        const opponentAttacking = ['attack_startup', 'attack_active'].includes(p.state);
        if (opponentAttacking && absDx < t.preferredRange + 30 && !panicking) {
            this._transitionTo('defensive');
        } else if (p.state === 'attack_recovery' && absDx < t.preferredRange + 40) {
            this._transitionTo('punish');
        } else if (this._comboTimer > 0 && absDx <= t.preferredRange) {
            this._transitionTo('pressure');
        } else if (absDx <= t.preferredRange) {
            this._transitionTo('pressure');
        } else {
            if (!panicking && this._retreatTimer > 0) {
                this._transitionTo('retreat');
            } else {
                this._transitionTo('approach');
            }
        }

        //  Execute current AI state 

        switch (this._aiState) {
            case 'approach': this._doApproach(f, dx, absDx); break;
            case 'pressure': this._doPressure(f, absDx); break;
            case 'defensive': this._doDefensive(f, dx); break;
            case 'retreat': this._doRetreat(f, dx); break;
            case 'punish': this._doPunish(f); break;
        }

        // Face the opponent (via movement direction)
        if (f.state !== 'block') {
            f.facingRight = dx > 0;
        }

        // Sync virtual input update for justPressed detection
        this._input.update();
    }

    //  State transitions 

    _transitionTo(newState) {
        if (this._aiState !== newState) {
            this._aiState = newState;
            this._stateTimer = 0;
        }
    }

    //  Release all held actions 

    _releaseAll() {
        this._input.up('moveLeft');
        this._input.up('moveRight');
        this._input.up('jump');
        this._input.up('block');
        this._input.up('lightPunch');
        this._input.up('heavyPunch');
        this._input.up('sweepKick');
    }

    //  AI state behaviours — all emit actions via VirtualInput 

    _doApproach(f, dx, absDx) {
        const t = this._tuning;

        // Occasionally jump forward
        if (Math.random() < t.jumpProbability && f.onGround) {
            this._releaseAll();
            this._input.down(dx > 0 ? 'moveRight' : 'moveLeft');
            this._input.down('jump');
            return;
        }

        // Walk toward opponent
        this._releaseAll();
        this._input.down(dx > 0 ? 'moveRight' : 'moveLeft');
    }

    _doPressure(f, absDx) {
        const t = this._tuning;

        if (f.attackCooldown > 0) {
            this._releaseAll();
            return;
        }

        const attack = this._choosePressureAttack(absDx);
        if (attack) {
            this._releaseAll();
            this._input.down(attack);
        } else {
            this._releaseAll();
        }
    }

    _doDefensive(f, dx) {
        const t = this._tuning;

        if (this._reactionTimer > 0) return;

        if (Math.random() < t.blockProbability && f.onGround) {
            this._releaseAll();
            this._input.down('block');
            this._blockHold = 20; // hold block for ~20 frames
        } else {
            // Jump back
            this._releaseAll();
            this._input.down(dx > 0 ? 'moveLeft' : 'moveRight');
            this._input.down('jump');
            this._retreatTimer = 30;
        }
        this._reactionTimer = t.reactionDelay;
    }

    _doRetreat(f, dx) {
        if (this._retreatTimer <= 0) return;
        this._releaseAll();
        this._input.down(dx > 0 ? 'moveLeft' : 'moveRight');
    }

    _doPunish(f) {
        if (f.attackCooldown > 0) {
            this._releaseAll();
            return;
        }
        const punishMove = this._aiAttacks().find(a => a.name === 'heavyPunch')
            ?? this._aiAttacks()[0];
        if (punishMove) {
            this._releaseAll();
            this._input.down(punishMove.name === 'heavyPunch' ? 'heavyPunch' : punishMove.name);
        }
    }

    //  Attack selection 

    _aiAttacks() {
        return this.fighter.attacks.filter(a => a.allowAI !== false);
    }

    _choosePressureAttack(absDx) {
        const t = this._tuning;
        const viable = this._aiAttacks();
        if (viable.length === 0) return null;

        const isOpponentGrounded = this.opponent.onGround;
        const roll = Math.random() * t.aggressionMult;

        const heavy = viable.find(a => a.name === 'heavyPunch');
        if (heavy && roll < 0.25 && isOpponentGrounded) return 'heavyPunch';

        const sweep = viable.find(a => a.name === 'sweepKick');
        if (sweep && roll < 0.4 && isOpponentGrounded) return 'sweepKick';

        const light = viable.find(a => a.name === 'lightPunch');
        return light ? 'lightPunch' : viable[0]?.name ?? null;
    }
}
