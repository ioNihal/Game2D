/**
 * UIManager — manages all HTML overlay screens and settings UI.
 *
 * Communicates with Game exclusively through EventBus events:
 *   Game emits → game:started, game:stopped, game:paused, game:resumed,
 *                game:roundEnd, game:assetsReady
 *   UIManager emits → ui:startGame, ui:pauseGame, ui:resumeGame,
 *                     ui:quitToMenu, ui:rematch
 *
 * Receives dependencies via constructor (no `window.game` global):
 *   bus — EventBus
 *   audio — AudioManager (for menu BGM / hover SFX)
 *   settingsStore — SettingsStore (single source of truth)
 */
export default class UIManager {
    /**
     * @param {{
     *   bus: import('../core/eventBus.js').default,
     *   audio: import('../utils/audioManager.js').default,
     *   settingsStore: import('./settingsStore.js').default,
     * }} deps
     */
    constructor({ bus, audio, settingsStore }) {
        this._bus = bus;
        this._audio = audio;
        this._settingsStore = settingsStore;

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

        // Track first user gesture (required for audio autoplay)
        this._userInteracted = false;

        // Track which screen opened Settings (so Back returns correctly)
        this._settingsParent = null;

        // Settings — single source of truth, persisted + reactive
        this._populateFormFromSettings();

        // Loading gate — Start stays disabled until assets are ready
        this._startButton.disabled = true;

        this._bindEvents();
        this._updateMobileControlsVisibility();

        window.addEventListener('resize', () => this._updateMobileControlsVisibility());
    }

    //  Public API 

    showMainMenu() {
        this._hideAllScreens();
        this._show(this._menuScreen);
        this._updateHUDVisibility();
        this._updateMobileControlsVisibility();
        this._audio.stopMusic();
        this._audio.playMusic('bgm_menu', { volume: 0.4, loop: true });
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
        if (parent === 'pause') {
            this._bus.emit('ui:pauseGame');
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
                this._audio.resumeContext().then(() =>
                    this._audio.playMusic('bgm_menu', { volume: 0.4, loop: true })
                );
            }
        }, { once: false });

        // Hover sound on all buttons
        document.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                if (!this._userInteracted) return;
                this._audio.playSFX('hover');
            });
        });

        //  Main menu 
        this._startButton?.addEventListener('click', () => {
            this._audio.stopMusic();
            this._hideAllScreens();
            this._bus.emit('ui:startGame');
            this._updateHUDVisibility();
            this._updateMobileControlsVisibility();
        });

        this._settingsButton?.addEventListener('click', () => {
            this._showSettings('menu');
        });

        this._instructionsButton?.addEventListener('click', () => {
            this._hideAllScreens();
            this._show(this._instructionsScreen);
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
            this._bus.emit('ui:pauseGame');
            this._show(this._pauseOverlay);
            this._updateMobileControlsVisibility();
        });

        this._resumeButton?.addEventListener('click', () => {
            this._hide(this._pauseOverlay);
            this._bus.emit('ui:resumeGame');
            this._updateMobileControlsVisibility();
        });

        this._pauseSettingsButton?.addEventListener('click', () => {
            this._showSettings('pause');
        });

        this._quitButton?.addEventListener('click', () => {
            this._hide(this._pauseOverlay);
            this._bus.emit('ui:quitToMenu');
        });

        //  Game-over overlay 
        this._rematchButton?.addEventListener('click', () => {
            this.hideGameOverOverlay();
            this._bus.emit('ui:rematch');
            this._updateHUDVisibility();
            this._updateMobileControlsVisibility();
        });

        this._quitToMenuButton?.addEventListener('click', () => {
            this.hideGameOverOverlay();
            this._bus.emit('ui:quitToMenu');
        });

        //  Keyboard shortcuts 
        window.addEventListener('keydown', e => {
            if (e.code !== 'Escape') return;

            if (this._isVisible(this._settingsScreen)) {
                this._onSettingsBack();
            } else if (this._isVisible(this._instructionsScreen)) {
                this._hideAllScreens();
                this._show(this._menuScreen);
            } else if (this._pauseButton && !this._pauseButton.classList.contains('hidden')) {
                // In-game: pause
                this._bus.emit('ui:pauseGame');
                this._show(this._pauseOverlay);
                this._updateMobileControlsVisibility();
            } else if (this._isVisible(this._pauseOverlay)) {
                this._hide(this._pauseOverlay);
                this._bus.emit('ui:resumeGame');
                this._updateMobileControlsVisibility();
            }
        });

        //  Subscribe to game events 
        this._bus.on('game:assetsReady', () => {
            this._startButton.disabled = false;
        });
        this._bus.on('game:started', () => {
            this._updateHUDVisibility();
            this._updateMobileControlsVisibility();
        });
        this._bus.on('game:stopped', () => {
            this.showMainMenu();
        });
        this._bus.on('game:paused', () => {
            this._show(this._pauseOverlay);
            this._updateMobileControlsVisibility();
        });
        this._bus.on('game:resumed', () => {
            this._hide(this._pauseOverlay);
            this._updateMobileControlsVisibility();
        });
        this._bus.on('game:roundEnd', () => {
            this.showGameOverOverlay();
        });
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
        // HUD visibility is now driven by game events; this shows/hides the pause button
        const menuVisible = this._menuScreen && !this._menuScreen.classList.contains('hidden');
        const settingsVisible = this._settingsScreen && !this._settingsScreen.classList.contains('hidden');
        const instructionsVisible = this._instructionsScreen && !this._instructionsScreen.classList.contains('hidden');
        const inOverlay = menuVisible || settingsVisible || instructionsVisible;

        if (inOverlay || this._isVisible(this._gameOverOverlay) || this._isVisible(this._pauseOverlay)) {
            this._hide(this._pauseButton);
        } else {
            this._show(this._pauseButton);
        }
    }

    _updateMobileControlsVisibility() {
        const mode = this._touchToggle?.value ?? 'auto';
        const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const wantShow = mode === 'on' || (mode === 'auto' && isTouch);
        const canShow = wantShow
            && !this._isVisible(this._menuScreen)
            && !this._isVisible(this._settingsScreen)
            && !this._isVisible(this._instructionsScreen)
            && !this._isVisible(this._pauseOverlay)
            && !this._isVisible(this._gameOverOverlay);

        canShow ? this._show(this._mobileControls) : this._hide(this._mobileControls);
    }
}
