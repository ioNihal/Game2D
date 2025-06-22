import InputHandler from "./input.js";
import AssetLoader from "./assetLoader.js";
import { ANIMATION_CONFIG } from "./animationConfig.js";
import Fighter from "./fighter.js";
import { CONFIG } from "./config.js";
import { ATTACKS } from "./attack.js";

import AIController from "./ai.js";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 450;

const canvas = document.getElementById('gameCanvas');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

const ctx = canvas.getContext('2d');

const input = new InputHandler();

const assetLoader = new AssetLoader();

const buildImageListForCharacter = (charKey) => {
    const list = [];
    const anims = ANIMATION_CONFIG[charKey];
    for (const [animKey, cfg] of Object.entries(anims)) {
        for (let i = 1; i <= cfg.frameCount; i++) {
            const key = `${charKey}_${animKey}${i}`;
            const url = `${cfg.path}${i}${cfg.extension}`;
            if (animKey === 'block') {
                console.log(`Loading block frame: key=${key}, url=${url}`);
            }

            list.push({ key, url });
        }
    }
    return list;
}

const playerImageList = buildImageListForCharacter('player');
const enemyImageList = buildImageListForCharacter('enemy');
const allImageList = [...playerImageList, ...enemyImageList];




assetLoader.loadImages(allImageList)
    .then(() => {
        console.log('Images Loaded');
        startGame();
    })
    .catch(err => console.error(err));

const buildAnimationsConfig = (charKey) => {
    const anims = ANIMATION_CONFIG[charKey];
    const animationsConfig = {};
    for (const [animKey, cfg] of Object.entries(anims)) {
        const imageKeys = [];
        for (let i = 1; i <= cfg.frameCount; i++) {
            imageKeys.push(`${charKey}_${animKey}${i}`);
        }
        animationsConfig[animKey] = {
            frameCount: cfg.frameCount,
            frameDuration: cfg.frameDuration,
            loop: cfg.loop,
            imageKeys,
        };
    }
    return animationsConfig;
}

const startGame = () => {
    const playerAnimations = buildAnimationsConfig('player');
    const enemyAnimations = buildAnimationsConfig('enemy');


    const player = new Fighter({
        name: 'Player',
        x: 100,
        y: CONFIG.groundY - 80,
        width: 40,
        height: 80,
        // color: 'white',
        attacks: ATTACKS,
        maxHealth: 100,
        assetLoader,
        animationsConfig: playerAnimations
    });

    const enemy = new Fighter({
        name: 'Enemy',
        x: 300,
        y: CONFIG.groundY - 80,
        width: 40,
        height: 80,
        // color: 'red',
        attacks: ATTACKS,
        maxHealth: 100,
        assetLoader,
        animationsConfig: enemyAnimations
    })

    const enemyAI = new AIController(enemy, player, {
        preferredRange: 50,
        blockProbability: 0.5,
        retreatProbability: 0.01,
        jumpProbability: 0.005,
    })

    const hitboxes = [];


    let gameOver = false;
    let winner = null;

    const checkGameOver = () => {
        if (gameOver) return;
        if (player.state === 'ko') {
            gameOver = true;
            winner = 'enemy';
        } else if (enemy.state === 'ko') {
            gameOver = true;
            winner = 'enemy';
        }

        if (gameOver) {
            setTimeout(() => {

            }, 100)
        }
    }

    const resetRound = () => {
        gameOver = false;
        winner = null;

        player.health = player.maxHealth;
        enemy.health = enemy.maxHealth;

        player.x = 100;
        player.y = CONFIG.groundY - player.height;
        player.vx = 0;
        player.vy = 0;
        player.enterState('idle');

        enemy.x = CONFIG.canvasWidth - 100 - enemy.width;
        enemy.y = CONFIG.groundY - enemy.height;
        enemy.vx = 0;
        enemy.vy = 0;
        enemy.enterState('idle');

        //clear hitboaxes
        hitboxes.length = 0;
    }

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
                    // console.log('Hit detected:', hb, 'target before hit state:', target.state, 'health before:', target.health);
                    const direction = hb.owner.facingRight ? 1 : -1;
                    target.takeHit(hb.damage, hb.knockbackX * direction, hb.knockbackY);
                    // console.log('After takeHit: target state:', target.state, 'stunTimer:', target.stunTimer, 'vx,vy:', target.vx, target.vy);
                    hb.markHit(target);
                }
            });

            if (hb.isExpired()) {
                hitboxes.splice(i, 1);
            }
        }
    }

    const drawHealthBar = (x, y, width, height, currentHealth, maxHealth, fillColor) => {
        ctx.fillStyle = '#555';
        ctx.fillRect(x, y, width, height);

        const percent = Math.max(0, currentHealth) / maxHealth;
        const barWidth = width * percent;
        ctx.fillStyle = fillColor;
        ctx.fillRect(x, y, barWidth, height);

        //border
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
    }

    const drawUI = () => {
        const barWidth = 200;
        const barHeight = 20;
        const padding = 20;

        //PlayerBar

        drawHealthBar(
            padding,
            padding,
            barWidth,
            barHeight,
            player.health,
            player.maxHealth,
            '#0f0'
        );

        drawHealthBar(
            CONFIG.canvasWidth - barWidth - padding,
            padding,
            barWidth, barHeight,
            enemy.health,
            enemy.maxHealth,
            '#f00'
        )

        //text
        ctx.fillStyle = 'white';
        ctx.font = '14px sans-serif';
        ctx.fillText('You', padding, padding + barHeight + 15);
        ctx.fillText('Enemy', CONFIG.canvasWidth - barWidth - padding - 10, padding + barHeight + 15);
    }

    const drawGameOver = () => {
        const text = winner === 'player' ? 'You Win!' : 'Game Over';
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText(text, CONFIG.canvasWidth / 2, CONFIG.canvasHeight / 2);
        ctx.font = '24px sans-serif';
        ctx.fillText('Press R to Restart', CONFIG.canvasWidth / 2, CONFIG.canvasHeight / 2 + 40);
        ctx.textAlign = 'start';
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

        if (!gameOver) {
            // Normal update
            player.update(input);
            enemyAI.update();
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
        }

        drawGround();
        player.draw(ctx);
        enemy.draw(ctx);

        drawHitboxesDebug();

        drawUI();

        if (!gameOver) {
            checkGameOver();
        } else {
            drawGameOver();
        }

        if (gameOver) {
            if (input.isKeyJustPressed('KeyR')) {
                resetRound();
            }
        }

        // //for debug: display state info
        // ctx.fillStyle = 'white';
        // ctx.font = '16px sans-serif';
        // ctx.fillText(`Player State: ${player.state}`, 10, 20);
        // ctx.fillText(`Player POS: (${player.x.toFixed(1)}, ${player.y.toFixed(1)})`, 10, 40);

        input.update();

        requestAnimationFrame(gameLoop);
    }

    gameLoop();
}