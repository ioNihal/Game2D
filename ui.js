export default class UIManager {
    constructor(game) {
        this.game = game;

        // Screen elements
        this.menuScreen = document.getElementById('menuScreen');
        this.settingsScreen = document.getElementById('settingsScreen');
        this.instructionsScreen = document.getElementById('instructionsScreen');
        this.pauseOverlay = document.getElementById('pauseOverlay');
        this.mobileControls = document.getElementById('mobileControls');
        this.gameContainer = document.getElementById('gameContainer');

        // Buttons
        this.startButton = document.getElementById('startButton');
        this.settingsButton = document.getElementById('settingsButton');
        this.instructionsButton = document.getElementById('instructionsButton');
        this.settingsBackButton = document.getElementById('settingsBackButton');
        this.instructionsBackButton = document.getElementById('instructionsBackButton');
        this.resumeButton = document.getElementById('resumeButton');
        this.pauseSettingsButton = document.getElementById('pauseSettingsButton');
        this.quitButton = document.getElementById('quitButton');

        // Settings form elements
        this.masterVolumeRange = document.getElementById('masterVolumeRange');
        this.musicVolumeRange = document.getElementById('musicVolumeRange');
        this.sfxVolumeRange = document.getElementById('sfxVolumeRange');
        this.muteToggle = document.getElementById('muteToggle');
        this.touchToggle = document.getElementById('touchToggle');
        this.difficultySelect = document.getElementById('difficultySelect');

        // Mobile buttons
        this.btnLeft = document.getElementById('btnLeft');
        this.btnRight = document.getElementById('btnRight');
        this.btnJump = document.getElementById('btnJump');
        this.btnAttack = document.getElementById('btnAttack');
        this.btnBlock = document.getElementById('btnBlock');

        // to know from where settings opened!
        this._settingsParent = null;

        this._bindEvents();

        // Load settings from localStorage
        this._loadSettings();

        // Detect mobile and show controls if enabled
        this._updateMobileControlsVisibility();

        // Handle window resize
        window.addEventListener('resize', () => {
            this._updateMobileControlsVisibility();
        });
    }

    _bindEvents() {
        this.startButton.addEventListener('click', () => {
            this.hideAllScreens();
            this.game.startGame();
        });

        // Main menu -> Settings
        this.settingsButton.addEventListener('click', () => {
            if (!this.game.isRunning()) {
                this.showSettings('menu');
            }
        });
        this.instructionsButton.addEventListener('click', () => {
            if (!this.game.isRunning()) {
                this.showInstructions('menu');
            }
        });

        // Settings Back button
        this.settingsBackButton.addEventListener('click', () => {
            this.onSettingsBack();
        });

        // Instructions Back
        this.instructionsBackButton.addEventListener('click', () => {
            this.onInstructionsBack();
        });

        // PauseOverlay buttons
        this.resumeButton.addEventListener('click', () => {
            this.hidePauseOverlay();
            this.game.resumeGame();
        });
        // Pause -> Settings
        this.pauseSettingsButton.addEventListener('click', () => {
            // From pause overlay
            if (this.game.isRunning() && this.game.isPaused()) {
                this.showSettings('pause');
            }
        });
        this.quitButton.addEventListener('click', () => {
            // Quit to menu
            this.hidePauseOverlay();
            this.game.stopGame();
            this.showMainMenu();
        });

        // Settings changes
        // Master volume slider
        this.masterVolumeRange.addEventListener('input', () => {
            const vol = parseFloat(this.masterVolumeRange.value);
            this._applyMuteAndVolumes();
            this._saveSettings();
        });
        // Music volume slider
        this.musicVolumeRange.addEventListener('input', () => {
            const vol = parseFloat(this.musicVolumeRange.value);
            this._applyMuteAndVolumes();
            this._saveSettings();
        });
        // SFX volume slider
        this.sfxVolumeRange.addEventListener('input', () => {
            const vol = parseFloat(this.sfxVolumeRange.value);
            this._applyMuteAndVolumes();
            this._saveSettings();
        });
        // Mute toggle
        this.muteToggle.addEventListener('change', () => {
            this._applyMuteAndVolumes();
            this._saveSettings();
        });


        this.touchToggle.addEventListener('change', () => {
            this._saveSettings();
            this._updateMobileControlsVisibility();
        });
        this.difficultySelect.addEventListener('change', () => {
            this.game.setDifficulty(this.difficultySelect.value);
            this._saveSettings();
        });

        // using Esc key
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Escape') {
                // If settings is open, close settings
                if (this.isSettingsVisible()) {
                    this.onSettingsBack();
                    return;
                }
                // If instructions is open, close instructions
                if (this.isInstructionsVisible()) {
                    this.onInstructionsBack();
                    return;
                }
                // If game running and not paused: open pause overlay
                if (this.game.isRunning() && !this.game.isPaused()) {
                    this.showPauseOverlay();
                    this.game.pauseGame();
                }
                // If game running and paused: resume
                else if (this.game.isRunning() && this.game.isPaused()
                    && this.isPauseOverlayVisible()) {
                    this.hidePauseOverlay();
                    this.game.resumeGame();
                }
            }
        });

        // Mobile control events
        this._setupTouchButton(this.btnLeft, 'left');
        this._setupTouchButton(this.btnRight, 'right');
        this._setupTouchButton(this.btnJump, 'jump');
        this._setupTouchButton(this.btnAttack, 'attack');
        this._setupTouchButton(this.btnBlock, 'block');
    }


    isSettingsVisible() {
        return this.settingsScreen && !this.settingsScreen.classList.contains('hidden');
    }
    isInstructionsVisible() {
        return this.instructionsScreen && !this.instructionsScreen.classList.contains('hidden');
    }
    isPauseOverlayVisible() {
        return this.pauseOverlay && !this.pauseOverlay.classList.contains('hidden');
    }

    onSettingsBack() {
        if (this._settingsParent === 'menu') {
            this.hideSettings();
            this.showMainMenu();
        } else if (this._settingsParent === 'pause') {
            this.hideSettings();
            this.showPauseOverlay();
        }
        this._settingsParent = null;
    }
    onInstructionsBack() {
        if (this._instructionsParent === 'menu') {
            this.hideInstructions();
            this.showMainMenu();
        }
        this._instructionsParent = null;
    }

    showMainMenu() {
        this.hideAllScreens();
        if (this.menuScreen) this.menuScreen.classList.remove('hidden');
    }

    showSettings(parent) {
        this._settingsParent = parent;
        // opening from pause
        if (parent === 'pause' && this.game.isRunning() && !this.game.isPaused()) {
            this.game.pauseGame();
        }
        this.hideAllScreens();
        if (this.settingsScreen) this.settingsScreen.classList.remove('hidden');
    }
    hideSettings() {
        if (this.settingsScreen) this.settingsScreen.classList.add('hidden');
    }

    showInstructions(parent) {
        this._instructionsParent = parent;
        this.hideAllScreens();
        if (this.instructionsScreen) this.instructionsScreen.classList.remove('hidden');
    }
    hideInstructions() {
        if (this.instructionsScreen) this.instructionsScreen.classList.add('hidden');
    }

    showPauseOverlay() {
        if (this.pauseOverlay) this.pauseOverlay.classList.remove('hidden');
    }
    hidePauseOverlay() {
        if (this.pauseOverlay) this.pauseOverlay.classList.add('hidden');
    }

    _saveSettings() {
        const settings = {
            masterVolume: parseFloat(this.masterVolumeRange.value),
            musicVolume: parseFloat(this.musicVolumeRange.value),
            sfxVolume: parseFloat(this.sfxVolumeRange.value),
            muted: this.muteToggle.checked,
            touchToggle: this.touchToggle.value,
            difficulty: this.difficultySelect.value,
        };
        localStorage.setItem('stickmanSettings', JSON.stringify(settings));
    }
    _loadSettings() {
        const settings = JSON.parse(localStorage.getItem('stickmanSettings') || '{}');
        // Master volume
        if (settings.masterVolume != null) {
            this.masterVolumeRange.value = settings.masterVolume;
        } else {
            this.masterVolumeRange.value = 0.5;
        }
        // Music volume
        if (settings.musicVolume != null) {
            this.musicVolumeRange.value = settings.musicVolume;
        } else {
            this.musicVolumeRange.value = 0.5;
        }
        // SFX volume
        if (settings.sfxVolume != null) {
            this.sfxVolumeRange.value = settings.sfxVolume;
        } else {
            this.sfxVolumeRange.value = 0.5;
        }
        // Mute
        if (settings.muted != null) {
            this.muteToggle.checked = settings.muted;
        } else {
            this.muteToggle.checked = false;
        }

        this._applyMuteAndVolumes();

        if (settings.touchToggle) {
            this.touchToggle.value = settings.touchToggle;
        }
        if (settings.difficulty) {
            this.difficultySelect.value = settings.difficulty;
            this.game.setDifficulty(settings.difficulty);
        }
    }
    _updateMobileControlsVisibility() {
        const mode = this.touchToggle.value;
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        let show = false;
        if (mode === 'on') show = true;
        else if (mode === 'off') show = false;
        else if (mode === 'auto') show = isTouchDevice;

        // show control in game only
        if (show
            && this.game.isRunning()
            && !this.game.isPaused()
            && !this.isSettingsVisible()
            && !this.isInstructionsVisible()
            && !this.isPauseOverlayVisible()
        ) {
            this.mobileControls.classList.remove('hidden');
        } else {
            this.mobileControls.classList.add('hidden');
        }
    }

    _setupTouchButton(elem, action) {
        if (!elem) return;
        elem.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.game.onVirtualButtonDown(action);
        });
        elem.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.game.onVirtualButtonUp(action);
        });
        elem.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.game.onVirtualButtonDown(action);
        });
        elem.addEventListener('mouseup', (e) => {
            e.preventDefault();
            this.game.onVirtualButtonUp(action);
        });
        elem.addEventListener('mouseleave', (e) => {
            e.preventDefault();
            this.game.onVirtualButtonUp(action);
        });
    }

    _applyMuteAndVolumes() {
        const isMuted = this.muteToggle.checked;
        if (isMuted) {
            this.game.setMasterVolume(0);
        } else {
            const masterVol = parseFloat(this.masterVolumeRange.value);
            this.game.setMasterVolume(masterVol);

            const musicVol = parseFloat(this.musicVolumeRange.value);
            const sfxVol = parseFloat(this.sfxVolumeRange.value);
            this.game.setMusicVolume(musicVol);
            this.game.setSFXVolume(sfxVol);
        }
    }

    hideAllScreens() {
        [this.menuScreen, this.settingsScreen, this.instructionsScreen, this.pauseOverlay].forEach(el => {
            if (el) el.classList.add('hidden');
        });
    }
}
