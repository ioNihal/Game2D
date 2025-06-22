import { CONFIG } from './config.js';
import { AnimationController, ANIMATIONS } from './animation.js';
import Hitbox from './hitbox.js';


export default class Fighter {
    constructor({ name = 'Fighter', x, y, width, height, color, attacks = [], maxHealth = 100, assetLoader, animationsConfig }) {
        this.name = name;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color || 'white';
        this.maxHealth = maxHealth;
        this.health = maxHealth;
        this.blockHitTimer = 0;


        //Physics
        this.vx = 0;
        this.vy = 0;
        this.onGround = false;

        //state
        this.state = 'idle'; //walk and jump also
        this.facingRight = true;

        //timers
        this.stateTimer = 0;
        this.stunTimer = 0;
        this.attackCooldown = 0;

        //attack definitions
        this.attacks = attacks;
        this.currentAttack = null;


        // Asset loader and animation controller
        if (!assetLoader) {
            console.warn('Fighter: assetLoader not provided; animations will fail.');
        }
        if (!animationsConfig) {
            console.warn('Fighter: animationsConfig not provided; animations will fail.');
        }

        //Anim Controller
        if (assetLoader && animationsConfig) {
            this.animController = new AnimationController(animationsConfig, assetLoader);
        } else {
            this.animController = {
                current: 'idle',
                setAnimation: () => { },
                update: () => { },
                draw: (ctx, x, y, w, h, facingRight) => {
                    // fallback: draw a simple rectangle
                    ctx.fillStyle = this.color;
                    ctx.fillRect(x, y, w, h);
                }
            };
        }
    }

    update(input) {
        //decre timers
        if (this.stunTimer > 0) {
            this.stunTimer--;
        }

        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }

        if (this.blockHitTimer > 0) {
            this.blockHitTimer--;
        }

        // If we were in hitstun and timer just expired, go to idle
        if (this.state === 'hitstun' && this.stunTimer === 0) {
            this.enterState('idle');
        }

        //State transtition: inputonly if not hitstun
        if (this.stunTimer > 0) {
            this.enterState('hitstun');
        } else {
            this.processState(input);
        }

        //apply physics
        this.applyPhysics();

        this.updateAnimation(); //based on state
    }


    processState(input) {
        switch (this.state) {
            case 'idle':
                this.vx = 0;
                if (input) {
                    if ((input.isKeyDown('KeyK')) && this.onGround) {
                        this.enterState('block');
                        return;
                    }
                    if (input.isKeyDown('ArrowLeft') || input.isKeyDown('KeyA')) {
                        this.facingRight = false;
                        this.enterState('walk');
                        return;
                    }
                    if (input.isKeyDown('ArrowRight') || input.isKeyDown('KeyD')) {
                        this.facingRight = true;
                        this.enterState('walk');
                        return;
                    }

                    //jump
                    if ((input.isKeyJustPressed('ArrowUp') || input.isKeyJustPressed('KeyW')) && this.onGround) {
                        this.enterState('jump_rise');
                        return;
                    }

                    //attack
                    if (input.isKeyJustPressed('KeyJ') && this.attackCooldown === 0) {
                        this.startAttack('lightPunch');
                        return;
                    }
                }
                break;

            case 'walk':
                if (input) {
                    if ((input.isKeyDown('KeyK')) && this.onGround) {
                        this.enterState('block');
                        this.vx = 0;
                        return;
                    }

                    if (input.isKeyDown('ArrowLeft') || input.isKeyDown('KeyA')) {
                        this.vx = -CONFIG.walkSpeed;
                        this.facingRight = false;
                    } else if (input.isKeyDown('ArrowRight') || input.isKeyDown('KeyD')) {
                        this.vx = CONFIG.walkSpeed;
                        this.facingRight = true;
                    } else {
                        this.enterState('idle');
                        return;
                    }

                    //jump from walk
                    if ((input.isKeyJustPressed('ArrowUp') || input.isKeyJustPressed('KeyW')) && this.onGround) {
                        this.enterState('jump_rise');
                        return;
                    }

                    //attack from walk
                    if (input.isKeyJustPressed('KeyJ') && this.attackCooldown === 0) {
                        this.startAttack('lightPunch');
                        return;
                    }
                }
                break;

            case 'jump_rise':
                if (this.vy >= 0) {
                    this.enterState('jump_fall');
                    return;
                }

                //air attack
                if (input && input.isKeyJustPressed('KeyJ') && this.attackCooldown === 0) {
                    this.startAttack('airPunch');
                    return;
                }

                break;

            case 'jump_fall':
                if (input) {
                    if (input.isKeyDown('ArrowLeft') || input.isKeyDown('KeyA')) {
                        this.vx = -CONFIG.walkSpeed;
                        this.facingRight = false;
                    } else if (input.isKeyDown('ArrowRight') || input.isKeyDown('KeyD')) {
                        this.vx = CONFIG.walkSpeed;
                        this.facingRight = true;
                    }

                    //air attack while falling
                    if (input.isKeyJustPressed('KeyJ') && this.attackCooldown === 0) {
                        this.startAttack('airPunch');
                        return;
                    }
                }
                break;

            case 'block':
                this.vx = 0;
                if (this.aiBlockTimer > 0) {
                    return;
                }

                if (input) {
                    if (!input.isKeyDown('KeyK')) {
                        if (input.isKeyDown('ArrowLeft') || input.isKeyDown('KeyA')) {
                            this.enterState('walk');
                            this.facingRight = false;
                        } else if (input.isKeyDown('ArrowRight') || input.isKeyDown('KeyD')) {
                            this.enterState('walk');
                            this.facingRight = true;
                        } else {
                            this.enterState('idle');
                        }
                        return;
                    }
                }
                break;

            case 'attack_startup':
            case 'attack_active':
            case 'attack_recovery':
                this.handleAttackState();
                break;

            case 'ko':
                this.vx = 0;
                return;

            case 'hitstun':
                if (this.stunTimer === 0) {
                    this.enterState('idle');
                }
                this.vx = 0;
                break;


            //other state block, knockdown,etc..

            default:
                this.enterState('idle');
                break;
        }
    }

    enterState(newState) {
        if (this.state !== newState) {
            this.state = newState;
            this.stateTimer = 0;


            switch (newState) {
                case 'block':
                    this.blockHitTimer = 0;
                    break;

                case 'idle':
                    this.vx = 0;
                    break;
                case 'walk':
                    //set in processState
                    break;
                case 'jump_rise':
                    this.vy = CONFIG.jumpVelocity;
                    this.onGround = false;
                    break;
                case 'jump_fall':
                    break;
                case 'attack_startup':
                    this.stateTimer = 0;
                    this.hitBoxSpawned = false;
                    break;
                case 'hitstun':
                    //in processstate
                    break;
                case 'ko':
                    this.vx = 0;
                    break;
            }
        }
    }

    startAttack(attackName) {
        const atk = this.attacks.find(a => a.name === attackName);
        if (!atk) {
            console.warn('Attack not found', attackName);
            return;
        }

        this.currentAttack = atk;
        this.enterState('attack_startup');
    }


    handleAttackState() {
        this.stateTimer++;
        const atk = this.currentAttack;
        if (!atk) return this.enterState('idle');

        if (this.state === 'attack_startup') {
            if (this.stateTimer >= atk.startup) {
                this.enterState('attack_active');
            }
        } else if (this.state === 'attack_active') {
            //spawn hitbox
            if (!this.hitBoxSpawned && this.stateTimer >= atk.hitFrame) {
                this.spawnHitbox(atk);
                this.hitBoxSpawned = true;
            }

            //remove hitbox
            if (this.stateTimer >= atk.active) {
                this.removeHitbox();
            }

            if (this.stateTimer >= atk.active) {
                this.enterState('attack_recovery');
            }
        } else if (this.state === 'attack_recovery') {
            if (this.stateTimer >= atk.recovery) {
                this.attackCooldown = atk.startup + atk.active + atk.recovery + (atk.cooldownExtra || 0);
                this.enterState('idle');
            }
        }
    }

    spawnHitbox(atk) {
        const duration = atk.active;
        const hb = new Hitbox({
            owner: this,
            offsetX: atk.offsetX,
            offsetY: atk.offsetY,
            width: atk.width,
            height: atk.height,
            damage: atk.damage,
            knockbackX: atk.knockbackX,
            knockbackY: atk.knockbackY,
            durationFrames: duration,
        });

        this.pendingHitbox = hb;
    }

    removeHitbox() {
        // After active frames, we rely on duration expiry; nothing special needed here.
        // But if you wanted immediate removal: set pendingHitbox = null or mark hb.age = duration to expire next update.
    }

    applyPhysics() {
        //apply gravity
        this.vy += CONFIG.gravity;

        //apply physics
        this.x += this.vx;
        this.y += this.vy;

        //ground collision
        if (this.y + this.height >= CONFIG.groundY) {
            this.y = CONFIG.groundY - this.height;
            this.vy = 0;
            this.onGround = true;

            //if landing fallback to idle/walk
            if (this.state === 'jump_fall') {
                this.enterState('idle');
            }
        } else {
            this.onGround = false;
        }

        //boundaries
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > CONFIG.canvasWidth) {
            this.x = CONFIG.canvasWidth - this.width;
        }
    }

    updateAnimation() {
        let animKey = 'idle';
        if (this.blockHitTimer > 0) {
            animKey = 'blockHit'
        } else {
            switch (this.state) {
                case 'idle': animKey = 'idle'; break;
                case 'walk': animKey = 'walk'; break;
                case 'jump_rise': animKey = 'jump'; break;
                case 'jump_fall': animKey = 'jump'; break;
                case 'block': animKey = 'block'; break;
                case 'attack_startup':
                case 'attack_active':
                case 'attack_recovery':
                    animKey = this.currentAttack ? this.currentAttack.animKey : 'idle';
                    break;
                case 'hitstun': animKey = 'hit'; break;
                case 'ko': animKey = 'ko'; break;
            }
        }
//   console.log(`[Fighter ${this.name}] state='${this.state}', chosen animKey='${animKey}', previous anim='${this.animController.current}'`);
        this.animController.setAnimation(animKey);
        this.animController.update();
    }

    draw(ctx) {
        this.animController.draw(ctx, this.x, this.y, this.width, this.height, this.facingRight);

        ctx.fillStyle = 'white';
        ctx.font = '12px sans-serif';
        ctx.fillText(this.state, this.x, this.y - 5);

        // Hurtbox debug
        ctx.save();
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        ctx.restore();

    }

    takeHit(damage, kbX, kbY) {
        if (this.state === 'block' && this.onGround) {
            const reducedDamage = damage * CONFIG.blockDamageReduction;
            this.health = (this.health ?? this.maxHealth) - reducedDamage;

            const reducedKbX = kbX * CONFIG.blockKnockbackReduction;
            this.vx = reducedKbX;

            this.vy = 0;
            this.stunTimer = CONFIG.blockStunFrames;

            this.blockHitTimer = CONFIG.blockHitFrames || 6;
            this.enterState('block');
        } else {
            this.health = (this.health ?? this.maxHealth) - damage;
            this.vx = kbX;
            this.vy = kbY;
            if (this.health <= 0) {
                this.health = 0;
                this.enterState('ko');
            } else {
                this.stunTimer = CONFIG.hitStunFrames;
                this.enterState('hitstun');
            }
        }
    }
}