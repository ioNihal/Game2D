import { CONFIG } from "../configs/config.js";

export default class AIController {
    constructor(fighter, opponent, config = {}) {
        this.fighter = fighter;
        this.opponent = opponent;

        //config for behaviour
        this.blockDuration = config.blockDuration ?? 20;
        this.preferredRange = config.preferredRange ?? 50;
        this.approachSpeed = config.approachSpeed ?? true;
        this.blockProbability = config.blockProbability ?? 0.6;
        this.retreatProbability = config.retreatProbability ?? 0.02;
        this.jumpProbability = config.jumpProbability ?? 0.01;
    }

    update() {
        const f = this.fighter;
        const p = this.opponent;

        if (f.state === 'hitstun' && f.stunTimer > 0) {
            return;
        }

        if (['attack_startup', 'attack_active', 'attack_recovery', 'jump_rise', 'jump_fall'].includes(f.state)) {
            return;
        }

        const dx = p.x - f.x;

        const absDx = Math.abs(dx);

        if (absDx < this.preferredRange + 20 && ['attack_active', 'attack_startup'].includes(p.state) && Math.random() < this.blockProbability) {
            if (f.onGround) {
                f.enterState('block');
                f.aiBlockTimer = this.blockDuration;
            }
            return;
        }

        //approach if too far
        if (absDx > this.preferredRange) {
            
            if (dx > 0) {
                f.facingRight = true;
                f.vx = CONFIG.walkSpeed;
            } else {
                f.facingRight = false;
                f.vx = -CONFIG.walkSpeed;
            }
            f.enterState('walk');
            return;
        }

        //if in range and attack cooldown , perform attack
        if (absDx <= this.preferredRange && f.attackCooldown === 0) {
            const viable = f.attacks.filter(atk => {
                return true;
            });
            if (viable.length > 0) {
                const choice = viable[Math.floor(Math.random() * viable.length)];
                f.startAttack(choice.name);
                return;
            }
        }

        //occasionally jump and retreat
        if (absDx < this.preferredRange * 0.5 && Math.random() < this.retreatProbability) {
            //step back
            if (dx > 0) {
                f.facingRight = false;
                f.vx = -CONFIG.walkSpeed;
            } else {
                f.facingRight = true;
                f.vx = CONFIG.walkSpeed;
            }
            f.enterState('walk');
            return;
        }

        if (absDx > 20 && Math.random() < this.jumpProbability && f.onGround) {
            //jump to approach
            f.enterState('jump_rise');
            return;
        }

        //decrement aiBlockTimer
        if (f.state === 'block' && f.aiBlockTimer !== undefined) {
            f.aiBlockTimer--;
            if (f.aiBlockTimer <= 0) {
                delete f.aiBlockTimer;
                f.enterState('idle');
            }
            return;
        }

        //otherwise idle
        f.enterState('idle');
        f.vx = 0;
    }
}