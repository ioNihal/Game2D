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
// Bootstrap — compose all dependencies, no `window.game` global
//

window.addEventListener('load', () => {
    const bus = new EventBus();
    const input = new InputHandler();
    const settingsStore = new SettingsStore({ eventBus: bus });
    const audio = new AudioManager({ settingsStore });

    const game = new Game({ renderer, bus, audio, input, settingsStore });
    window.game = game;

    new UIManager({ bus, audio, settingsStore });
    new MobileControls({ input, settingsStore });

    if (CONFIG.debug) {
        const debug = new DebugControls({ input, bus });
        window._debug = debug;
    }
});
