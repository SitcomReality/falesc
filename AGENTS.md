# AGENTS.md

FALESC is a zero-build, single-page isometric city-builder prototype: vanilla ES
modules, Pixi.js 7 (WebGL), DOM overlays for menus, and no backend. The entry
point is `index.html` → `src/App.js`. Dependencies are vendored under `vendor/`
and resolved through the import map, so the game runs offline with no install or
bundling step.

## Start here

```bash
npm run dev          # static dev server, default http://127.0.0.1:5173/
npm run check        # syntax, local import resolution, import-map targets
```

Browser verification from this workspace (shared harness):

```bash
node ../webgame-tools/bin/webgame-harness.mjs smoke
```

Read [docs/testing.md](docs/testing.md) for the smoke coverage and manual
checklist. Run `npm run check` and the smoke test after any behavioural change.

## What lives where

| Path | Responsibility |
| --- | --- |
| `src/App.js` | App bootstrap, Pixi layers, world generation, game loop, debug API |
| `src/GameStateManager.js` | `MENU → LOBBY → PLAYING → INTERSTITIAL → END` state machine |
| `src/screens/` | DOM screens (menu, lobby, HUD, interstitial, end) |
| `src/Camera.js`, `src/controls/InputManager.js` | Camera pan/zoom/tap and key bindings |
| `src/map/` | Seeded island generation, isometric grid math, sector graphics |
| `src/buildings/` | Building model, placement manager, isometric renderer |
| `src/character/`, `src/ai/` | Procedural character rendering and ambient NPCs |
| `src/minerals/` | Static rock/crystal scenery |
| `src/ui/BuildModal.js`, `src/ui/Minimap.js` | Build prompt and 2D minimap |
| `scripts/` | Dev server and project-local static checks |
| `vendor/` | Pinned Pixi.js and lil-gui builds (committed; do not fetch at runtime) |
| `webgame.config.json` | Browser smoke test configuration and steps |

## Ground rules

- **Keep the zero-build architecture.** Do not add a bundler, framework, or
  runtime CDN imports without an explicit request. Native ES modules and the
  import map are the deployment model.
- **Pixi is v7.** `new PIXI.Application(...)` and `app.view` are synchronous. A
  v8 upgrade requires changes in `App.js`/`Camera.js`; do not bump it casually.
- **Respect the simulation model.** Screens are DOM overlays; the world keeps
  rendering underneath. The game loop is driven by Pixi's ticker.
- **Test after changes.** `npm run check` catches broken imports and syntax; the
  smoke test catches the main flow. Add a step for new user-visible behaviour.
- **Keep generated output out of git.** `.artifacts/`, `node_modules/`, logs and
  local env files are ignored. Commit visual baselines only if visual regression
  is deliberately enabled (it currently is not).
- **Use the debug surface.** From the browser console:
  `window.__falesc.snapshot()`, `window.__falesc.findFreeCell()`,
  `window.__falesc.worldToScreen(x, y)`. The full game object is
  `window.__falesc.app`.
- **Do not opportunistically fix large issues.** Map packing, NPC navigation,
  persistence, and the turn/timer architecture are documented in
  [docs/known-issues.md](docs/known-issues.md); changing them needs a plan and
  tests, not a drive-by patch.

## Key conventions

- ES modules with explicit `.js` extensions in relative imports.
- Four-space indentation and semicolons, matching the existing source.
- DOM screens own their styles inline; Pixi objects own world rendering.
- World distances are in pixels; grid cells are `TILE_WIDTH × TILE_HEIGHT`
  (512 × 256); camera zoom is `0.2–4`.
- Build actions: `actionsRemaining` is one per turn; a building goes
  `PENDING → RESERVED → ACTIVE` over two interstitials.
- The main Pixi canvas is WebGL. The harness samples `#minimap` (2D) instead;
  do not remove the minimap without adjusting `canvasSelectors` and the smoke
  test.

## Where to read more

- [docs/architecture.md](docs/architecture.md) — detailed runtime and system design
- [docs/development.md](docs/development.md) — local setup, vendoring, common tasks
- [docs/testing.md](docs/testing.md) — checks, smoke test, manual playtest checklist
- [docs/gameplay.md](docs/gameplay.md) — controls and turn/building rules
- [docs/known-issues.md](docs/known-issues.md) — known limitations and risks

## Practical notes

- Node 18+ is required for `scripts/dev-server.mjs` and `scripts/check.mjs`.
- The dev server refuses to serve dotfiles (including `.git`) and never writes
  to the project.
- If `git add .gitignore` reports that the file is ignored, use
  `git add -f .gitignore`; a global gitignore may exclude the filename.
- Keep commit messages focused; this repo's history uses short imperative
  subjects, often with a `vNNN:` prefix from the original prototype workflow.
  New tooling/docs commits use conventional prefixes (`chore:`, `feat:`,
  `fix:`, `docs:`).
