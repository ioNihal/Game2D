import { CONFIG } from './configs/config.js';
import Renderer from './render/renderer.js';
import Game from './core/game.js';
import EventBus from './core/eventBus.js';
import InputHandler from './input/inputHandler.js';
import SettingsStore from './ui/settingsStore.js';
import AudioManager from './utils/audioManager.js';
import UIManager from './ui/uiManager.js';
import MobileControls from './ui/mobileControls.js';
import DebugControls from './debug/debugControls.js';

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
// Bootstrap — single entry point. Compose everything here, no `window.game`
// global; OrientationGuard closes over the game instance it needs.
//

window.addEventListener('load', () => {
    // SettingsStore → Audio → Assets → Game → UI
    const bus = new EventBus();
    const input = new InputHandler();
    const settingsStore = new SettingsStore({ eventBus: bus });
    const audio = new AudioManager({ settingsStore });

    const debug = CONFIG.debug ? new DebugControls({ bus }) : null;
    const game = new Game({ renderer, bus, audio, input, settingsStore, debug });

    // UI → Game wiring: UIManager emits ui:* events, Game reacts.
    bus.on('ui:startGame', () => game.startGame());
    bus.on('ui:pauseGame', () => game.pauseGame());
    bus.on('ui:resumeGame', () => game.resumeGame());
    bus.on('ui:quitToMenu', () => game.stopGame());
    bus.on('ui:rematch', () => game.rematch());

    new UIManager({ bus, audio, settingsStore });
    new MobileControls({ input });

    new OrientationGuard(game);
});

/**
 * OrientationGuard — shows the "rotate device" overlay in portrait and pauses
 * the running game. Closes over its Game reference; no global needed.
 */
class OrientationGuard {
    constructor(game) {
        this._game = game;
        this._overlay = document.getElementById('rotateOverlay');
        if (!this._overlay) return;
        this._pausedByRotate = false;

        ['load', 'resize', 'orientationchange'].forEach(e =>
            window.addEventListener(e, () => this._check())
        );
        document.addEventListener('DOMContentLoaded', () => this._check());
    }

    _check() {
        const portrait = window.matchMedia('(orientation: portrait)').matches;
        this._overlay.style.display = portrait ? 'flex' : 'none';

        if (portrait && this._game.isRunning() && !this._game.isPaused()) {
            this._game.pauseGame();
            this._pausedByRotate = true;
        } else if (!portrait && this._pausedByRotate) {
            this._game.resumeGame();
            this._pausedByRotate = false;
        }
    }
}