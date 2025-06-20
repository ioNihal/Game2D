import { CONFIG } from './config.js';

export default class Fighter {
    constructor({ x, y, width, height, color }) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color || 'white';


        //Physics
        this.vx = 0;
        this.vy = 0;
        this.onGround = false;

        //state
        this.state = 'idle'; //walk and jump also
        this.facingRight = true;
    }

    update(input) {
        this.vx = 0;

        if (input) {
            if (input.isKeyDown('ArrowLeft') || input.isKeyDown('KeyA')) {
                this.vx = -CONFIG.walkSpeed;
                this.facingRight = false;
                this.state = 'walk';
            } else if (input.isKeyDown('ArrowRight') || input.isKeyDown('KeyD')) {
                this.vx = CONFIG.walkSpeed;
                this.facingRight = true;
                this.state = 'walk';
            } else {
                if (this.onGround) {
                    this.state = 'idle';
                }
            }

            if ((input.isKeyDown('ArrowUp') || input.isKeyDown('KeyW')) && this.onGround) {
                this.vy = CONFIG.jumpVelocity;
                this.onGround = false;
                this.state = 'jump';
            }
        }


        //gravity
        this.vy += CONFIG.gravity;

        //update pos
        this.x += this.vx;
        this.y += this.vy;

        //ground collision
        if (this.y + this.height >= CONFIG.groundY) {
            this.y = CONFIG.groundY - this.height;
            this.vy = 0;
            this.onGround = true;

            if (this.state === 'jump') {
                this.state = 'idle';
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


    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        //option facing indicator
        ctx.strokeStyle = 'blue';
        ctx.beginPath();
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const len = 10;

        if (this.facingRight) {
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + len, cy);
        } else {
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx - len, cy);
        }

        ctx.stroke();
    }
}