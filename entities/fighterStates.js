/**
 * FIGHTER_STATES — pure state definitions for `createStateMachine`.
 *
 * The state machine context (`ctx`) is the Fighter instance.
 *
 * Transitions:
 *   idle → walk | block | jump_rise | attack_startup
 *   walk → idle | block | jump_rise | attack_startup
 *   jump_rise → jump_fall | attack_startup (air)
 *   jump_fall → idle (on landing) | attack_startup (air)
 *   block → idle | walk
 *   attack_startup → attack_active → attack_recovery → idle
 *   (any) → hitstun (forced by Fighter.update while stunTimer > 0)
 *   (any) → ko
 *
 * `enter` hooks run on every transition (including auto-transitions from a
 * returned state name), so stateTimers always start at 0 per state.
 */

const resetTimer = ctx => { ctx.stateTimer = 0; };

export const FIGHTER_STATES = {
    idle: {
        enter: resetTimer,
        update(ctx, input) {
            ctx.vx = 0;
            if (!input) return;

            if (input.isDown('block') && ctx.onGround) return 'block';
            if (input.isDown('moveLeft')) {
                ctx.facingRight = false;
                return 'walk';
            }
            if (input.isDown('moveRight')) {
                ctx.facingRight = true;
                return 'walk';
            }
            if (input.justPressed('jump') && ctx.onGround) return 'jump_rise';
            if (input.justPressed('lightPunch') && ctx.attackCooldown === 0) {
                return ctx.startAttack('lightPunch');
            }
            if (input.justPressed('heavyPunch') && ctx.attackCooldown === 0) {
                return ctx.startAttack('heavyPunch');
            }
            if (input.justPressed('sweepKick') && ctx.attackCooldown === 0) {
                return ctx.startAttack('sweepKick');
            }
        },
    },

    walk: {
        enter: resetTimer,
        update(ctx, input) {
            if (!input) return;

            if (input.isDown('block') && ctx.onGround) {
                ctx.vx = 0;
                return 'block';
            }
            if (input.isDown('moveLeft')) {
                ctx.vx = -ctx.getWalkSpeed();
                ctx.facingRight = false;
            } else if (input.isDown('moveRight')) {
                ctx.vx = ctx.getWalkSpeed();
                ctx.facingRight = true;
            } else {
                return 'idle';
            }
            if (input.justPressed('jump') && ctx.onGround) return 'jump_rise';
            if (input.justPressed('lightPunch') && ctx.attackCooldown === 0) {
                return ctx.startAttack('lightPunch');
            }
            if (input.justPressed('heavyPunch') && ctx.attackCooldown === 0) {
                return ctx.startAttack('heavyPunch');
            }
        },
    },

    jump_rise: {
        enter(ctx) {
            ctx.stateTimer = 0;
            ctx.vy = ctx.getJumpVelocity();
            ctx.onGround = false;
            ctx._bus?.emit('sfx', { sound: 'jump' });
        },
        update(ctx, input) {
            if (ctx.vy >= 0) return 'jump_fall';
            if (input && input.justPressed('lightPunch') && ctx.attackCooldown === 0) {
                return ctx.startAttack('airPunch');
            }
        },
    },

    jump_fall: {
        enter: resetTimer,
        update(ctx, input) {
            if (!input) return;
            if (input.isDown('moveLeft')) {
                ctx.vx = -ctx.getWalkSpeed();
                ctx.facingRight = false;
            } else if (input.isDown('moveRight')) {
                ctx.vx = ctx.getWalkSpeed();
                ctx.facingRight = true;
            }
            if (input.justPressed('lightPunch') && ctx.attackCooldown === 0) {
                return ctx.startAttack('airPunch');
            }
        },
    },

    block: {
        enter(ctx) {
            ctx.stateTimer = 0;
            ctx.blockHitTimer = 0;
        },
        update(ctx, input) {
            ctx.vx = 0;
            if (input && !input.isDown('block')) {
                if (input.isDown('moveLeft')) {
                    ctx.facingRight = false;
                    return 'walk';
                }
                if (input.isDown('moveRight')) {
                    ctx.facingRight = true;
                    return 'walk';
                }
                return 'idle';
            }
        },
    },

    attack_startup: {
        enter(ctx) {
            ctx.stateTimer = 0;
            ctx.hitboxSpawned = false;
        },
        update(ctx) {
            ctx.stateTimer++;
            const atk = ctx.currentAttack;
            if (!atk) return 'idle';
            if (ctx.stateTimer >= atk.startup) return 'attack_active';
        },
    },

    attack_active: {
        enter: resetTimer,
        update(ctx) {
            ctx.stateTimer++;
            const atk = ctx.currentAttack;
            if (!atk) return 'idle';
            if (!ctx.hitboxSpawned && ctx.stateTimer >= atk.hitFrame) {
                ctx._spawnHitbox(atk);
                ctx.hitboxSpawned = true;
            }
            if (ctx.stateTimer >= atk.active) return 'attack_recovery';
        },
    },

    attack_recovery: {
        enter: resetTimer,
        update(ctx) {
            ctx.stateTimer++;
            const atk = ctx.currentAttack;
            if (!atk) return 'idle';
            if (ctx.stateTimer >= atk.recovery) {
                ctx.attackCooldown = atk.startup + atk.active + atk.recovery + (atk.cooldownExtra ?? 0);
                ctx.currentAttack = null;
                return 'idle';
            }
        },
    },

    hitstun: {
        enter: resetTimer,
        update(ctx) {
            if (ctx.stunTimer <= 0) return 'idle';
        },
    },

    ko: {
        enter(ctx) {
            ctx.stateTimer = 0;
            ctx.vx = 0;
        },
        update(ctx) {
            ctx.vx = 0;
        },
    },
};
