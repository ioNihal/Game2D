export default class UIManager {
    constructor(game) {
        this.game = game;

        // Screen
        this.menuScreen = document.getElementById('menuScreen');
        this.settingsScreen = document.getElementById('settingsScreen');
        this.instructionsScreen = document.getElementById('instructionsScreen');
        this.pauseOverlay = document.getElementById('pauseOverlay');
        this.mobileControls = document.getElementById('mobileControls');
        this.gameContainer = document.getElementById('gameContainer');

        //Buttons
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
        this.startButton.addEventListener('click', () => {
            this.showGameScreen();
            this.game.startGame();
        });

        this.settingsButton.addEventListener('click', () => this.showSettings());
        this.instructionsButton.addEventListener('click', () => this.showInstructions());
        this.settingsBackButton.addEventListener('click', () => this.showMenu());
        this.instructionsBackButton.addEventListener('click', () => this.showMenu());

        this.resumeButton.addEventListener('click', () => {
            this.hidePause();
            this.game.resumeButton();
        });

        this.pauseSettingsButton.addEventListener('click', () => {
            this.showSettings(true);
        });

        this.quitButton.addEventListener('click', () => {
            this.hidePause();
            this.showMenu();
            this.game.stopGame();
        });

        // settings change
        this.volumeRange.addEventListener('input', () => {
            const vol = parseFloat(this.volumeRange.value);
            this.game.setVolume(vol);
            this._saveSettings();
        });

        this.touchToggle.addEventListener('change', () => {
            this.game.setDifficulty(this._bindEvents.difficultySelect.value);
            this._saveSettings();
        });


        // pause via keyboard (escape btn)
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Escape') {
                if (this.game.isRunning() && !this.game.isPaused()) {
                    this.showPause();
                    this.game.pauseGame();
                } else if (this.game.isRunning() && this.game.isPaused()) {
                    this.hidePause();
                    this.game.resumeGame();
                }
            }
        });


        // Mobile cntrl events
        this._setupTouchButton(this.btnLeft, 'left');
        this._setupTouchButton(this.btnRight, 'right');
        this._setupTouchButton(this.btnJump, 'jump');
        this._setupTouchButton(this.btnAttack, 'attack');
        this._setupTouchButton(this.btnBlock, 'block');
    }

    _setupTouchButton(elem, action) {
        elem.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.game.onVirtualButtonDown(action);
        });
        elem.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.game.onVirtualButtonUp(action);
        });

        // For testing on desktop
        elem.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.game.onVirtualButtonDown(action);
        });
        elem.addEventListener('mouseup', (e) => {
            e.preventDefault();
            this.game.onVirtualButtonUp(action);
        });

        // If pointer leaves button while pressed
        elem.addEventListener('mouseleave', (e) => {
            e.preventDefault();
            this.game.onVirtualButtonUp(action);
        });

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

    _saveSettings() {
        const settings = {
            volume: parseFloat(this.volumeRange.value),
            touchToggle: this.touchToggle.value,
            difficulty: this.difficultySelect.value,
        };
        localStorage.setItem('stickmanSettings', JSON.stringify(settings));
    }

    _updateMobileControlsVisibility() {
        const mode = this.touchToggle.value;
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        let show = false;
        if (mode === 'on') show = true;
        else if (mode === 'off') show = false;
        else if (mode === 'auto') show = isTouchDevice;
        if (show) {
            this.mobileControls.classList.remove('hidden');
        } else {
            this.mobileControls.classList.add('hidden');
        }
    }

    showMenu() {
        this._hideAllScreens();
        this.menuScreen.classList.remove('hidden');
    }

    showSettings(fromPause = false) {
        this._hideAllScreens();
    }

    showPause() {
        this.pauseOverlay.classList.remove('hidden');
    }

    hidePause() {
        this.pauseOverlay.classList.add('hidden');
    }

    _hideAllScreens() {
        [this.menuScreen, this.settingsScreen, this.instructionsScreen, this.pauseOverlay].forEach(el => {
            el.classList.add('hidden');
        });
    }
}