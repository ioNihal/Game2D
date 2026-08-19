import InputHandler from './input/inputHandler.js';
import AssetLoader from './utils/assetLoader.js';
import AudioManager from './utils/audioManager.js';
import EventBus from './core/eventBus.js';
import Fighter from './entities/fighter.js';
import CombatSystem from './systems/combat.js';
import { CONFIG } from './configs/config.js';
import { ASSET_MANIFEST } from './configs/assets.js';
import { PLAYER_CHARACTER } from './configs/characters/player.js';
import { ENEMY_CHARACTER } from './configs/characters/enemy.js';
import AIController from './controllers/ai.js';
import UIManager from './ui.js';
import Renderer from './render/renderer.js';
import HUD from './render/hud.js';
import Overlays from './render/overlays.js';
import FloatingText from './render/floatingText.js';

/** Maps UI touch-button labels to semantic actions (UIManager refactors in Phase 5). */
const VIRTUAL_BUTTONS = {
    left: 'moveLeft',
    right: 'moveRight',
    jump: 'jump',
    attack: 'lightPunch',
    heavy: 'heavyPunch',
    sweep: 'sweepKick',
    block: 'block',
};


// Canvas setup

const renderer = new Renderer(document.getElementById('gameCanvas'));
const ctx = renderer.ctx;

window.addEventListener('load', renderer.resize.bind(renderer));
window.addEventListener('resize', renderer.resize.bind(renderer));
window.addEventListener('orientationchange', renderer.resize.bind(renderer));
renderer.resize();

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
// Game
// 

class Game {
    constructor() {
        this._renderer = renderer;
        this._hud = new HUD();
        this._overlays = new Overlays();

        this._input = new InputHandler();
        this._assetLoader = new AssetLoader();
        this._audioManager = new AudioManager();
        this._ui = new UIManager(this);

        // Event bus: systems emit, UI/audio side-effects subscribe
        this._bus = new EventBus();
        this._combat = new CombatSystem({ bus: this._bus });
        this._bus.on('sfx', ({ sound }) => this._audioManager.playSFX(sound));
        this._bus.on('combat:hit', (payload) => this._onCombatHit(payload));

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
        this._assetLoader.loadImages(ASSET_MANIFEST.images).catch(err =>
            console.error('[Game] Asset load error:', err)
        );
    }

    async _preloadAudio() {
        await this._audioManager.loadAudioList(ASSET_MANIFEST.audio).catch(err =>
            console.error('[Game] Audio load error:', err)
        );
    }

    //  Fighter / AI factory 

    _initGameObjects() {
        this._player = new Fighter({
            character: PLAYER_CHARACTER,
            x: PLAYER_CHARACTER.start.x,
            y: CONFIG.groundY - PLAYER_CHARACTER.physics.height,
            assetLoader: this._assetLoader,
            bus: this._bus,
        });

        this._enemy = new Fighter({
            character: ENEMY_CHARACTER,
            x: ENEMY_CHARACTER.start.x,
            y: CONFIG.groundY - ENEMY_CHARACTER.physics.height,
            assetLoader: this._assetLoader,
            bus: this._bus,
        });

        this._combat.setFighters([this._player, this._enemy]);
        this._combat.clear();

        this._enemyAI = new AIController(this._enemy, this._player, {
            difficulty: this._ui.getDifficulty(),
        });
        this._enemyAI.reset(); // seed _prevOpponentHealth to full HP before round starts

        // Ghost HP bars
        this._playerGhostHP = this._player.health;
        this._enemyGhostHP = this._enemy.health;

        // Reset collections
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

    onVirtualButtonDown(label) {
        const action = VIRTUAL_BUTTONS[label];
        if (action) this._input.setVirtualDown(action);
    }
    onVirtualButtonUp(label) {
        const action = VIRTUAL_BUTTONS[label];
        if (action) this._input.setVirtualUp(action);
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

        // Collect + resolve hitboxes (emits combat:hit events)
        for (const fighter of [this._player, this._enemy]) {
            this._combat.collect(fighter);
        }
        this._combat.update();

        // Update visuals
        this._updateFloatingTexts();
        this._updateScreenShake();
        this._updateGhostHP(dt);
        this._updateCombo(dt);

        // Check round end
        this._checkRoundEnd();
    }

    //  Combat event side-effects (visual + audio)

    /**
     * Handles a resolved hit: floating damage number, screen shake, combo
     * tracking, and the corresponding sound effect.
     */
    _onCombatHit({ attacker, damage, blocked, ko, x, y, big }) {
        if (damage > 0) {
            this._floatingTexts.push(new FloatingText(
                `-${Math.round(damage)}`,
                x,
                y
            ));

            // Screen shake proportional to damage
            this._triggerShake(big ? CONFIG.shakeMagnitude * 1.5 : CONFIG.shakeMagnitude);

            // Combo tracking
            const who = (attacker === this._player) ? 'player' : 'enemy';
            if (this._comboOwner === who) {
                this._comboCount++;
            } else {
                this._comboCount = 1;
                this._comboOwner = who;
            }
            this._comboTimer = 90; // reset window
        }

        if (blocked) this._audioManager.playSFX('block');
        else if (ko) this._audioManager.playSFX('ko');
        else this._audioManager.playSFX('hit');
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
        const ctx = this._renderer.ctx;

        this._renderer.beginWorld(this._shakeX, this._shakeY);

        // Background
        this._renderer.drawBackground(ctx);

        // Fighters
        if (this._player) this._player.draw(ctx);
        if (this._enemy) this._enemy.draw(ctx);

        // Floating texts
        for (const ft of this._floatingTexts) ft.draw(ctx);

        this._renderer.endWorld(); // end shake transform

        // HUD (not shaken)
        if (this._player && this._enemy) {
            this._hud.draw(ctx, {
                playerHealth: this._player.health,
                playerGhostHP: this._playerGhostHP,
                playerMaxHealth: this._player.maxHealth,
                enemyHealth: this._enemy.health,
                enemyGhostHP: this._enemyGhostHP,
                enemyMaxHealth: this._enemy.maxHealth,
                playerWins: this._playerWins,
                enemyWins: this._enemyWins,
                round: this._round,
            });
        }

        // Round intro overlay
        if (this._introActive) this._overlays.drawIntro(ctx, { round: this._round, timer: this._introTimer });

        // Game over overlay
        if (this._gameOver) this._overlays.drawGameOver(ctx, { winner: this._winner, playerWins: this._playerWins, enemyWins: this._enemyWins });

        // Combo display
        if (this._comboCount >= 2 && this._comboTimer > 0) this._overlays.drawCombo(ctx, this._comboCount);
    }
}

// 
// Bootstrap
// 

window.addEventListener('load', () => {
    window.game = new Game();
});
