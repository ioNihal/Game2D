import { CONFIG } from '../configs/config.js';
import { AnimationController } from './animation.js';
import Hitbox from './hitbox.js';
import { ANIMATION_CONFIG } from '../configs/animationConfig.js';

/**
 * Fighter — a playable or AI-controlled character.
 *
 * State machine:
 *   idle → walk → jump_rise → jump_fall → idle
 *   idle/walk → attack_startup → attack_active → attack_recovery → idle
 *   (any) → hitstun → idle
 *   (any) → ko
 *   idle/walk → block → idle
 */
export default class Fighter {
    /**
     * @param {{
     *   name: string,
     *   charKey: string,
     *   x: number, y: number,
     *   width: number, height: number,
     *   attacks: object[],
     *   maxHealth: number,
     *   assetLoader: import('../utils/assetLoader.js').default,
     *   audioManager: import('../utils/audioManager.js').default,
     *   animationsConfig: object,
     * }} cfg
     */
    constructor({ name, charKey, x, y, width, height, attacks, maxHealth, assetLoader, audioManager, animationsConfig }) {
        this.name = name;
        this.charKey = charKey;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.maxHealth = maxHealth;
        this.health = maxHealth;
        this.attacks = attacks;

        // Physics
        this.vx = 0;
        this.vy = 0;
        this.onGround = false;

        // State machine
        this.state = 'idle';
        this.facingRight = true;
        this.stateTimer = 0;
        this.stunTimer = 0;
        this.attackCooldown = 0;
        this.blockHitTimer = 0;

        // AI block helper — AI sets this to hold the block state for N frames
        this.aiBlockTimer = 0;

        // Current attack being executed
        this.currentAttack = null;
        this.hitboxSpawned = false;

        // Visual feedback
        this.flashTimer = 0;   // frames remaining for hit-flash
        this.lastHitDamage = 0;   // stored so main.js can spawn a floating text

        /** @type {Hitbox|null} — set by spawnHitbox, consumed by Game each frame */
        this.pendingHitbox = null;

        // Animation
        this._audioManager = audioManager;
        this._animController = (assetLoader && animationsConfig)
            ? new AnimationController(animationsConfig, assetLoader)
            : this._fallbackAnimController();
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
        };
    }

    //  Public update entry point 

    /**
     * Advance the fighter by one frame.
     * `input` is null for the AI-controlled fighter (the AIController calls
     * the state machine directly via public setters).
     * @param {import('./input.js').default|null} [input]
     */
    update(input = null) {
        this._decrementTimers();
        this._runStateMachine(input);
        this._applyPhysics();
        this._updateAnimation();
    }

    //  Timers 

    _decrementTimers() {
        if (this.stunTimer > 0) this.stunTimer--;
        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.blockHitTimer > 0) this.blockHitTimer--;
        if (this.flashTimer > 0) this.flashTimer--;
        if (this.aiBlockTimer > 0) this.aiBlockTimer--;
    }

    //  State machine 

    _runStateMachine(input) {
        // Hitstun overrides everything
        if (this.stunTimer > 0) {
            if (this.state !== 'hitstun') this.enterState('hitstun');
            return;
        }
        if (this.state === 'hitstun') {
            this.enterState('idle');
        }
        this._processState(input);
    }

    _processState(input) {
        switch (this.state) {
            case 'idle': this._stateIdle(input); break;
            case 'walk': this._stateWalk(input); break;
            case 'jump_rise': this._stateJumpRise(input); break;
            case 'jump_fall': this._stateJumpFall(input); break;
            case 'block': this._stateBlock(input); break;
            case 'attack_startup':
            case 'attack_active':
            case 'attack_recovery':
                this._handleAttackPhases();
                break;
            case 'ko':
                this.vx = 0;
                break;
            default:
                this.enterState('idle');
        }
    }

    _stateIdle(input) {
        this.vx = 0;
        if (!input) return;

        if (input.isKeyJustPressed('KeyL') && this.attackCooldown === 0) {
            return this.startAttack('killswitch');
        }
        if (input.isKeyDown('KeyK') && this.onGround) {
            return this.enterState('block');
        }
        if (input.isKeyDown('ArrowLeft') || input.isKeyDown('KeyA')) {
            this.facingRight = false;
            return this.enterState('walk');
        }
        if (input.isKeyDown('ArrowRight') || input.isKeyDown('KeyD')) {
            this.facingRight = true;
            return this.enterState('walk');
        }
        if ((input.isKeyJustPressed('ArrowUp') || input.isKeyJustPressed('KeyW')) && this.onGround) {
            return this.enterState('jump_rise');
        }
        if (input.isKeyJustPressed('KeyJ') && this.attackCooldown === 0) {
            return this.startAttack('lightPunch');
        }
        if (input.isKeyJustPressed('KeyU') && this.attackCooldown === 0) {
            return this.startAttack('heavyPunch');
        }
        if (input.isKeyJustPressed('KeyI') && this.attackCooldown === 0) {
            return this.startAttack('sweepKick');
        }
    }

    _stateWalk(input) {
        if (!input) return;

        if (input.isKeyDown('KeyK') && this.onGround) {
            this.vx = 0;
            return this.enterState('block');
        }
        if (input.isKeyDown('ArrowLeft') || input.isKeyDown('KeyA')) {
            this.vx = -CONFIG.walkSpeed;
            this.facingRight = false;
        } else if (input.isKeyDown('ArrowRight') || input.isKeyDown('KeyD')) {
            this.vx = CONFIG.walkSpeed;
            this.facingRight = true;
        } else {
            return this.enterState('idle');
        }
        if ((input.isKeyJustPressed('ArrowUp') || input.isKeyJustPressed('KeyW')) && this.onGround) {
            return this.enterState('jump_rise');
        }
        if (input.isKeyJustPressed('KeyJ') && this.attackCooldown === 0) {
            return this.startAttack('lightPunch');
        }
        if (input.isKeyJustPressed('KeyU') && this.attackCooldown === 0) {
            return this.startAttack('heavyPunch');
        }
    }

    _stateJumpRise(input) {
        if (this.vy >= 0) return this.enterState('jump_fall');
        if (input && input.isKeyJustPressed('KeyJ') && this.attackCooldown === 0) {
            return this.startAttack('airPunch');
        }
    }

    _stateJumpFall(input) {
        if (!input) return;
        if (input.isKeyDown('ArrowLeft') || input.isKeyDown('KeyA')) {
            this.vx = -CONFIG.walkSpeed;
            this.facingRight = false;
        } else if (input.isKeyDown('ArrowRight') || input.isKeyDown('KeyD')) {
            this.vx = CONFIG.walkSpeed;
            this.facingRight = true;
        }
        if (input.isKeyJustPressed('KeyJ') && this.attackCooldown === 0) {
            return this.startAttack('airPunch');
        }
    }

    _stateBlock(input) {
        this.vx = 0;
        // AI holds the block for aiBlockTimer frames; player holds while KeyK is down
        if (this.aiBlockTimer > 0) return;
        if (input && !input.isKeyDown('KeyK')) {
            if (input.isKeyDown('ArrowLeft') || input.isKeyDown('KeyA')) {
                this.facingRight = false;
                this.enterState('walk');
            } else if (input.isKeyDown('ArrowRight') || input.isKeyDown('KeyD')) {
                this.facingRight = true;
                this.enterState('walk');
            } else {
                this.enterState('idle');
            }
        }
    }

    //  Attack phase handling 

    startAttack(attackName) {
        const atk = this.attacks.find(a => a.name === attackName);
        if (!atk) {
            console.warn(`[Fighter] Attack "${attackName}" not found`);
            return;
        }
        this.currentAttack = atk;
        this.enterState('attack_startup');
    }

    _handleAttackPhases() {
        this.stateTimer++;
        const atk = this.currentAttack;
        if (!atk) return this.enterState('idle');

        if (this.state === 'attack_startup') {
            if (this.stateTimer >= atk.startup) {
                this.enterState('attack_active');
            }

        } else if (this.state === 'attack_active') {
            if (!this.hitboxSpawned && this.stateTimer >= atk.hitFrame) {
                this._spawnHitbox(atk);
                this.hitboxSpawned = true;
            }
            if (this.stateTimer >= atk.active) {
                this.enterState('attack_recovery');
            }

        } else if (this.state === 'attack_recovery') {
            if (this.stateTimer >= atk.recovery) {
                this.attackCooldown = atk.startup + atk.active + atk.recovery + (atk.cooldownExtra ?? 0);
                this.currentAttack = null;
                this.enterState('idle');
            }
        }
    }

    _spawnHitbox(atk) {
        this.pendingHitbox = new Hitbox({
            owner: this,
            offsetX: atk.offsetX,
            offsetY: atk.offsetY,
            width: atk.width,
            height: atk.height,
            damage: atk.damage,
            knockbackX: atk.knockbackX,
            knockbackY: atk.knockbackY,
            durationFrames: atk.active,
        });
        this._audioManager?.playSFX('punch');
    }

    //  State transitions 

    enterState(newState) {
        if (this.state === newState) return;
        this.state = newState;
        this.stateTimer = 0;

        switch (newState) {
            case 'idle':
                this.vx = 0;
                break;
            case 'jump_rise':
                this.vy = CONFIG.jumpVelocity;
                this.onGround = false;
                this._audioManager?.playSFX('jump');
                break;
            case 'attack_startup':
                this.hitboxSpawned = false;
                break;
            case 'block':
                this.blockHitTimer = 0;
                break;
            case 'ko':
                this.vx = 0;
                break;
        }
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
        const animCfg = ANIMATION_CONFIG[this.charKey]?.[animKey];
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

    //  Rendering 

    draw(ctx) {
        // Draw sprite first
        this._animController.draw(ctx, this.x, this.y, this.width, this.height, this.facingRight);

        // Hit flash — white tint drawn on top of the already-rendered sprite
        if (this.flashTimer > 0) {
            const alpha = (this.flashTimer / 10) * 0.65;
            ctx.save();
            ctx.globalAlpha = alpha;
            try {
                ctx.filter = 'brightness(0) invert(1)';
            } catch (e) {
                // Fallback for browsers with strict filter security or incomplete support
            }
            this._animController.draw(ctx, this.x, this.y, this.width, this.height, this.facingRight);
            ctx.restore();
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
            this._audioManager?.playSFX('block');
            this.enterState('block');
        } else {
            this.health = Math.max(0, this.health - damage);
            this.vx = kbX;
            this.vy = kbY;
            this.flashTimer = 10;
            this.lastHitDamage = damage;

            if (this.health <= 0) {
                this._audioManager?.playSFX('ko');
                this.enterState('ko');
            } else {
                this.stunTimer = CONFIG.hitStunFrames;
                this._audioManager?.playSFX('hit');
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
        this.aiBlockTimer = 0;
        this.flashTimer = 0;
        this.currentAttack = null;
        this.pendingHitbox = null;
        this.enterState('idle');
    }
}