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
        this.volumeRange = document.getElementById('volumeRange');
        this.touchToggle = document.getElementById('touchToggle');
        this.difficultySelect = document.getElementById('difficultySelect');

        // Mobile buttons
        this.btnLeft = document.getElementById('btnLeft');
        this.btnRight = document.getElementById('btnRight');
        this.btnJump = document.getElementById('btnJump');
        this.btnAttack = document.getElementById('btnAttack');
        this.btnBlock = document.getElementById('btnBlock');

        // Track from where settings was opened: 'menu' or 'pause'
        this._settingsParent = null;

        // Bind events
        this._bindEvents();

        // Load settings from localStorage
        this._loadSettings();

        // Detect mobile and show controls if enabled
        this._updateMobileControlsVisibility();

        // Handle window resize if needed for responsive layout
        window.addEventListener('resize', () => {
            this._updateMobileControlsVisibility();
        });
    }

    _bindEvents() {
        // Start game from main menu
        this.startButton.addEventListener('click', () => {
            this.hideAllScreens();
            this.game.startGame();
        });

        // Main menu -> Settings
        this.settingsButton.addEventListener('click', () => {
            // Only from menu (game not running) or from pause? This is main menu button.
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
        this.volumeRange.addEventListener('input', () => {
            const vol = parseFloat(this.volumeRange.value);
            this.game.setVolume(vol);
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

        // Pause via Escape key and Escape in settings
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
                // If in main menu, Escape does nothing or could close menu?
            }
        });

        // Mobile control events
        this._setupTouchButton(this.btnLeft, 'left');
        this._setupTouchButton(this.btnRight, 'right');
        this._setupTouchButton(this.btnJump, 'jump');
        this._setupTouchButton(this.btnAttack, 'attack');
        this._setupTouchButton(this.btnBlock, 'block');
    }

    // Helper to detect visibility
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
        // Return from settings to parent screen
        if (this._settingsParent === 'menu') {
            // Came from main menu: hide settings, show main menu
            this.hideSettings();
            this.showMainMenu();
        } else if (this._settingsParent === 'pause') {
            // Came from pause overlay: hide settings, show pause overlay, remain paused
            this.hideSettings();
            this.showPauseOverlay();
            // game remains paused; resume only when user clicks Resume
        }
        this._settingsParent = null;
    }
    onInstructionsBack() {
        // Similar logic for instructions: track parent if needed; here likely always menu
        if (this._instructionsParent === 'menu') {
            this.hideInstructions();
            this.showMainMenu();
        }
        // Could handle if instructions from pause, but less common
        this._instructionsParent = null;
    }

    showMainMenu() {
        this.hideAllScreens();
        if (this.menuScreen) this.menuScreen.classList.remove('hidden');
    }

    showSettings(parent) {
        // parent is 'menu' or 'pause'
        this._settingsParent = parent;
        // If opening from pause, ensure game is paused
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
        // Only if game is running
        if (this.pauseOverlay) this.pauseOverlay.classList.remove('hidden');
    }
    hidePauseOverlay() {
        if (this.pauseOverlay) this.pauseOverlay.classList.add('hidden');
    }

    _saveSettings() {
        const settings = {
            volume: parseFloat(this.volumeRange.value),
            touchToggle: this.touchToggle.value,
            difficulty: this.difficultySelect.value,
        };
        localStorage.setItem('stickmanSettings', JSON.stringify(settings));
    }
    _loadSettings() {
        const settings = JSON.parse(localStorage.getItem('stickmanSettings') || '{}');
        if (settings.volume != null) {
            this.volumeRange.value = settings.volume;
            this.game.setVolume(settings.volume);
        } else {
            this.volumeRange.value = 0.5;
            this.game.setVolume(0.5);
        }
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

        // Only show controls during active gameplay (not in menus or pause/settings)
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

    hideAllScreens() {
        [this.menuScreen, this.settingsScreen, this.instructionsScreen, this.pauseOverlay].forEach(el => {
            if (el) el.classList.add('hidden');
        });
    }
}
