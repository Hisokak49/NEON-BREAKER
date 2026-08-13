# Contributing to NEON-BREAKER

Thanks for your interest in improving NEON-BREAKER.

## Getting started

NEON-BREAKER is a vanilla HTML/CSS/JavaScript browser game. There is no package manager or build step required.

1. Fork the repository.
2. Clone your fork.
3. Open `index.html` directly, or run a local static server:

   ```bash
   python -m http.server 8000
   ```

4. Open `http://localhost:8000` in a modern browser.

## Before opening a pull request

- Keep the project dependency-free unless a dependency has a clear benefit.
- Test gameplay in a current desktop browser.
- Check mouse controls, keyboard controls, pause/resume, options, level transitions, and game-over/victory flows when your change touches them.
- Verify that settings and high scores still persist correctly in `localStorage`.
- Keep the cyberpunk visual style consistent with the existing UI.
- Avoid unrelated formatting or refactoring in the same change.

## Pull requests

Please include:

- A short description of the problem or feature.
- What changed and why.
- How you tested the change.
- Screenshots or a short recording for visual/gameplay changes when useful.

Small, focused pull requests are easier to review and merge.

## Bug reports

When reporting a bug, include the browser, operating system, steps to reproduce, expected behavior, and actual behavior. If possible, include a screenshot or console error.
