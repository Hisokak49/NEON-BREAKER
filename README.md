# NEON-BREAKER

**Shatter the grid. Own the night.**

A cyberpunk arcade brick-breaker built with vanilla HTML, CSS, and JavaScript. It runs entirely in the browser with no backend or build step.

## Features

- Progressive brick-breaker gameplay with levels and lives
- Score, combo, best-score, and end-of-game statistics
- Persistent high score and settings with localStorage
- Master and SFX volume controls
- Toggleable screen shake, particles, scanlines, ball trail, and edge glow
- Pause, retry, menu, and level-clear flows
- Browser-generated sound effects with the Web Audio API
- HTML5 Canvas rendering and responsive presentation

## Controls

| Action | Control |
| --- | --- |
| Move paddle | Mouse |
| Launch ball | Mouse click, Space, or Enter |
| Pause / resume | Escape |
| Open options | Options button |

## Run locally

No package manager or build process is required. Clone the repository and open `index.html` in a modern browser.

You can also use a local static server:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Project structure

```text
NEON-BREAKER/
├── index.html    # HUD, menus, controls, and game panels
├── style.css     # Cyberpunk visual system and responsive layout
├── script.js     # Game state, physics, rendering, audio, input, persistence
└── README.md     # Project documentation
```

## Technical highlights

The game uses a small state machine for menu, playing, paused, options, game-over, and victory states. Gameplay is rendered with HTML5 Canvas, while browser APIs provide audio, keyboard/mouse input, and local persistence.

The project intentionally avoids a framework or game engine so the core implementation demonstrates browser fundamentals including animation loops, collision handling, DOM events, canvas rendering, state management, and local storage.

## Persistence

Settings and the best score are stored locally in the browser. They remain on the same browser/device and are not uploaded to a server.

## Version

Current game UI version: **v1.2.0**
