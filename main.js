import InputHandler from "./input.js";
import Fighter from "./fighter.js";
import { CONFIG } from "./config.js";
import { ATTACKS } from "./attack.js";
import Hitbox from "./hitbox.js";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 450;

const canvas = document.getElementById('gameCanvas');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

const ctx = canvas.getContext('2d');

const input = new InputHandler();

const player = new Fighter({
    name: 'Player',
    x: 100,
    y: CONFIG.groundY - 80,
    width: 40,
    height: 80,
    color: 'white',
    attacks: ATTACKS
});

//for testing
const enemy = new Fighter({
    name: 'Enemy',
    x: 300,
    y: CONFIG.groundY - 80,
    width: 40,
    height: 80,
    color: 'red',
    attacks: ATTACKS
})

const hitboxes = [];

const drawPressedKeys = () => {
    ctx.fillStyle = 'white';
    ctx.font = '16px monospace';
    const pressed = Object.entries(input.keys)
        .filter(([code, pressed]) => pressed)
        .map(([code]) => code)
        .join(', ');
    ctx.fillText('Pressed: ' + pressed, 10, 60)
}

const drawGround = () => {
    ctx.fillStyle = '#222';
    ctx.fillRect(0, CONFIG.groundY, CONFIG.canvasWidth, CONFIG.canvasHeight - CONFIG.groundY);

}



const updateHitboxes = () => {
    for (let i = hitboxes.length - 1; i >= 0; i--) {
        const hb = hitboxes[i];
        hb.update();

        [player, enemy].forEach(target => {
            if (hb.checkCollision(target)) {
                console.log('Hit detected:', hb, 'target before hit state:', target.state, 'health before:', target.health);
                const direction = hb.owner.facingRight ? 1 : -1;
                target.takeHit(hb.damage, hb.knockbackX * direction, hb.knockbackY);
                console.log('After takeHit: target state:', target.state, 'stunTimer:', target.stunTimer, 'vx,vy:', target.vx, target.vy);
                hb.markHit(target);
            }
        });

        if (hb.isExpired()) {
            hitboxes.splice(i, 1);
        }
    }
}

const drawHitboxesDebug = () => {
    for (const hb of hitboxes) {
        hb.drawDebug(ctx);
    }
}




const clearScreen = () => {
    ctx.fillStyle = '#444';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

const drawTest = () => {
    ctx.fillStyle = 'white';
    ctx.font = '20px sans-serif';
    ctx.fillText('Stickman Fighter - Step 1', 20, 30);
}

const gameLoop = () => {
    clearScreen();

    player.update(input);

    enemy.update(null);

    if (player.pendingHitbox) {
        hitboxes.push(player.pendingHitbox);
        player.pendingHitbox = null;
    }

    if (enemy.pendingHitbox) {
        hitboxes.push(enemy.pendingHitbox);
        enemy.pendingHitbox = null;
    }

    updateHitboxes();

    drawGround();
    player.draw(ctx);
    enemy.draw(ctx);

    drawHitboxesDebug();


    //for debug: display state info
    ctx.fillStyle = 'white';
    ctx.font = '16px sans-serif';
    ctx.fillText(`Player State: ${player.state}`, 10, 20);
    ctx.fillText(`Player POS: (${player.x.toFixed(1)}, ${player.y.toFixed(1)})`, 10, 40);


    input.update();

    requestAnimationFrame(gameLoop);
}

window.addEventListener('load', () => {
    gameLoop();
})