import InputHandler from "./controllers/input.js";
import AssetLoader from "./utils/assetLoader.js";
import { ANIMATION_CONFIG } from "./configs/animationConfig.js";
import Fighter from "./controllers/fighter.js";
import { CONFIG } from "./configs/config.js";
import { ATTACKS } from "./configs/attack.js";
import AIController from "./controllers/ai.js";
import UIManager from "./ui.js";
import AudioManager from "./utils/audioManager.js";

(function () {
  const overlay = document.getElementById('rotateOverlay');
  if (!overlay) return;

  // Track if we paused due to rotate, if you want to auto-pause/resume:
  let pausedByRotate = false;

  function checkOrientation() {
    const isPortrait = window.matchMedia("(orientation: portrait)").matches;
    if (isPortrait) {
      overlay.style.display = 'flex';
      if (window.game && game.isRunning && game.isRunning() && !game.isPaused()) {
        game.pauseGame();
        pausedByRotate = true;
      }
    } else {
      overlay.style.display = 'none';
      if (window.game && pausedByRotate) {
        game.resumeGame();
        pausedByRotate = false;
      }
    }
  }
  window.addEventListener('load', checkOrientation);
  window.addEventListener('resize', checkOrientation);
  window.addEventListener('orientationchange', checkOrientation);
  document.addEventListener('DOMContentLoaded', checkOrientation);
})();

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = CONFIG.canvasWidth;
    this.canvas.height = CONFIG.canvasHeight;

    // Input and virtual inputs
    this.input = new InputHandler();
    this.virtualInputs = {}; //for mobiles!!

    // Asset loader
    this.assetLoader = new AssetLoader();
    this.audioManager = new AudioManager();
    this.ui = new UIManager(this);

    // Game state flags
    this._running = false;
    this._paused = false;
    this.gameOver = false;
    this.winner = null;


    this._gameLoop = this._gameLoop.bind(this);

    // Preload assets, then show menu
    this._preloadAssets();
    this._preloadAudio();
  }

  async _preloadAudio() {
    const audioList = [
      { key: 'bgm_fight', urls: ['assets/sfx/bgm/bgm_fight.mp3', 'assets/sfx/bgm/bgm_fight.ogg'] },
      { key: 'jump', urls: ['assets/sfx/jump/sfx_jump.mp3', 'assets/sfx/jump/sfx_jump.ogg'] },
      { key: 'punch', urls: ['assets/sfx/punch/sfx_punch.mp3', 'assets/sfx/punch/sfx_punch.ogg'] },
      { key: 'hit', urls: ['assets/sfx/hit/sfx_hit.mp3', 'assets/sfx/hit/sfx_hit.ogg'] },
      { key: 'block', urls: ['assets/sfx/block/sfx_block.mp3', 'assets/sfx/block/sfx_block.ogg'] },
      { key: 'ko', urls: ['assets/sfx/ko/sfx_ko.mp3', 'assets/sfx/ko/sfx_ko.ogg'] },
    ];
    try {
      await this.audioManager.loadAudioList(audioList);

    } catch (err) {
      console.error('Audio preload error:', err);
    }
  }


  _preloadAssets() {
    // Build image lists
    const buildImageListForCharacter = (charKey) => {
      const list = [];
      const anims = ANIMATION_CONFIG[charKey];
      for (const [animKey, cfg] of Object.entries(anims)) {
        for (let i = 1; i <= cfg.frameCount; i++) {
          const key = `${charKey}_${animKey}${i}`;
          const url = `${cfg.path}${i}${cfg.extension}`;
          list.push({ key, url });
        }
      }
      return list;
    };
    const playerImageList = buildImageListForCharacter('player');
    const enemyImageList = buildImageListForCharacter('enemy');
    const allImageList = [...playerImageList, ...enemyImageList];

    // Start loading
    this.assetLoader.loadImages(allImageList)
      .then(() => {
        // console.log('Images Loaded');
      })
      .catch(err => console.error("Asset load error:", err));
  }


  startGame() {
    if (this._running) {
      return;
    }
    // Reset or initialize game objects
    this._initGameObjects();
    


    this._running = true;
    this._paused = false;
    this.gameOver = false;
    this.winner = null;

    this.audioManager.resumeContext().then(() => {
      this.audioManager.playMusic('bgm_fight', { volume: 0.5, loop: true });
    });

    


    // Start the loop
    this._lastTimestamp = null;
    this._rafId = requestAnimationFrame(this._gameLoop);
  }

  stopGame() {
    this._running = false;
    this._paused = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  pauseGame() {
    if (this._running) {
      this._paused = true;
    }
  }
  resumeGame() {
    if (this._running && this._paused) {
      this._paused = false;
      this._lastTimestamp = null; // reset timestamp so no large delta
    }
  }
  isRunning() {
    return this._running;
  }
  isPaused() {
    return this._paused;
  }

  setMasterVolume(val) {
    if (this.audioManager) this.audioManager.setMasterVolume(val);
  }
  setMusicVolume(val) {
    if (this.audioManager) this.audioManager.setMusicVolume(val);
  }
  setSFXVolume(val) {
    if (this.audioManager) this.audioManager.setSFXVolume(val);
  }


  setDifficulty(val) {
    // console.log('Setting difficulty to', val);
    if (this.enemyAI) {
      switch (val) {
        case 'easy':
          this.enemyAI.preferredRange = 100;
          this.enemyAI.blockProbability = 0.3;
          this.enemyAI.retreatProbability = 0.02;
          this.enemyAI.jumpProbability = 0.01;
          break;
        case 'normal':
          this.enemyAI.preferredRange = 80;
          this.enemyAI.blockProbability = 0.5;
          this.enemyAI.retreatProbability = 0.01;
          this.enemyAI.jumpProbability = 0.005;
          break;
        case 'hard':
          this.enemyAI.preferredRange = 60;
          this.enemyAI.blockProbability = 0.7;
          this.enemyAI.retreatProbability = 0.005;
          this.enemyAI.jumpProbability = 0.01;
          break;
      }
    }
  }

  onVirtualButtonDown(action) {
    // Map virtual action names to input keys in InputHandler
    switch (action) {
      case 'left':
        this.input.setVirtualKeyDown('ArrowLeft');
        break;
      case 'right':
        this.input.setVirtualKeyDown('ArrowRight');
        break;
      case 'jump':
        this.input.setVirtualKeyDown('ArrowUp');
        break;
      case 'attack':
        this.input.setVirtualKeyDown('KeyJ');
        break;
      case 'block':
        this.input.setVirtualKeyDown('KeyK');
        break;
    }
  }
  onVirtualButtonUp(action) {
    switch (action) {
      case 'left':
        this.input.setVirtualKeyUp('ArrowLeft');
        break;
      case 'right':
        this.input.setVirtualKeyUp('ArrowRight');
        break;
      case 'jump':
        this.input.setVirtualKeyUp('ArrowUp');
        break;
      case 'attack':
        this.input.setVirtualKeyUp('KeyJ');
        break;
      case 'block':
        this.input.setVirtualKeyUp('KeyK');
        break;
    }
  }

  _initGameObjects() {
    const buildAnimationsConfig = (charKey) => {
      const anims = ANIMATION_CONFIG[charKey];
      const animationsConfig = {};
      for (const [animKey, cfg] of Object.entries(anims)) {
        const imageKeys = [];
        for (let i = 1; i <= cfg.frameCount; i++) {
          imageKeys.push(`${charKey}_${animKey}${i}`);
        }
        animationsConfig[animKey] = {
          frameCount: cfg.frameCount,
          frameDuration: cfg.frameDuration,
          loop: cfg.loop,
          imageKeys,
        };
      }
      return animationsConfig;
    };

    // Create fighters
    const playerAnimations = buildAnimationsConfig('player');
    const enemyAnimations = buildAnimationsConfig('enemy');

    // Adjust starting positions as needed
    this.player = new Fighter({
      name: 'Player',
      charKey: 'player',
      x: 100,
      y: CONFIG.groundY - 280,
      width: 250,
      height: 280,
      attacks: ATTACKS,
      maxHealth: 100,
      assetLoader: this.assetLoader,
      audioManager: this.audioManager,
      animationsConfig: playerAnimations
    });
    this.enemy = new Fighter({
      name: 'Enemy',
      charKey: 'enemy',
      x: CONFIG.canvasWidth - 100 - 250, //i used a bad image with big paddings, and i am lazy
      y: CONFIG.groundY - 280,
      width: 250,
      height: 280,
      attacks: ATTACKS,
      maxHealth: 100,
      assetLoader: this.assetLoader,
      audioManager: this.audioManager,
      animationsConfig: enemyAnimations
    });

    // AI controller
    this.enemyAI = new AIController(this.enemy, this.player, {
      preferredRange: 80,
      blockProbability: 0.5,
      retreatProbability: 0.01,
      jumpProbability: 0.005,
    });

    // Hitboxes array
    this.hitboxes = [];

    // projectiles and floatingTexts
    this.projectiles = [];
    this.floatingTexts = [];

    // Reset gameOver/winner
    this.gameOver = false;
    this.winner = null;
  }

  _gameLoop(timestamp) {
    if (!this._running) return; // stop the loop if game is stopped
    if (this._paused) {
      this._draw();
      this._rafId = requestAnimationFrame(this._gameLoop);
      return;
    }

    // Update fighters and hitboxes
    if (!this.gameOver) {
      this.player.update(this.input);
      this.enemyAI.update();
      this.enemy.update();

      // Handle pending hitboxes from fighters
      if (this.player.pendingHitbox) {
        this.hitboxes.push(this.player.pendingHitbox);
        this.player.pendingHitbox = null;
      }
      if (this.enemy.pendingHitbox) {
        this.hitboxes.push(this.enemy.pendingHitbox);
        this.enemy.pendingHitbox = null;
      }
      // Update hitboxes
      this._updateHitboxes();
    }

    // Draw everything
    this._draw();

    // Check game over
    if (!this.gameOver) {
      this._checkGameOver();
    }

    // Handle restart if gameOver
    if (this.gameOver) {
      if (this.input.isKeyJustPressed('KeyR')) {
        this._resetRound();
      }
    }

    // Update input
    this.input.update();

    // Loop
    this._rafId = requestAnimationFrame(this._gameLoop);
  }

  _updateHitboxes() {
    for (let i = this.hitboxes.length - 1; i >= 0; i--) {
      const hb = this.hitboxes[i];
      hb.update();
      [this.player, this.enemy].forEach(target => {
        if (hb.checkCollision(target)) {
          const direction = hb.owner.facingRight ? 1 : -1;
          target.takeHit(hb.damage, hb.knockbackX * direction, hb.knockbackY);
          hb.markHit(target);
        }
      });
      if (hb.isExpired()) {
        this.hitboxes.splice(i, 1);
      }
    }
  }

  _draw() {
    // Clear
    this.ctx.fillStyle = '#444';
    this.ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);

    // Draw ground
    this.ctx.fillStyle = '#CCC';
    this.ctx.fillRect(0, CONFIG.groundY, CONFIG.canvasWidth, CONFIG.canvasHeight - CONFIG.groundY);

    // Draw fighters
    this.player.draw(this.ctx);
    this.enemy.draw(this.ctx);

    // // Draw hitboxes debug if desired
    // for (const hb of this.hitboxes) {
    //   hb.drawDebug(this.ctx);
    // }

    // Draw UI: health bars etc.
    this._drawUI();
    this.ctx.fillStyle = '#111';
    this.ctx.fillRect(0, CONFIG.groundY, this.player.width - 130, 100);
    this.ctx.fillRect(CONFIG.canvasWidth - this.player.width + 150, CONFIG.groundY, this.player.width - 130, 100);

    // If gameOver, overlay Game Over text
    if (this.gameOver) {
      this._drawGameOver();
    }
  }

  _drawUI() {
    const barWidth = 200;
    const barHeight = 20;
    const padding = 20;
    // Player bar
    this._drawHealthBar(
      padding,
      padding,
      barWidth,
      barHeight,
      this.player.health,
      this.player.maxHealth,
      '#0f0'
    );
    // Enemy bar
    this._drawHealthBar(
      CONFIG.canvasWidth - barWidth - padding,
      padding,
      barWidth,
      barHeight,
      this.enemy.health,
      this.enemy.maxHealth,
      '#f00'
    );
    // Text labels
    this.ctx.fillStyle = 'white';
    this.ctx.font = '14px sans-serif';
    this.ctx.fillText('You', padding, padding + barHeight + 20);
    this.ctx.fillText('Enemy', CONFIG.canvasWidth - barWidth - padding, padding + barHeight + 20);
  }

  _drawHealthBar(x, y, width, height, currentHealth, maxHealth, fillColor) {
    this.ctx.fillStyle = '#555';
    this.ctx.fillRect(x, y, width, height);
    const percent = Math.max(0, currentHealth) / maxHealth;
    const barWidth = width * percent;
    this.ctx.fillStyle = fillColor;
    this.ctx.fillRect(x, y, barWidth, height);
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, width, height);
  }

  _drawGameOver() {
    const text = this.winner === 'player' ? 'You Win!' : 'Game Over';
    this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
    this.ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
    this.ctx.fillStyle = 'white';
    this.ctx.textAlign = 'center';
    this.ctx.font = '48px sans-serif';
    this.ctx.fillText(text, CONFIG.canvasWidth / 2, CONFIG.canvasHeight / 2);
    this.ctx.font = '24px sans-serif';
    this.ctx.fillText('Press R to Restart', CONFIG.canvasWidth / 2, CONFIG.canvasHeight / 2 + 40);
    this.ctx.textAlign = 'start';
  }

  _checkGameOver() {
    if (this.player.state === 'ko') {
      setTimeout(() => {
        this.gameOver = true;
        this.winner = 'enemy';
      }, 3000)
    } else if (this.enemy.state === 'ko') {
      setTimeout(() => {
        this.gameOver = true;
        this.winner = 'player';
      }, 3000);
    }
  }

  _resetRound() {
    this.gameOver = false;
    this.winner = null;

    // Reset health and states
    this.player.health = this.player.maxHealth;
    this.enemy.health = this.enemy.maxHealth;
    this.player.x = 100;
    this.player.y = CONFIG.groundY - this.player.height;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.enterState('idle');

    this.enemy.x = CONFIG.canvasWidth - 100 - this.enemy.width;
    this.enemy.y = CONFIG.groundY - this.enemy.height;
    this.enemy.vx = 0;
    this.enemy.vy = 0;
    this.enemy.enterState('idle');

    this.hitboxes.length = 0;
  }
}

// On window load, instantiate Game
window.addEventListener('load', () => {
  const game = new Game();
});
