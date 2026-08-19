import { CONFIG } from '../configs/config.js';
import Hitbox from './hitbox.js';
import { createStateMachine } from '../core/stateMachine.js';
import { FIGHTER_STATES } from './fighterStates.js';

/**
 * Fighter — a playable or AI-controlled character, built from one character
 * config (configs/characters/*.js). Gameplay state lives in a generic
 * state machine (core/stateMachine.js + entities/fighterStates.js).
 *
 * The fighter owns no rendering concerns beyond drawing its own sprite, and it
 * never touches audio or input directly — sound is emitted as `sfx` events on
 * the optional EventBus (`bus`). Its AnimationController is injected (built by
 * CharacterFactory) so the fighter stays ignorant of asset keys.
 */
export default class Fighter {
    /**
     * @param {{
     *   character: object,
     *   x: number,
     *   y: number,
     *   animController?: import('../render/animationController.js').AnimationController|null,
     *   bus?: import('../core/eventBus.js').default,
     * }} cfg
     */
    constructor({ character, x, y, animController, bus }) {
        this.id = character.id;
        this.displayName = character.displayName;
        this._character = character;

        this.x = x;
        this.y = y;
        this.width = character.physics.width;
        this.height = character.physics.height;
        this._baseMaxHealth = character.physics.maxHealth;
        this._statMultipliers = { maxHealth: 1, damage: 1, walkSpeed: 1, jump: 1 };
        this.maxHealth = this._baseMaxHealth * this._statMultipliers.maxHealth;
        this.health = this.maxHealth;

        this.attacks = character.attacks;
        this.facingRight = character.start?.facingRight ?? true;

        // Physics
        this.vx = 0;
        this.vy = 0;
        this.onGround = false;

        // Combat timers
        this.stunTimer = 0;
        this.attackCooldown = 0;
        this.blockHitTimer = 0;

        // Current attack being executed
        this.currentAttack = null;
        this.hitboxSpawned = false;

        // Visual feedback
        this.flashTimer = 0;      // frames remaining for hit-flash
        this.lastHitDamage = 0;   // stored so consumers can spawn a floating text

        /** @type {Hitbox|null} — set by _spawnHitbox, consumed by CombatSystem each frame */
        this.pendingHitbox = null;

        this._bus = bus;

        // State machine
        this.stateTimer = 0;
        this._fsm = createStateMachine(FIGHTER_STATES, 'idle', this);

        // Animation (injected; null → no-op fallback used when assets unavailable)
        this._animController = animController ?? this._fallbackAnimController();
    }

    /** A no-op animation controller used when assets are unavailable. */
    _fallbackAnimController() {
        return {
            current: 'idle',
            setAnimation: () => { },
            update: () => { },
            draw: (ctx, x, y, w, h) => {
                ctx.fillStyle = '#888';
                ctx.fillRect(x, y, w, h);
            },
            drawFlash: (ctx, x, y, w, h) => {
                ctx.fillStyle = '#888';
                ctx.fillRect(x, y, w, h);
            },
        };
    }

    //  Public API 

    get state() { return this._fsm.state; }

    /** Direct transition — used by the AI to force states (jump, block, walk…). */
    enterState(next) { this._fsm.setState(next); }

    /**
     * Apply stat multipliers (per-difficulty enemy scaling). Unknown keys are
     * ignored; the player keeps 1x by never calling this. Recomputes maxHealth
     * and refreshes health to full.
     * @param {object} mults
     */
    setStatMultipliers(mults = {}) {
        for (const key of Object.keys(this._statMultipliers)) {
            if (typeof mults[key] === 'number') {
                this._statMultipliers[key] = mults[key];
            }
        }
        this.maxHealth = Math.round(this._baseMaxHealth * this._statMultipliers.maxHealth);
        this.health = this.maxHealth;
    }

    /** Scaled walk speed in px/frame. */
    getWalkSpeed() {
        return CONFIG.walkSpeed * this._statMultipliers.walkSpeed;
    }

    /** Scaled jump velocity in px/frame (negative = upward). */
    getJumpVelocity() {
        return CONFIG.jumpVelocity * this._statMultipliers.jump;
    }

    /**
     * Start an attack: stores it as currentAttack and enters startup.
     * @param {string} attackName
     */
    startAttack(attackName) {
        const atk = this.attacks.find(a => a.name === attackName);
        if (!atk) {
            console.warn(`[Fighter] Attack "${attackName}" not found`);
            return;
        }
        this.currentAttack = atk;
        this.enterState('attack_startup');
    }

    /**
     * Advance the fighter by one frame.
     * `input` is null for the AI-controlled fighter (the AIController drives
     * the state machine directly via enterState / startAttack).
     * @param {import('../input/inputHandler.js').default|null} [input]
     */
    update(input = null) {
        this._decrementTimers();

        // Hitstun overrides everything
        if (this.stunTimer > 0) {
            if (this._fsm.state !== 'hitstun') this.enterState('hitstun');
        } else {
            this._fsm.update(input);
        }

        this._applyPhysics();
        this._updateAnimation();
    }

    //  Timers 

    _decrementTimers() {
        if (this.stunTimer > 0) this.stunTimer--;
        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.blockHitTimer > 0) this.blockHitTimer--;
        if (this.flashTimer > 0) this.flashTimer--;
    }

    //  Attack 

    _spawnHitbox(atk) {
        const dmgMult = this._statMultipliers.damage;
        this.pendingHitbox = new Hitbox({
            owner: this,
            offsetX: atk.offsetX,
            offsetY: atk.offsetY,
            width: atk.width,
            height: atk.height,
            damage: atk.damage * dmgMult,
            knockbackX: atk.knockbackX * dmgMult,
            knockbackY: atk.knockbackY * dmgMult,
            durationFrames: atk.active,
        });
        this._bus?.emit('sfx', { sound: 'punch' });
    }

    //  Physics 

    _applyPhysics() {
        this.vy += CONFIG.gravity;
        this.x += this.vx;
        this.y += this.vy;

        // Ground
        if (this.y + this.height >= CONFIG.groundY) {
            this.y = CONFIG.groundY - this.height;
            this.vy = 0;
            this.onGround = true;
            if (this.state === 'jump_fall') this.enterState('idle');
        } else {
            this.onGround = false;
        }

        // Arena walls
        this.x = Math.max(0, Math.min(CONFIG.canvasWidth - this.width, this.x));
    }

    //  Hurtbox 

    getHurtboxBounds() {
        const animKey = this._animController.current;
        const animCfg = this._character.sprites[animKey];
        if (!animCfg?.hurtbox) {
            // Fallback: use full bounding box
            return { x: this.x, y: this.y, width: this.width, height: this.height };
        }
        const { offsetX, offsetY, width, height } = animCfg.hurtbox;
        const x = this.facingRight
            ? this.x + offsetX
            : this.x + this.width - offsetX - width;
        return { x, y: this.y + offsetY, width, height };
    }

    //  Animation 

    _updateAnimation() {
        let key = 'idle';
        if (this.blockHitTimer > 0) {
            key = 'blockHit';
        } else {
            switch (this.state) {
                case 'idle': key = 'idle'; break;
                case 'walk': key = 'walk'; break;
                case 'jump_rise':
                case 'jump_fall': key = 'jump'; break;
                case 'block': key = 'block'; break;
                case 'hitstun': key = 'hit'; break;
                case 'ko': key = 'ko'; break;
                case 'attack_startup':
                case 'attack_active':
                case 'attack_recovery':
                    key = this.currentAttack?.animKey ?? 'idle';
                    break;
            }
        }
        this._animController.setAnimation(key);
        this._animController.update();
    }

    //  Rendering (delegated to the AnimationController — no canvas logic here)

    draw(ctx) {
        this._animController.draw(ctx, this.x, this.y, this.width, this.height, this.facingRight);

        // Hit flash — white tint drawn over the sprite
        if (this.flashTimer > 0) {
            this._animController.drawFlash(
                ctx,
                this.x,
                this.y,
                this.width,
                this.height,
                this.facingRight,
                70,
                (this.flashTimer / 10) * 0.65,
            );
        }
    }

    //  Hit reception 

    /**
     * Called when this fighter is struck by a hitbox.
     * @param {number} damage
     * @param {number} kbX  — knockback X (already direction-adjusted)
     * @param {number} kbY  — knockback Y
     */
    takeHit(damage, kbX, kbY) {
        if (this.state === 'block' && this.onGround) {
            const reducedDmg = damage * CONFIG.blockDamageReduction;
            this.health = Math.max(0, this.health - reducedDmg);
            this.vx = kbX * CONFIG.blockKnockbackReduction;
            this.vy = 0;
            this.stunTimer = CONFIG.blockStunFrames;
            this.blockHitTimer = CONFIG.blockHitFrames;
            this.lastHitDamage = reducedDmg;
            this.enterState('block');
        } else {
            this.health = Math.max(0, this.health - damage);
            this.vx = kbX;
            this.vy = kbY;
            this.flashTimer = 10;
            this.lastHitDamage = damage;

            if (this.health <= 0) {
                this.enterState('ko');
            } else {
                this.stunTimer = CONFIG.hitStunFrames;
                this.enterState('hitstun');
            }
        }
    }

    //  Reset 

    reset(startX) {
        this.x = startX;
        this.y = CONFIG.groundY - this.height;
        this.vx = 0;
        this.vy = 0;
        this.health = this.maxHealth;
        this.stunTimer = 0;
        this.attackCooldown = 0;
        this.blockHitTimer = 0;
        this.flashTimer = 0;
        this.currentAttack = null;
        this.pendingHitbox = null;
        this.enterState('idle');
    }
}
