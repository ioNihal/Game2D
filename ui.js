import SettingsStore from './ui/settingsStore.js';

/**
 * UIManager — manages all HTML overlay screens, settings persistence,
 * mobile controls, and button sound effects.
 *
 * Works in concert with Game (passed as a reference) but does NOT
 * reach into game internals beyond the documented public API:
 *   game.startGame()   game.stopGame()    game.rematch()
 *   game.pauseGame()   game.resumeGame()  game.isRunning()   game.isPaused()
 *   game.setMasterVolume() / setMusicVolume() / setSFXVolume()
 *   game.setDifficulty()
 *   game.onVirtualButtonDown() / onVirtualButtonUp()
 */
export default class UIManager {
    constructor(game) {
        this._game = game;

        //  Screen elements 
        this._menuScreen = document.getElementById('menuScreen');
        this._settingsScreen = document.getElementById('settingsScreen');
        this._instructionsScreen = document.getElementById('instructionsScreen');
        this._pauseOverlay = document.getElementById('pauseOverlay');
        this._gameOverOverlay = document.getElementById('gameOverOverlay');
        this._mobileControls = document.getElementById('mobileControls');
        this._pauseButton = document.getElementById('pauseButton');

        //  Menu buttons 
        this._startButton = document.getElementById('startButton');
        this._settingsButton = document.getElementById('settingsButton');
        this._instructionsButton = document.getElementById('instructionsButton');

        //  Settings 
        this._settingsBackButton = document.getElementById('settingsBackButton');
        this._masterVolumeRange = document.getElementById('masterVolumeRange');
        this._musicVolumeRange = document.getElementById('musicVolumeRange');
        this._sfxVolumeRange = document.getElementById('sfxVolumeRange');
        this._muteToggle = document.getElementById('muteToggle');
        this._touchToggle = document.getElementById('touchToggle');
        this._difficultySelect = document.getElementById('difficultySelect');

        //  Instructions 
        this._instructionsBackButton = document.getElementById('instructionsBackButton');

        //  Pause overlay 
        this._resumeButton = document.getElementById('resumeButton');
        this._pauseSettingsButton = document.getElementById('pauseSettingsButton');
        this._quitButton = document.getElementById('quitButton');

        //  Game-over overlay 
        this._rematchButton = document.getElementById('rematchButton');
        this._quitToMenuButton = document.getElementById('quitToMenuButton');

        //  Mobile touch buttons 
        this._btnLeft = document.getElementById('btnLeft');
        this._btnRight = document.getElementById('btnRight');
        this._btnJump = document.getElementById('btnJump');
        this._btnAttack = document.getElementById('btnAttack');
        this._btnHeavy = document.getElementById('btnHeavy');
        this._btnSweep = document.getElementById('btnSweep');
        this._btnBlock = document.getElementById('btnBlock');

        //  SFX / BGM (outside AudioManager — for menu screens) 
        this._hoverSfx = new Audio('./assets/hover.mp3');
        this._splashBgm = new Audio('./assets/main.mp3');
        this._splashBgm.loop = true;

        // Track first user gesture (required for audio autoplay)
        this._userInteracted = false;

        // Track which screen opened Settings (so Back returns correctly)
        this._settingsParent = null;

        // Settings — single source of truth, persisted + reactive
        this._settingsStore = new SettingsStore();
        this._settingsStore.onChange(() => this._applySettings());
        this._populateFormFromSettings();

        this._bindEvents();
        this._applySettings();
        this._updateMobileControlsVisibility();

        window.addEventListener('resize', () => this._updateMobileControlsVisibility());
    }

    //  Public API 

    /** Returns the currently selected difficulty string. */
    getDifficulty() {
        return this._settingsStore.difficulty;
    }

    showMainMenu() {
        this._hideAllScreens();
        this._show(this._menuScreen);
        this._updateHUDVisibility();
        this._updateMobileControlsVisibility();
        this._game.stopMusic();   // stop fight BGM when returning to menu
        this._splashBgm.currentTime = 0;
        this._splashBgm.play().catch(() => { });
    }

    showGameOverOverlay() {
        this._show(this._gameOverOverlay);
        this._updateHUDVisibility();
        this._updateMobileControlsVisibility();
    }

    hideGameOverOverlay() {
        this._hide(this._gameOverOverlay);
    }

    //  Settings helpers 

    _showSettings(parent) {
        this._settingsParent = parent;
        if (parent === 'pause' && this._game.isRunning() && !this._game.isPaused()) {
            this._game.pauseGame();
        }
        this._hideAllScreens();
        this._show(this._settingsScreen);
    }

    _onSettingsBack() {
        this._hide(this._settingsScreen);
        if (this._settingsParent === 'menu') this._show(this._menuScreen);
        if (this._settingsParent === 'pause') this._show(this._pauseOverlay);
        this._settingsParent = null;
    }

    //  Event binding 

    _bindEvents() {
        // First-gesture listener for audio
        document.addEventListener('click', () => {
            if (this._userInteracted) return;
            this._userInteracted = true;
            if (!this._menuScreen?.classList.contains('hidden')) {
                this._splashBgm.play().catch(() => { });
            }
        }, { once: false });

        // Hover sound on all buttons
        document.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                if (!this._userInteracted) return;
                this._hoverSfx.currentTime = 0;
                this._hoverSfx.play().catch(() => { });
            });
        });

        //  Main menu 
        this._startButton?.addEventListener('click', () => {
            this._splashBgm.pause();
            this._splashBgm.currentTime = 0;
            this._hideAllScreens();
            this._game.startGame();
            this._updateHUDVisibility();
            this._updateMobileControlsVisibility();
        });

        this._settingsButton?.addEventListener('click', () => {
            if (!this._game.isRunning()) this._showSettings('menu');
        });

        this._instructionsButton?.addEventListener('click', () => {
            if (!this._game.isRunning()) {
                this._hideAllScreens();
                this._show(this._instructionsScreen);
            }
        });

        //  Settings 
        this._settingsBackButton?.addEventListener('click', () => this._onSettingsBack());

        this._masterVolumeRange?.addEventListener('input', e =>
            this._settingsStore.update({ masterVolume: parseFloat(e.target.value) }));
        this._musicVolumeRange?.addEventListener('input', e =>
            this._settingsStore.update({ musicVolume: parseFloat(e.target.value) }));
        this._sfxVolumeRange?.addEventListener('input', e =>
            this._settingsStore.update({ sfxVolume: parseFloat(e.target.value) }));
        this._muteToggle?.addEventListener('change', e =>
            this._settingsStore.update({ muted: e.target.checked }));
        this._touchToggle?.addEventListener('change', e => {
            this._settingsStore.update({ touchMode: e.target.value });
            this._updateMobileControlsVisibility();
        });
        this._difficultySelect?.addEventListener('change', e =>
            this._settingsStore.update({ difficulty: e.target.value }));

        //  Instructions 
        this._instructionsBackButton?.addEventListener('click', () => {
            this._hideAllScreens();
            this._show(this._menuScreen);
        });

        //  Pause overlay 
        this._pauseButton?.addEventListener('click', () => {
            if (this._game.isRunning() && !this._game.isPaused()) {
                this._show(this._pauseOverlay);
                this._game.pauseGame();
                this._updateMobileControlsVisibility();
            }
        });

        this._resumeButton?.addEventListener('click', () => {
            this._hide(this._pauseOverlay);
            this._game.resumeGame();
            this._updateMobileControlsVisibility();
        });

        this._pauseSettingsButton?.addEventListener('click', () => {
            if (this._game.isRunning() && this._game.isPaused()) {
                this._showSettings('pause');
            }
        });

        this._quitButton?.addEventListener('click', () => {
            this._hide(this._pauseOverlay);
            this._game.stopGame();
            this.showMainMenu();
        });

        //  Game-over overlay 
        this._rematchButton?.addEventListener('click', () => {
            this.hideGameOverOverlay();
            this._game.rematch();
            this._updateHUDVisibility();
            this._updateMobileControlsVisibility();
        });

        this._quitToMenuButton?.addEventListener('click', () => {
            this.hideGameOverOverlay();
            this._game.stopGame();
            this.showMainMenu();
        });

        //  Keyboard shortcuts 
        window.addEventListener('keydown', e => {
            if (e.code !== 'Escape') return;

            if (this._isVisible(this._settingsScreen)) {
                this._onSettingsBack();
            } else if (this._isVisible(this._instructionsScreen)) {
                this._hideAllScreens();
                this._show(this._menuScreen);
            } else if (this._game.isRunning() && !this._game.isPaused()) {
                this._show(this._pauseOverlay);
                this._game.pauseGame();
                this._updateMobileControlsVisibility();
            } else if (this._game.isRunning() && this._game.isPaused() && this._isVisible(this._pauseOverlay)) {
                this._hide(this._pauseOverlay);
                this._game.resumeGame();
                this._updateMobileControlsVisibility();
            }
        });

        //  Mobile touch buttons 
        this._bindTouchButton(this._btnLeft, 'left');
        this._bindTouchButton(this._btnRight, 'right');
        this._bindTouchButton(this._btnJump, 'jump');
        this._bindTouchButton(this._btnAttack, 'attack');
        this._bindTouchButton(this._btnHeavy, 'heavy');
        this._bindTouchButton(this._btnSweep, 'sweep');
        this._bindTouchButton(this._btnBlock, 'block');
    }

    _bindTouchButton(elem, action) {
        if (!elem) return;
        const down = () => this._game.onVirtualButtonDown(action);
        const up = () => this._game.onVirtualButtonUp(action);
        elem.addEventListener('touchstart', e => { e.preventDefault(); down(); }, { passive: false });
        elem.addEventListener('touchend', e => { e.preventDefault(); up(); }, { passive: false });
        elem.addEventListener('mousedown', e => { e.preventDefault(); down(); });
        elem.addEventListener('mouseup', e => { e.preventDefault(); up(); });
        elem.addEventListener('mouseleave', e => { e.preventDefault(); up(); });
    }

    //  Settings — form ↔ store sync 

    _populateFormFromSettings() {
        const s = this._settingsStore;
        if (this._masterVolumeRange) this._masterVolumeRange.value = s.masterVolume;
        if (this._musicVolumeRange) this._musicVolumeRange.value = s.musicVolume;
        if (this._sfxVolumeRange) this._sfxVolumeRange.value = s.sfxVolume;
        if (this._muteToggle) this._muteToggle.checked = s.muted;
        if (this._touchToggle) this._touchToggle.value = s.touchMode;
        if (this._difficultySelect) this._difficultySelect.value = s.difficulty;
    }

    /** Pushes stored settings into the audio pipeline + game. */
    _applySettings() {
        const s = this._settingsStore;
        this._splashBgm.volume = s.masterVolume;
        this._splashBgm.muted = s.muted;

        if (s.muted) {
            this._game.setMasterVolume(0);
        } else {
            this._game.setMasterVolume(s.masterVolume);
            this._game.setMusicVolume(s.musicVolume);
            this._game.setSFXVolume(s.sfxVolume);
        }
        this._game.setDifficulty(s.difficulty);
    }

    //  Visibility helpers 

    _show(el) { el?.classList.remove('hidden'); }
    _hide(el) { el?.classList.add('hidden'); }
    _isVisible(el) { return el && !el.classList.contains('hidden'); }

    _hideAllScreens() {
        [
            this._menuScreen,
            this._settingsScreen,
            this._instructionsScreen,
            this._pauseOverlay,
            this._gameOverOverlay,
        ].forEach(el => this._hide(el));
    }

    _updateHUDVisibility() {
        const inGame = this._game.isRunning() && !this._game.isPaused() && !this._game.isGameOver();
        inGame ? this._show(this._pauseButton) : this._hide(this._pauseButton);
    }

    _updateMobileControlsVisibility() {
        const mode = this._touchToggle?.value ?? 'auto';
        const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const wantShow = mode === 'on' || (mode === 'auto' && isTouch);
        const canShow = wantShow
            && this._game.isRunning()
            && !this._game.isPaused()
            && !this._game.isGameOver()
            && !this._isVisible(this._settingsScreen)
            && !this._isVisible(this._instructionsScreen)
            && !this._isVisible(this._pauseOverlay)
            && !this._isVisible(this._gameOverOverlay);

        canShow ? this._show(this._mobileControls) : this._hide(this._mobileControls);
    }
}
