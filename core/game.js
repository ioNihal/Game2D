import InputHandler from '../input/inputHandler.js';
import AssetLoader from '../utils/assetLoader.js';
import AudioManager from '../utils/audioManager.js';
import EventBus from '../core/eventBus.js';
import GameLoop from './gameLoop.js';
import CombatSystem from '../systems/combat.js';
import MatchSystem from '../systems/match.js';
import { CONFIG } from '../configs/config.js';
import { ASSET_MANIFEST } from '../configs/assets.js';
import { buildFighter } from '../entities/characterFactory.js';
import { PLAYER_CHARACTER } from '../configs/characters/player.js';
import { ENEMY_CHARACTER } from '../configs/characters/enemy.js';
import AIController from '../controllers/ai.js';
import UIManager from '../ui.js';
import HUD from '../render/hud.js';
import Overlays from '../render/overlays.js';
import FloatingText from '../render/floatingText.js';

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

/**
 * Game — orchestration facade.
 *
 * Composes systems (GameLoop, CombatSystem, MatchSystem, EventBus), entities
 * (fighters built once via CharacterFactory and reused across rounds), the
 * render modules, and the UIManager. Gameplay logic lives in the systems;
 * this class only wires them together and applies visual/audio side-effects
 * in response to their events.
 */
export default class Game {
    /**
     * @param {{ renderer: import('../render/renderer.js').default }} deps
     */
    constructor({ renderer }) {
        this._renderer = renderer;
        this._hud = new HUD();
        this._overlays = new Overlays();

        this._input = new InputHandler();
        this._assetLoader = new AssetLoader();
        this._audioManager = new AudioManager();
        this._ui = new UIManager(this);

        // Event bus: systems emit, Game applies side-effects
        this._bus = new EventBus();
        this._combat = new CombatSystem({ bus: this._bus });
        this._match = new MatchSystem({ bus: this._bus });

        this._bus.on('sfx', ({ sound }) => this._audioManager.playSFX(sound));
        this._bus.on('combat:hit', (payload) => this._onCombatHit(payload));
        this._bus.on('match:roundStart', () => this._onRoundStart());
        this._bus.on('match:roundEnd', () => this._onRoundEnd());

        // Game flags
        this._running = false;
        this._paused = false;

        // Screen shake
        this._shakeX = 0;
        this._shakeY = 0;

        // Visual collections
        this._floatingTexts = [];

        // Ghost health bar (lag behind real HP visually)
        this._playerGhostHP = 100;
        this._enemyGhostHP = 100;

        // Combo tracking
        this._comboCount = 0;
        this._comboTimer = 0;
        this._comboOwner = null;  // 'player' | 'enemy'

        // Fixed-timestep loop: 60 Hz logic, rAF render
        this._loop = new GameLoop({
            update: () => this._step(),
            render: () => this._draw(),
        });

        // Fighters built once, reused across rounds via reset()
        this._player = buildFighter({
            character: PLAYER_CHARACTER,
            x: PLAYER_CHARACTER.start.x,
            y: CONFIG.groundY - PLAYER_CHARACTER.physics.height,
            assetLoader: this._assetLoader,
            bus: this._bus,
        });
        this._enemy = buildFighter({
            character: ENEMY_CHARACTER,
            x: ENEMY_CHARACTER.start.x,
            y: CONFIG.groundY - ENEMY_CHARACTER.physics.height,
            assetLoader: this._assetLoader,
            bus: this._bus,
        });
        this._combat.setFighters([this._player, this._enemy]);

        this._enemyAI = new AIController(this._enemy, this._player, {
            difficulty: this._ui.getDifficulty(),
        });

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

    //  Public game state API

    startGame() {
        if (this._running) return;
        this._running = true;
        this._paused = false;
        this._match.startMatch();
        this._loop.start();
    }

    stopGame() {
        this._running = false;
        this._paused = false;
        this._loop.stop();
    }

    pauseGame() { if (this._running) this._paused = true; }
    resumeGame() {
        if (this._running && this._paused) {
            this._paused = false;
            this._loop.resetTiming();
        }
    }

    isRunning() { return this._running; }
    isPaused() { return this._paused; }
    isGameOver() { return this._match.isSettled; }

    rematch() {
        this._match.nextRound();
    }

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

    //  Fixed-timestep logic (one step = 1/60 s)

    _step() {
        if (this._paused) return;

        // Advance match timers (intro countdown, KO delay)
        this._match.update();

        // Frozen during intro and after a round settles
        if (!this._match.isIntro && !this._match.isSettled) {
            this._updateFighters();
            this._updateVisuals();
            this._detectKO();
        }

        this._input.update();
    }

    _updateFighters() {
        this._player.update(this._input);
        this._enemyAI.update();
        this._enemy.update();

        // Collect + resolve hitboxes (emits combat:hit events)
        for (const fighter of [this._player, this._enemy]) {
            this._combat.collect(fighter);
        }
        this._combat.update();
    }

    _updateVisuals() {
        this._updateFloatingTexts();
        this._updateScreenShake();
        this._updateGhostHP();
        this._updateCombo();
    }

    _detectKO() {
        if (!this._match.isFighting) return;
        if (this._player.state === 'ko' || this._enemy.state === 'ko') {
            this._match.onKO(this._player.state === 'ko' ? 'enemy' : 'player');
        }
    }

    //  Match event side-effects

    _onRoundStart() {
        // Reuse fighters: reset to their start positions + full health
        this._player.reset(PLAYER_CHARACTER.start.x);
        this._enemy.reset(ENEMY_CHARACTER.start.x);
        this._enemyAI.reset(); // seed _prevOpponentHealth to full HP before round starts
        this._combat.clear();

        // Ghost HP bars
        this._playerGhostHP = this._player.health;
        this._enemyGhostHP = this._enemy.health;

        // Reset per-round visual state
        this._floatingTexts = [];
        this._comboCount = 0;
        this._comboTimer = 0;
        this._comboOwner = null;
        this._shakeX = 0;
        this._shakeY = 0;

        this._audioManager.resumeContext().then(() =>
            this._audioManager.playMusic('bgm_fight', { volume: 0.5, loop: true })
        );
    }

    _onRoundEnd() {
        this._audioManager.stopMusic();
        this._ui.showGameOverOverlay();
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

    _updateGhostHP() {
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
                playerWins: this._match.playerWins,
                enemyWins: this._match.enemyWins,
                round: this._match.round,
            });
        }

        // Round intro overlay
        if (this._match.isIntro) {
            this._overlays.drawIntro(ctx, { round: this._match.round, timer: this._match.introMs });
        }

        // Game over overlay
        if (this._match.isSettled) {
            this._overlays.drawGameOver(ctx, {
                winner: this._match.winner,
                playerWins: this._match.playerWins,
                enemyWins: this._match.enemyWins,
            });
        }

        // Combo display
        if (this._comboCount >= 2 && this._comboTimer > 0) this._overlays.drawCombo(ctx, this._comboCount);
    }
}