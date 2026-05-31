import InputHandler from './controllers/input.js';
import AssetLoader from './utils/assetLoader.js';
import AudioManager from './utils/audioManager.js';
import { ANIMATION_CONFIG } from './configs/animationConfig.js';
import Fighter from './controllers/fighter.js';
import { CONFIG } from './configs/config.js';
import { ATTACKS } from './configs/attack.js';
import AIController from './controllers/ai.js';
import UIManager from './ui.js';


// Canvas setup

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = CONFIG.canvasWidth;
canvas.height = CONFIG.canvasHeight;

function resizeCanvas() {
    const scaleX = window.innerWidth / CONFIG.canvasWidth;
    const scaleY = window.innerHeight / CONFIG.canvasHeight;
    const scale = Math.min(scaleX, scaleY);
    canvas.style.width = `${CONFIG.canvasWidth * scale}px`;
    canvas.style.height = `${CONFIG.canvasHeight * scale}px`;
}

window.addEventListener('load', resizeCanvas);
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', resizeCanvas);
resizeCanvas();

// Show a loading placeholder immediately
ctx.fillStyle = '#111';
ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
ctx.fillStyle = '#fff';
ctx.textAlign = 'center';
ctx.font = '18px sans-serif';
ctx.fillText('Loading…', CONFIG.canvasWidth / 2, CONFIG.canvasHeight / 2);

// 
// Orientation guard
// 

(function initOrientationGuard() {
    const overlay = document.getElementById('rotateOverlay');
    if (!overlay) return;

    let pausedByRotate = false;

    function check() {
        const portrait = window.matchMedia('(orientation: portrait)').matches;
        overlay.style.display = portrait ? 'flex' : 'none';

        if (portrait && window.game?.isRunning() && !window.game.isPaused()) {
            window.game.pauseGame();
            pausedByRotate = true;
        } else if (!portrait && pausedByRotate) {
            window.game?.resumeGame();
            pausedByRotate = false;
        }
    }

    ['load', 'resize', 'orientationchange'].forEach(e => window.addEventListener(e, check));
    document.addEventListener('DOMContentLoaded', check);
})();

// 
// FloatingText — a damage number that drifts upward and fades out
// 

class FloatingText {
    constructor(text, x, y) {
        this.text = text;
        this.x = x;
        this.y = y;
        this.life = CONFIG.floatTextLife;
        this.maxLife = CONFIG.floatTextLife;
    }

    update() {
        this.y -= CONFIG.floatTextSpeed;
        this.life--;
    }

    isExpired() { return this.life <= 0; }

    draw(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `bold 18px 'Jersey 10', sans-serif`;
        ctx.fillStyle = '#ffdd44';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        ctx.strokeText(this.text, this.x, this.y);
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

// 
// Game
// 

class Game {
    constructor() {
        this._canvas = canvas;
        this._ctx = ctx;

        this._input = new InputHandler();
        this._assetLoader = new AssetLoader();
        this._audioManager = new AudioManager();
        this._ui = new UIManager(this);

        // Round scoring
        this._playerWins = 0;
        this._enemyWins = 0;
        this._round = 1;

        // Game flags
        this._running = false;
        this._paused = false;
        this._gameOver = false;
        this._winner = null;     // 'player' | 'enemy' | null

        // Round intro state
        this._introActive = false;
        this._introTimer = 0;

        // Screen shake
        this._shakeX = 0;
        this._shakeY = 0;

        // Visual collections
        this._hitboxes = [];
        this._floatingTexts = [];

        // Ghost health bar (lag behind real HP visually)
        this._playerGhostHP = 100;
        this._enemyGhostHP = 100;

        this._rafId = null;
        this._lastTimestamp = null;
        this._gameOverTriggered = false;

        // Combo tracking
        this._comboCount = 0;
        this._comboTimer = 0;
        this._comboOwner = null;  // 'player' | 'enemy'

        this._gameLoop = this._gameLoop.bind(this);

        this._preloadAssets();
        this._preloadAudio();
    }

    //  Asset loading 

    _preloadAssets() {
        const list = [];
        for (const [charKey, anims] of Object.entries(ANIMATION_CONFIG)) {
            for (const [animKey, cfg] of Object.entries(anims)) {
                for (let i = 1; i <= cfg.frameCount; i++) {
                    list.push({
                        key: `${charKey}_${animKey}${i}`,
                        url: `${cfg.path}${i}${cfg.extension}`,
                    });
                }
            }
        }
        this._assetLoader.loadImages(list).catch(err =>
            console.error('[Game] Asset load error:', err)
        );
    }

    async _preloadAudio() {
        const audioList = [
            { key: 'bgm_fight', urls: ['assets/sfx/bgm/bgm_fight.mp3', 'assets/sfx/bgm/bgm_fight.ogg'] },
            { key: 'jump', urls: ['assets/sfx/jump/sfx_jump.mp3', 'assets/sfx/jump/sfx_jump.ogg'] },
            { key: 'punch', urls: ['assets/sfx/punch/sfx_punch.mp3', 'assets/sfx/punch/sfx_punch.ogg'] },
            { key: 'hit', urls: ['assets/sfx/hit/sfx_hit.mp3', 'assets/sfx/hit/sfx_hit.ogg'] },
            { key: 'block', urls: ['assets/sfx/block/sfx_block.mp3', 'assets/sfx/block/sfx_block.ogg'] },
            { key: 'ko', urls: ['assets/sfx/ko/sfx_ko.mp3', 'assets/sfx/ko/sfx_ko.ogg'] },
        ];
        await this._audioManager.loadAudioList(audioList).catch(err =>
            console.error('[Game] Audio load error:', err)
        );
    }

    //  Fighter / AI factory 

    _buildAnimationsConfig(charKey) {
        const result = {};
        for (const [animKey, cfg] of Object.entries(ANIMATION_CONFIG[charKey])) {
            const imageKeys = [];
            for (let i = 1; i <= cfg.frameCount; i++) {
                imageKeys.push(`${charKey}_${animKey}${i}`);
            }
            result[animKey] = {
                frameCount: cfg.frameCount,
                frameDuration: cfg.frameDuration,
                loop: cfg.loop,
                imageKeys,
            };
        }
        return result;
    }

    _initGameObjects() {
        const playerAnims = this._buildAnimationsConfig('player');
        const enemyAnims = this._buildAnimationsConfig('enemy');

        const shared = {
            width: 250,
            height: 280,
            attacks: ATTACKS,
            maxHealth: 100,
            assetLoader: this._assetLoader,
            audioManager: this._audioManager,
        };

        this._player = new Fighter({
            ...shared,
            name: 'Player',
            charKey: 'player',
            x: 100,
            y: CONFIG.groundY - 280,
            animationsConfig: playerAnims,
        });

        this._enemy = new Fighter({
            ...shared,
            name: 'Enemy',
            charKey: 'enemy',
            x: CONFIG.canvasWidth - 100 - 250,
            y: CONFIG.groundY - 280,
            animationsConfig: enemyAnims,
        });

        this._enemy.facingRight = false;

        this._enemyAI = new AIController(this._enemy, this._player, {
            difficulty: this._ui.getDifficulty(),
        });
        this._enemyAI.reset(); // seed _prevOpponentHealth to full HP before round starts

        // Ghost HP bars
        this._playerGhostHP = this._player.health;
        this._enemyGhostHP = this._enemy.health;

        // Reset collections
        this._hitboxes = [];
        this._floatingTexts = [];

        this._gameOver = false;
        this._winner = null;
    }

    //  Public game state API 

    startGame() {
        if (this._running) return;
        this._playerWins = 0;
        this._enemyWins = 0;
        this._round = 1;
        this._startRound();
    }

    _startRound() {
        this._initGameObjects();
        this._running = true;
        this._paused = false;
        this._introActive = true;
        this._introTimer = CONFIG.roundIntroMs;

        // Reset per-round visual state
        this._comboCount = 0;
        this._comboTimer = 0;
        this._comboOwner = null;
        this._shakeX = 0;
        this._shakeY = 0;

        this._audioManager.resumeContext().then(() =>
            this._audioManager.playMusic('bgm_fight', { volume: 0.5, loop: true })
        );

        this._lastTimestamp = null;
        if (!this._rafId) {
            this._rafId = requestAnimationFrame(this._gameLoop);
        }
    }

    stopGame() {
        this._running = false;
        this._paused = false;
        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
    }

    pauseGame() { if (this._running) this._paused = true; }
    resumeGame() {
        if (this._running && this._paused) {
            this._paused = false;
            this._lastTimestamp = null;
        }
    }

    isRunning() { return this._running; }
    isPaused() { return this._paused; }
    isGameOver() { return this._gameOver; }

    //  Volume / difficulty pass-throughs 

    setMasterVolume(v) { this._audioManager.setMasterVolume(v); }
    setMusicVolume(v) { this._audioManager.setMusicVolume(v); }
    setSFXVolume(v) { this._audioManager.setSFXVolume(v); }
    /** Stops the fight BGM — called by UIManager when returning to the main menu. */
    stopMusic() { this._audioManager.stopMusic(); }

    setDifficulty(val) {
        this._enemyAI?.setDifficulty(val);
    }

    //  Mobile virtual input pass-through 

    onVirtualButtonDown(action) { this._input.setVirtualKeyDown(this._actionToCode(action)); }
    onVirtualButtonUp(action) { this._input.setVirtualKeyUp(this._actionToCode(action)); }

    _actionToCode(action) {
        return {
            left: 'ArrowLeft',
            right: 'ArrowRight',
            jump: 'ArrowUp',
            attack: 'KeyJ',
            heavy: 'KeyU',
            sweep: 'KeyI',
            block: 'KeyK',
        }[action] ?? '';
    }

    //  Game loop 

    _gameLoop(timestamp) {
        if (!this._running) return;

        let dt = 0;
        if (this._lastTimestamp) {
            dt = Math.min((timestamp - this._lastTimestamp) / 1000, 0.05); // cap at 50ms
        }
        this._lastTimestamp = timestamp;

        if (!this._paused) {
            this._update(dt, timestamp);
        }

        this._draw();
        this._input.update();

        this._rafId = requestAnimationFrame(this._gameLoop);
    }

    _update(dt, timestamp) {
        // Round intro freeze
        if (this._introActive) {
            this._introTimer -= dt * 1000;
            if (this._introTimer <= 0) this._introActive = false;
            return;
        }

        if (this._gameOver) return;

        // Update fighters
        this._player.update(this._input);
        this._enemyAI.update();
        this._enemy.update();

        // Collect pending hitboxes
        for (const fighter of [this._player, this._enemy]) {
            if (fighter.pendingHitbox) {
                this._hitboxes.push(fighter.pendingHitbox);
                fighter.pendingHitbox = null;
            }
        }

        // Process hitboxes
        this._updateHitboxes();

        // Update visuals
        this._updateFloatingTexts();
        this._updateScreenShake();
        this._updateGhostHP(dt);
        this._updateCombo(dt);

        // Check round end
        this._checkRoundEnd();
    }

    //  Hitbox resolution 

    _updateHitboxes() {
        for (let i = this._hitboxes.length - 1; i >= 0; i--) {
            const hb = this._hitboxes[i];
            hb.update();

            for (const target of [this._player, this._enemy]) {
                if (!hb.checkCollision(target)) continue;

                const dir = hb.owner.facingRight ? 1 : -1;
                const prevHP = target.health;
                target.takeHit(hb.damage, hb.knockbackX * dir, hb.knockbackY);
                hb.markHit(target);

                // Floating damage number
                const dmg = prevHP - target.health;
                if (dmg > 0) {
                    const hurtbox = target.getHurtboxBounds();
                    this._floatingTexts.push(new FloatingText(
                        `-${Math.round(dmg)}`,
                        hurtbox.x + hurtbox.width / 2,
                        hurtbox.y
                    ));

                    // Screen shake proportional to damage
                    const isBigHit = hb.owner.currentAttack?.name === 'heavyPunch';
                    this._triggerShake(isBigHit ? CONFIG.shakeMagnitude * 1.5 : CONFIG.shakeMagnitude);

                    // Combo tracking
                    const who = (hb.owner === this._player) ? 'player' : 'enemy';
                    if (this._comboOwner === who) {
                        this._comboCount++;
                    } else {
                        this._comboCount = 1;
                        this._comboOwner = who;
                    }
                    this._comboTimer = 90; // reset window
                }
            }

            if (hb.isExpired()) this._hitboxes.splice(i, 1);
        }
    }

    //  Visual systems 

    _triggerShake(magnitude) {
        const angle = Math.random() * Math.PI * 2;
        this._shakeX = Math.cos(angle) * magnitude;
        this._shakeY = Math.sin(angle) * magnitude;
    }

    _updateScreenShake() {
        this._shakeX *= CONFIG.shakeDecay;
        this._shakeY *= CONFIG.shakeDecay;
        if (Math.abs(this._shakeX) < 0.1) this._shakeX = 0;
        if (Math.abs(this._shakeY) < 0.1) this._shakeY = 0;
    }

    _updateFloatingTexts() {
        for (let i = this._floatingTexts.length - 1; i >= 0; i--) {
            this._floatingTexts[i].update();
            if (this._floatingTexts[i].isExpired()) this._floatingTexts.splice(i, 1);
        }
    }

    _updateGhostHP(dt) {
        const speed = CONFIG.ghostBarSpeed;
        if (this._playerGhostHP > this._player.health) {
            this._playerGhostHP = Math.max(this._player.health, this._playerGhostHP - speed);
        }
        if (this._enemyGhostHP > this._enemy.health) {
            this._enemyGhostHP = Math.max(this._enemy.health, this._enemyGhostHP - speed);
        }
    }

    _updateCombo() {
        if (this._comboTimer > 0) {
            this._comboTimer--;
        } else {
            this._comboCount = 0;
            this._comboOwner = null;
        }
    }

    //  Round / match logic 

    _checkRoundEnd() {
        if (this._gameOver || this._gameOverTriggered) return;

        if (this._player.state === 'ko' || this._enemy.state === 'ko') {
            this._gameOverTriggered = true;
            setTimeout(() => {
                this._gameOverTriggered = false;
                this._gameOver = true;
                this._winner = this._player.state === 'ko' ? 'enemy' : 'player';

                if (this._winner === 'player') this._playerWins++;
                else this._enemyWins++;

                this._audioManager.stopMusic();
                this._ui.showGameOverOverlay();
            }, 1500);
        }
    }

    rematch() {
        this._gameOver = false;
        this._gameOverTriggered = false;
        this._winner = null;

        // Check if the match is over (someone reached roundsToWin)
        if (this._playerWins >= CONFIG.roundsToWin || this._enemyWins >= CONFIG.roundsToWin) {
            // Full rematch — reset win counts
            this._playerWins = 0;
            this._enemyWins = 0;
            this._round = 1;
        } else {
            this._round++;
        }
        this._startRound();
    }

    //  Drawing 

    _draw() {
        const ctx = this._ctx;

        ctx.save();
        ctx.translate(Math.round(this._shakeX), Math.round(this._shakeY));

        // Background
        this._drawBackground(ctx);

        // Fighters
        if (this._player) this._player.draw(ctx);
        if (this._enemy) this._enemy.draw(ctx);

        // Hitbox debug (comment out for release)
        // for (const hb of this._hitboxes) hb.drawDebug(ctx);

        // Floating texts
        for (const ft of this._floatingTexts) ft.draw(ctx);

        ctx.restore(); // end shake transform

        // HUD (not shaken)
        if (this._player && this._enemy) this._drawHUD(ctx);

        // Round intro overlay
        if (this._introActive) this._drawIntro(ctx);

        // Game over overlay
        if (this._gameOver) this._drawGameOver(ctx);

        // Combo display
        if (this._comboCount >= 2 && this._comboTimer > 0) this._drawCombo(ctx);
    }

    _drawBackground(ctx) {
        const W = CONFIG.canvasWidth;
        const H = CONFIG.canvasHeight;
        const G = CONFIG.groundY;

        // Sky gradient
        const sky = ctx.createLinearGradient(0, 0, 0, G);
        sky.addColorStop(0, '#0a0a1a');
        sky.addColorStop(0.6, '#1a1030');
        sky.addColorStop(1, '#2a1545');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, G);

        // Ground
        const ground = ctx.createLinearGradient(0, G, 0, H);
        ground.addColorStop(0, '#1a1020');
        ground.addColorStop(1, '#0d0810');
        ctx.fillStyle = ground;
        ctx.fillRect(0, G, W, H - G);

        // Neon floor line
        ctx.save();
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 18;
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, G);
        ctx.lineTo(W, G);
        ctx.stroke();
        ctx.restore();

        // Arena edge pillars (decorative)
        this._drawPillar(ctx, 30, G);
        this._drawPillar(ctx, W - 55, G);

        // Crowd silhouette
        this._drawCrowd(ctx, W, G);

        // Ground grid lines (perspective)
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 1;
        const rows = 5;
        for (let r = 0; r <= rows; r++) {
            const t = r / rows;
            const y = G + t * (H - G);
            const xL = W / 2 * (1 - t);
            const xR = W - xL;
            ctx.beginPath();
            ctx.moveTo(xL, y);
            ctx.lineTo(xR, y);
            ctx.stroke();
        }
        const cols = 7;
        for (let c = 0; c <= cols; c++) {
            const t = c / cols;
            ctx.beginPath();
            ctx.moveTo(W * t, G);
            ctx.lineTo(W / 2 * (1 - (1 - t * 2 < 0 ? -(t * 2 - 1) : 1 - t * 2)), H);
            ctx.stroke();
        }
        ctx.restore();

        // Black footer behind sprite overflow
        ctx.fillStyle = '#0d0810';
        ctx.fillRect(0, G + 1, 120, H - G - 1);
        ctx.fillRect(W - 145, G + 1, 145, H - G - 1);
    }

    _drawPillar(ctx, x, groundY) {
        const h = 160;
        ctx.save();
        const grad = ctx.createLinearGradient(x, groundY - h, x + 25, groundY - h);
        grad.addColorStop(0, '#6b21a8');
        grad.addColorStop(1, '#1e0a2e');
        ctx.fillStyle = grad;
        ctx.fillRect(x, groundY - h, 25, h);

        // Neon edge
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, groundY - h, 25, h);
        ctx.restore();
    }

    _drawCrowd(ctx, W, G) {
        ctx.save();
        ctx.globalAlpha = 0.18;
        // Simple crowd of silhouette bumps
        ctx.fillStyle = '#4a1d6e';
        for (let i = 0; i < W; i += 18) {
            const h = 20 + Math.sin(i * 0.3) * 8 + Math.sin(i * 0.7 + 1) * 5;
            ctx.beginPath();
            ctx.arc(i + 9, G - h, 9, Math.PI, 0);
            ctx.fill();
        }
        ctx.restore();
    }

    //  HUD 

    _drawHUD(ctx) {
        const BAR_W = 220;
        const BAR_H = 18;
        const PAD = 20;
        const BAR_Y = PAD;

        // Player bar (left)
        this._drawHealthBar(ctx, PAD, BAR_Y, BAR_W, BAR_H, this._player.health, this._playerGhostHP, this._player.maxHealth);
        // Enemy bar (right)
        this._drawHealthBar(ctx, CONFIG.canvasWidth - BAR_W - PAD, BAR_Y, BAR_W, BAR_H, this._enemy.health, this._enemyGhostHP, this._enemy.maxHealth);

        // Name plates
        ctx.save();
        ctx.font = `bold 13px 'Jersey 10', sans-serif`;
        ctx.fillStyle = '#e2e8f0';
        ctx.textAlign = 'left';
        ctx.fillText('YOU', PAD, BAR_Y + BAR_H + 14);
        ctx.textAlign = 'right';
        ctx.fillText('ENEMY', CONFIG.canvasWidth - PAD, BAR_Y + BAR_H + 14);
        ctx.restore();

        // Round + score indicator (top center)
        this._drawRoundInfo(ctx);
    }

    _drawHealthBar(ctx, x, y, w, h, hp, ghostHp, maxHp) {
        const pct = Math.max(0, hp) / maxHp;
        const ghostPct = Math.max(0, ghostHp) / maxHp;

        // Background track
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(x - 2, y - 2, w + 4, h + 4);

        // Ghost bar (orange, lags behind real HP)
        ctx.fillStyle = 'rgba(251, 146, 60, 0.55)';
        ctx.fillRect(x, y, w * ghostPct, h);

        // Actual HP bar with gradient
        const hpW = w * pct;
        if (hpW > 0) {
            const grad = ctx.createLinearGradient(x, y, x + hpW, y);
            if (pct > 0.5) { grad.addColorStop(0, '#22c55e'); grad.addColorStop(1, '#4ade80'); }
            else if (pct > 0.25) { grad.addColorStop(0, '#f59e0b'); grad.addColorStop(1, '#fbbf24'); }
            else { grad.addColorStop(0, '#ef4444'); grad.addColorStop(1, '#f87171'); }
            ctx.fillStyle = grad;
            ctx.fillRect(x, y, hpW, h);
        }

        // Border
        ctx.save();
        ctx.shadowColor = pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#f59e0b' : '#ef4444';
        ctx.shadowBlur = 6;
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
        ctx.restore();
    }

    _drawRoundInfo(ctx) {
        const cx = CONFIG.canvasWidth / 2;
        ctx.save();
        ctx.textAlign = 'center';

        // Round label
        ctx.font = `bold 14px 'Jersey 10', sans-serif`;
        ctx.fillStyle = '#c4b5fd';
        ctx.fillText(`ROUND ${this._round}`, cx, 58);

        // Win pips
        const pipR = 5;
        const pipGap = 14;
        const total = CONFIG.roundsToWin;
        const rowY = 34;

        // Player pips (left of center)
        for (let i = 0; i < total; i++) {
            ctx.beginPath();
            ctx.arc(cx - 20 - i * pipGap, rowY, pipR, 0, Math.PI * 2);
            ctx.fillStyle = i < this._playerWins ? '#22c55e' : 'rgba(255,255,255,0.2)';
            ctx.fill();
        }
        // Enemy pips (right of center)
        for (let i = 0; i < total; i++) {
            ctx.beginPath();
            ctx.arc(cx + 20 + i * pipGap, rowY, pipR, 0, Math.PI * 2);
            ctx.fillStyle = i < this._enemyWins ? '#ef4444' : 'rgba(255,255,255,0.2)';
            ctx.fill();
        }
        ctx.restore();
    }

    _roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
    }

    //  Overlays 

    _drawIntro(ctx) {
        const W = CONFIG.canvasWidth;
        const H = CONFIG.canvasHeight;
        const t = 1 - this._introTimer / CONFIG.roundIntroMs;

        // Fade-in → hold → fade-out
        let alpha;
        if (t < 0.2) alpha = t / 0.2;
        else if (t < 0.7) alpha = 1;
        else alpha = (1 - t) / 0.3;

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, W, H);

        const roundDone = t > 0.65;
        const text = roundDone ? 'FIGHT!' : `ROUND ${this._round}`;

        ctx.font = `bold 72px 'Jersey 10', sans-serif`;
        ctx.textAlign = 'center';
        ctx.shadowColor = roundDone ? '#fbbf24' : '#c084fc';
        ctx.shadowBlur = 30;
        ctx.fillStyle = roundDone ? '#fef08a' : '#e9d5ff';
        ctx.fillText(text, W / 2, H / 2 + 20);
        ctx.restore();
    }

    _drawGameOver(ctx) {
        const W = CONFIG.canvasWidth;
        const H = CONFIG.canvasHeight;
        const matchOver = this._playerWins >= CONFIG.roundsToWin || this._enemyWins >= CONFIG.roundsToWin;

        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(0, 0, W, H);

        ctx.save();
        ctx.textAlign = 'center';

        // Result text
        let resultText;
        if (matchOver) {
            resultText = this._playerWins >= CONFIG.roundsToWin ? 'YOU WIN THE MATCH!' : 'ENEMY WINS THE MATCH';
        } else {
            resultText = this._winner === 'player' ? 'ROUND WIN!' : 'ROUND LOST';
        }

        ctx.font = `bold 52px 'Jersey 10', sans-serif`;
        ctx.shadowColor = this._winner === 'player' ? '#22c55e' : '#ef4444';
        ctx.shadowBlur = 25;
        ctx.fillStyle = this._winner === 'player' ? '#86efac' : '#fca5a5';
        ctx.fillText(resultText, W / 2, H / 2 - 20);

        // Score
        ctx.font = `24px 'Jersey 10', sans-serif`;
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#c4b5fd';
        ctx.fillText(`${this._playerWins} — ${this._enemyWins}`, W / 2, H / 2 + 20);

        // Rematch hint
        ctx.font = `18px 'Jersey 10', sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText(matchOver ? 'Press REMATCH to play again' : 'Press NEXT ROUND or QUIT', W / 2, H / 2 + 55);
        ctx.restore();
    }

    _drawCombo(ctx) {
        if (this._comboCount < 2) return;
        const W = CONFIG.canvasWidth;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = `bold 28px 'Jersey 10', sans-serif`;
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#fef08a';
        ctx.fillText(`${this._comboCount}-HIT COMBO!`, W / 2, CONFIG.canvasHeight - 30);
        ctx.restore();
    }
}

// 
// Bootstrap
// 

window.addEventListener('load', () => {
    window.game = new Game();
});
