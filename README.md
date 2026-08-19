# 🥋 Stickman Fighter

[![GitHub Stars](https://img.shields.io/github/stars/ioNihal/Game2D?style=social)](https://github.com/ioNihal/Game2D/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/ioNihal/Game2D?style=social)](https://github.com/ioNihal/Game2D/network/members)
[![GitHub Issues](https://img.shields.io/github/issues/ioNihal/Game2D)](https://github.com/ioNihal/Game2D/issues)
[![MIT License](https://img.shields.io/github/license/ioNihal/Game2D)](LICENSE)

A fast-paced, endless 1v1 stickman fighting game for web browsers. Responsive controls, smart AI, and mobile support. Built with vanilla JS (zero-build ES modules), HTML5 Canvas, and CSS.

## 🚀 Features

- ⚔️ Endless 1v1 battles across rounds (first to 2 wins takes the match)
- 🤖 Difficulty-aware AI (easy / normal / hard) with punish & combo behavior
- 🎵 Unified Web Audio pipeline (menu BGM, hover SFX, fight BGM, all SFX)
- 📱 Mobile touch controls with auto-detect / on / off modes
- 🎨 Simple stickman art
- 🔧 Debug mode via `?debug` (killswitch + hitbox overlay)

## 🖥️ Tech Stack

- **Language:** JavaScript (vanilla ES modules — no build step)
- **Frontend:** HTML5, CSS3
- **Canvas:** 2D rendering, DPR-aware

## 📁 Structure

```
ai/                 AIController — drives the enemy via a VirtualInput action buffer
configs/            Central configs: constants, assets manifest, per-character configs
core/               EventBus, state machine, Game facade, fixed-60Hz GameLoop
debug/              DebugControls — killswitch (L) + hitbox toggle (B), `?debug` only
entities/           Fighter FSM + hitboxes, reset across rounds via CharacterFactory
input/              InputHandler + single key→action map
render/             Renderer, HUD, overlays, floating text, animation controller
systems/            CombatSystem (hitboxes/damage) + MatchSystem (rounds/wins)
ui/                 UIManager (screens via EventBus), SettingsStore, MobileControls
utils/              AssetLoader, AudioManager (Web Audio, settings-reactive)
main.js             Composition root — wires SettingsStore → Audio → Game → UI
```

## 🕹️ Controls

- **Move:** Arrow keys / A, D
- **Jump:** W / Up arrow
- **Attack:** J (light), U (heavy), I (sweep)
- **Block:** K (hold)
- **Pause:** Esc
- **Mobile:** On-screen buttons

## 📦 Getting Started

1. Clone or download this repo
2. Serve the folder over HTTP (e.g. `python -m http.server`) and open it
3. Play!

> ES modules require an HTTP server — opening `index.html` directly from disk won't work.

## 🤝 Contributing

PRs welcome! Please open issues for bugs or suggestions.

---

Made with ❤️ for learning & Fun.