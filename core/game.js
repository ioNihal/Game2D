import InputHandler from '../input/inputHandler.js';
import AssetLoader from '../utils/assetLoader.js';
import EventBus from '../core/eventBus.js';
import GameLoop from './gameLoop.js';
import CombatSystem from '../systems/combat.js';
import MatchSystem from '../systems/match.js';
import { CONFIG } from '../configs/config.js';
import { ASSET_MANIFEST } from '../configs/assets.js';
import { buildFighter } from '../entities/characterFactory.js';
import { PLAYER_CHARACTER } from '../configs/characters/player.js';
import { ENEMY_CHARACTER } from '../configs/characters/enemy.js';
import AIController from '../ai/aiController.js';
import HUD from '../render/hud.js';
import Overlays from '../render/overlays.js';
import FloatingText from '../render/floatingText.js';

/**
 * Game — orchestration facade.
 *
 * Composes systems (GameLoop, CombatSystem, MatchSystem, EventBus), entities
 * (fighters built once via CharacterFactory and reused across rounds), and the
 * render modules. Gameplay logic lives in the systems; this class only wires
 * them together and applies visual/audio side-effects in response to their
 * events.
 *
 * Dependencies are injected via constructor (no UIManager construction here):
 *   renderer, bus, audio, input, settingsStore
 */
export default class Game {
    /**
     * @param {{
     *   renderer: import('../render/renderer.js').default,
     *   bus: EventBus,
     *   audio: import('../utils/audioManager.js').default,
     *   input: InputHandler,
     *   settingsStore: import('../ui/settingsStore.js').default,
     * }} deps
     */
    constructor({ renderer, bus, audio, input, settingsStore }) {
        this._renderer = renderer;
        this._bus = bus;
        this._audio = audio;
        this._input = input;
        this._settingsStore = settingsStore;
        this._hud = new HUD();
        this._overlays = new Overlays();

        this._assetLoader = new AssetLoader();

        // Combat + Match systems
        this._combat = new CombatSystem({ bus: this._bus });
        this._match = new MatchSystem({ bus: this._bus });

        // System event handlers
        this._bus.on('sfx', ({ sound }) => this._audio.playSFX(sound));
        this._bus.on('combat:hit', (payload) => this._onCombatHit(payload));
        this._bus.on('match:roundStart', () => this._onRoundStart());
        this._bus.on('match:roundEnd', () => this._onRoundEnd());

        // Debug killswitch (only fires when CONFIG.debug is true)
        this._bus.on('debug:killswitch', () => {
            if (this._enemy && this._enemy.state !== 'ko') {
                this._enemy.health = 0;
                this._enemy.enterState('ko');
            }
        });

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
        this._comboOwner = null;

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
            difficulty: this._settingsStore.difficulty,
            characterConfig: ENEMY_CHARACTER,
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
        await this._audio.loadAudioList(ASSET_MANIFEST.audio).catch(err =>
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
        this._bus.emit('game:started');
    }

    stopGame() {
        this._running = false;
        this._paused = false;
        this._loop.stop();
        this._bus.emit('game:stopped');
    }

    pauseGame() {
        if (this._running && !this._paused) {
            this._paused = true;
            this._bus.emit('game:paused');
        }
    }
    resumeGame() {
        if (this._running && this._paused) {
            this._paused = false;
            this._loop.resetTiming();
            this._bus.emit('game:resumed');
        }
    }

    isRunning() { return this._running; }
    isPaused() { return this._paused; }
    isGameOver() { return this._match.isSettled; }

    rematch() {
        this._match.nextRound();
    }

    //  Difficulty (reactive to settings changes)

    setDifficulty(val) {
        this._enemyAI?.setDifficulty(val);
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
        // Player reads physical keyboard + virtual touch via InputHandler
        this._player.update(this._input);

        // AI writes to its own VirtualInput, then fighter reads it
        this._enemyAI.update();
        this._enemy.update(this._enemyAI.getInput());

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
        this._enemyAI.reset();
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

        this._audio.resumeContext().then(() =>
            this._audio.playMusic('bgm_fight', { volume: 0.5, loop: true })
        );
    }

    _onRoundEnd() {
        this._audio.stopMusic();
        this._bus.emit('game:roundEnd');
    }

    //  Combat event side-effects (visual + audio)

    _onCombatHit({ attacker, damage, blocked, ko, x, y, big }) {
        if (damage > 0) {
            this._floatingTexts.push(new FloatingText(
                `-${Math.round(damage)}`,
                x,
                y
            ));

            this._triggerShake(big ? CONFIG.shakeMagnitude * 1.5 : CONFIG.shakeMagnitude);

            const who = (attacker === this._player) ? 'player' : 'enemy';
            if (this._comboOwner === who) {
                this._comboCount++;
            } else {
                this._comboCount = 1;
                this._comboOwner = who;
            }
            this._comboTimer = 90;
        }

        if (blocked) this._audio.playSFX('block');
        else if (ko) this._audio.playSFX('ko');
        else this._audio.playSFX('hit');
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

        this._renderer.endWorld();

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

    //  Getters for debug integration

    getPlayer() { return this._player; }
    getEnemy() { return this._enemy; }
}
