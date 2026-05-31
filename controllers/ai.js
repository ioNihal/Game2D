import { CONFIG } from '../configs/config.js';

/**
 * AIController — finite-state machine brain for the enemy fighter.
 *
 * AI States
 * 
 *  approach   — close the gap until preferred attack range is reached
 *  pressure   — in range; attacks and follows up on hits
 *  defensive  — opponent is attacking nearby; block or jump back
 *  retreat    — temporarily back away to reset spacing
 *  punish     — opponent just finished a whiffed attack; go in hard
 *
 * Difficulty levels control:
 *  • reactionDelay  — frames the AI waits before reacting to a threat
 *  • mistakeChance  — probability per frame to "forget" the optimal action
 *  • aggressionMult — scales attack frequency
 */
export default class AIController {
    /**
     * @param {import('./fighter.js').default} fighter     — the AI's fighter
     * @param {import('./fighter.js').default} opponent    — the player
     * @param {{ difficulty?: 'easy'|'normal'|'hard' }} [opts]
     */
    constructor(fighter, opponent, opts = {}) {
        this.fighter = fighter;
        this.opponent = opponent;

        // Will be set by setDifficulty()
        this.preferredRange = 90;
        this.blockProbability = 0.5;
        this.retreatProbability = 0.01;
        this.jumpProbability = 0.005;
        this.reactionDelay = 8;
        this.mistakeChance = 0.15;
        this.aggressionMult = 1.0;
        this.comboWindow = 20;  // frames after landing a hit to follow up

        // Internal state
        this._aiState = 'approach';
        this._stateTimer = 0;      // frames in current AI state
        this._reactionTimer = 0;      // counts down before AI acts on a threat
        this._comboTimer = 0;      // frames left to attempt a combo follow-up
        this._retreatTimer = 0;      // frames left in retreat
        this._blockDuration = 20;     // default block hold duration

        // Track whether we landed the last attack
        this._prevOpponentHealth = opponent.health;

        this.setDifficulty(opts.difficulty ?? 'normal');
    }

    //  Difficulty 

    setDifficulty(level) {
        switch (level) {
            case 'easy':
                this.preferredRange = 110;
                this.blockProbability = 0.25;
                this.retreatProbability = 0.03;
                this.jumpProbability = 0.015;
                this.reactionDelay = 18;
                this.mistakeChance = 0.35;
                this.aggressionMult = 0.6;
                this.comboWindow = 10;
                break;
            case 'normal':
                this.preferredRange = 90;
                this.blockProbability = 0.5;
                this.retreatProbability = 0.015;
                this.jumpProbability = 0.007;
                this.reactionDelay = 10;
                this.mistakeChance = 0.18;
                this.aggressionMult = 1.0;
                this.comboWindow = 20;
                break;
            case 'hard':
                this.preferredRange = 70;
                this.blockProbability = 0.78;
                this.retreatProbability = 0.005;
                this.jumpProbability = 0.012;
                this.reactionDelay = 4;
                this.mistakeChance = 0.05;
                this.aggressionMult = 1.4;
                this.comboWindow = 30;
                break;
        }
    }

    /**
     * Resets transient AI state for a new round.
     * Must be called whenever the opponent fighter is recreated.
     */
    reset() {
        this._aiState       = 'approach';
        this._stateTimer    = 0;
        this._reactionTimer = 0;
        this._comboTimer    = 0;
        this._retreatTimer  = 0;
        // Sync to current opponent HP so we don't fire a spurious combo on frame 1
        this._prevOpponentHealth = this.opponent.health;
    }

    //  Main update (called once per frame) 

    update() {
        const f = this.fighter;
        const p = this.opponent;

        // Dead or mid-animation — let physics play out
        if (f.state === 'ko') return;
        if (['attack_startup', 'attack_active', 'attack_recovery'].includes(f.state)) return;
        if (f.state === 'hitstun' && f.stunTimer > 0) return;
        if (f.state === 'jump_rise' || f.state === 'jump_fall') return;
        if (f.state === 'block' && f.aiBlockTimer > 0) return;

        // Tick internal timers
        this._stateTimer++;
        if (this._reactionTimer > 0) this._reactionTimer--;
        if (this._comboTimer > 0) this._comboTimer--;
        if (this._retreatTimer > 0) this._retreatTimer--;

        // Detect if we just landed a hit (opponent HP dropped)
        const currentOpponentHP = p.health;
        if (currentOpponentHP < this._prevOpponentHealth) {
            this._comboTimer = this.comboWindow;
        }
        this._prevOpponentHealth = currentOpponentHP;

        // Inject difficulty-based mistakes
        if (Math.random() < this.mistakeChance) return;

        const dx = p.x - f.x;
        const absDx = Math.abs(dx);

        // Panic mode: below 30% HP → skip retreat, always pressure
        const panicking = f.health / f.maxHealth < 0.3;

        //  Choose AI state 

        // Highest priority: opponent is attacking right next to us → defend
        const opponentAttacking = ['attack_startup', 'attack_active'].includes(p.state);
        if (opponentAttacking && absDx < this.preferredRange + 30 && !panicking) {
            this._transitionTo('defensive');
        }
        // Opponent just finished an attack they whiffed → punish
        else if (p.state === 'attack_recovery' && absDx < this.preferredRange + 40) {
            this._transitionTo('punish');
        }
        // Combo follow-up window open
        else if (this._comboTimer > 0 && absDx <= this.preferredRange) {
            this._transitionTo('pressure');
        }
        // In range → pressure
        else if (absDx <= this.preferredRange) {
            this._transitionTo('pressure');
        }
        // Too far → approach (or maybe jump in)
        else {
            if (!panicking && this._retreatTimer > 0) {
                this._transitionTo('retreat');
            } else {
                this._transitionTo('approach');
            }
        }

        //  Execute current AI state 

        switch (this._aiState) {
            case 'approach': this._doApproach(f, p, dx, absDx); break;
            case 'pressure': this._doPressure(f, p, absDx); break;
            case 'defensive': this._doDefensive(f, p); break;
            case 'retreat': this._doRetreat(f, p, dx); break;
            case 'punish': this._doPunish(f, p); break;
        }

        // Always face the opponent
        if (f.state !== 'block') {
            f.facingRight = dx > 0;
        }
    }

    //  State transitions 

    _transitionTo(newState) {
        if (this._aiState !== newState) {
            this._aiState = newState;
            this._stateTimer = 0;
        }
    }

    //  AI state behaviours 

    _doApproach(f, p, dx, absDx) {
        // Occasionally jump forward to vary approach
        if (Math.random() < this.jumpProbability && f.onGround) {
            f.vx = dx > 0 ? CONFIG.walkSpeed : -CONFIG.walkSpeed;
            f.enterState('jump_rise');
            return;
        }
        // Walk toward opponent
        if (dx > 0) {
            f.facingRight = true;
            f.vx = CONFIG.walkSpeed;
        } else {
            f.facingRight = false;
            f.vx = -CONFIG.walkSpeed;
        }
        f.enterState('walk');
    }

    _doPressure(f, p, absDx) {
        if (f.attackCooldown > 0) {
            // Stand still while cooling down
            f.enterState('idle');
            f.vx = 0;
            return;
        }

        // Select attack based on situation
        const attack = this._choosePressureAttack(f, absDx);
        if (attack) {
            f.startAttack(attack);
        } else {
            f.enterState('idle');
            f.vx = 0;
        }
    }

    _doDefensive(f, p) {
        if (this._reactionTimer > 0) return; // haven't reacted yet

        // Randomly decide: block or jump back
        if (Math.random() < this.blockProbability && f.onGround) {
            f.enterState('block');
            f.aiBlockTimer = this._blockDuration;
        } else {
            // Jump back
            const away = f.facingRight ? -1 : 1;
            f.vx = away * CONFIG.walkSpeed;
            if (f.onGround) f.enterState('jump_rise');
            this._retreatTimer = 30;
        }
        // Set reaction delay for next defensive action
        this._reactionTimer = this.reactionDelay;
    }

    _doRetreat(f, p, dx) {
        if (this._retreatTimer <= 0) return;
        // Step away from opponent
        f.facingRight = dx > 0;       // still face them
        f.vx = dx > 0 ? -CONFIG.walkSpeed : CONFIG.walkSpeed;
        f.enterState('walk');
    }

    _doPunish(f, p) {
        if (f.attackCooldown > 0) {
            f.enterState('idle');
            return;
        }
        // Punish with a heavy attack
        const punishMove = this._aiAttacks(f).find(a => a.name === 'heavyPunch')
            ?? this._aiAttacks(f)[0];
        if (punishMove) f.startAttack(punishMove.name);
    }

    //  Attack selection 

    /** Returns attacks the AI is allowed to use. */
    _aiAttacks(f) {
        return f.attacks.filter(a => a.allowAI !== false);
    }

    /**
     * Picks a pressure attack.
     * Heavy punch used as a punish/mix-up at ~30% chance;
     * sweep kick when opponent is standing still (not jumping).
     */
    _choosePressureAttack(f, absDx) {
        const viable = this._aiAttacks(f);
        if (viable.length === 0) return null;

        const isOpponentGrounded = this.opponent.onGround;
        const roll = Math.random() * this.aggressionMult;

        // Heavy punch as an occasional power move
        const heavy = viable.find(a => a.name === 'heavyPunch');
        if (heavy && roll < 0.25 && isOpponentGrounded) return heavy.name;

        // Sweep kick as a low mix-up
        const sweep = viable.find(a => a.name === 'sweepKick');
        if (sweep && roll < 0.4 && isOpponentGrounded) return sweep.name;

        // Default: light punch
        const light = viable.find(a => a.name === 'lightPunch');
        return light?.name ?? viable[0].name;
    }
}