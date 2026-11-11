# AGENTS.md

FALESC is a zero-build, single-page isometric island city-builder: vanilla ES
modules, Pixi.js 7 (WebGL), DOM overlays for menus, and no backend. The entry
point is `index.html` → `src/App.js`. Dependencies are vendored under `vendor/`
and resolved through the import map, so the game runs offline with no install or
bundling step.

The game is currently styled as **FALESC: The Prism Tide** — a warm sunset
archipelago with coral/mint/cream UI, local Fraunces/Jost/Space Mono fonts, and a
lumen economy. Read [docs/design-vision.md](docs/design-vision.md) before making
visual changes; it is the guardrail against generic dark-dashboard styling.

## Start here

```bash
npm run dev          # static dev server, default http://127.0.0.1:5173/
npm run check        # syntax, local import resolution, import-map targets
```

Browser verification from this workspace (shared harness):

```bash
webgame_smoke                     # main menu → build → turn → end flow
webgame_smoke --scenario scripts/scenarios/victory.mjs
webgame_smoke --scenario scripts/scenarios/persistence.mjs
webgame_smoke --scenario scripts/scenarios/map-regression.mjs
webgame_smoke --scenario scripts/scenarios/engine-regression.mjs
webgame_smoke --scenario scripts/scenarios/determinism.mjs
```

The CLI equivalents are documented in [docs/testing.md](docs/testing.md). Run
`npm run check` and the main smoke test after any behavioural change.

## What lives where

| Path | Responsibility |
| --- | --- |
| `index.html` | Import map, local font preloads, illustrated Glass Sea backdrop |
| `styles/main.css` | Design tokens, scene, chrome, all screen/HUD styles |
| `assets/fonts/` | OFL woff2 fonts + licenses (no runtime CDN) |
| `src/App.js` | App bootstrap, Pixi layers, world generation, save/load, game loop, debug API |
| `src/GameStateManager.js`, `src/game/TurnScheduler.js` | `MENU → LOBBY → PLAYING → INTERSTITIAL → END`, economy state, cancellable turn timing |
| `src/screens/` | DOM screens (menu, lobby, HUD, interstitial, end) |
| `src/Camera.js`, `src/controls/InputManager.js` | Camera pan/zoom/tap, world clamp, key bindings |
| `src/map/` | Seeded single-pass island generation, packing, isometric grid math, island art |
| `src/buildings/blueprints.js` | Blueprint costs, yields, Beacon discount, victory structure |
| `src/buildings/` | Building model, lifecycle, placement manager, illustrated renderer |
| `src/character/`, `src/ai/` | Procedural character rendering, seeded palettes, land-aware NPCs |
| `src/minerals/` | Seeded rock/crystal scenery |
| `src/ui/` | Build dialog, blueprint icons, framed survey chart, ambient chatter |
| `src/persistence/` | Versioned localStorage saves (model data only) |
| `scripts/scenarios/` | Browser regressions for victory, persistence, maps, NPCs, determinism |
| `vendor/` | Pinned Pixi.js build and license (committed; no fetch at runtime) |
| `webgame.config.json` | Main browser smoke configuration and steps |

## Ground rules

- **Keep the zero-build architecture.** Do not add a bundler, framework, or
  runtime CDN imports without an explicit request. Native ES modules and the
  import map are the deployment model. There is no npm dependency at runtime.
- **Pixi is v7.** `new PIXI.Application(...)` and `app.view` are synchronous. A
  v8 upgrade requires changes in `App.js`/`Camera.js`; do not bump it casually.
- **Canvas is transparent.** The sunset sea is a DOM backdrop behind the Pixi
  canvas. Do not set an opaque renderer background without redesigning the scene.
- **Respect the simulation model.** Screens are DOM overlays; the world keeps
  rendering underneath. The game loop is driven by Pixi's ticker and only
  simulates NPCs/buildings while `PLAYING` and the document is visible.
- **Turns are state-driven.** Do not add `setTimeout` outside
  `TurnScheduler`/`GameStateManager`. End turn resolves buildings and income,
  then either continues or ends the charter.
- **Keep generated output out of git.** `.artifacts/`, `node_modules/`, logs and
  local env files are ignored. Scenarios are source; screenshots are not.
- **Test after changes.** `npm run check` catches broken imports and syntax; the
  smoke test catches the main flow. Scenario files cover the engine regressions.
- **Use the debug surface.** From the browser console:
  `window.__falesc.snapshot()`, `findFreeCell()`, `worldToScreen(x, y)`,
  `saveGame()`, `continueGame()`, `selectBlueprint(id)`. The full game object is
  `window.__falesc.app`.
- **Do not reintroduce dead sandbox UI.** `src/UI.js` and `lil-gui` were removed;
  the blueprint palette is the real build UI.

## Key conventions

- ES modules with explicit `.js` extensions in relative imports.
- Four-space indentation and semicolons, matching the existing source.
- DOM screens own their structure; shared visual language lives in
  `styles/main.css` with classes, not inline CSS. Tests rely on `data-testid`.
- World distances are in pixels; grid cells are `TILE_WIDTH × TILE_HEIGHT`
  (512 × 256); camera zoom is clamped to the generated world.
- One build per tide. A structure goes `PENDING → RESERVED → ACTIVE`; only
  `ACTIVE` structures generate income.
- Starting purse is 8 lumen; blueprints cost 3–12; each Lantern House reduces the
  Beacon price by 3 (floor 6). Do not change the economy without updating the
  victory scenario and [docs/gameplay.md](docs/gameplay.md).
- The main Pixi canvas is WebGL. The harness samples `#minimap` (2D) instead; do
  not remove the survey chart without adjusting `canvasSelectors` and the smoke
  test.
- Fonts are local and licensed. Add new fonts under `assets/fonts/` with their
  OFL license and an `@font-face` rule; never add a font CDN.

## Where to read more

- [docs/design-vision.md](docs/design-vision.md) — identity, palette, typography, UX guardrails
- [docs/architecture.md](docs/architecture.md) — detailed runtime and system design
- [docs/development.md](docs/development.md) — local setup, vendoring, common tasks
- [docs/testing.md](docs/testing.md) — checks, smoke test, scenarios, manual checklist
- [docs/gameplay.md](docs/gameplay.md) — controls, economy, tides, victory
- [docs/known-issues.md](docs/known-issues.md) — remaining limitations and risks

## Practical notes

- Node 18+ is required for `scripts/dev-server.mjs` and `scripts/check.mjs`.
- The dev server refuses to serve dotfiles (including `.git`) and never writes
  to the project.
- If `git add .gitignore` reports that the file is ignored, use
  `git add -f .gitignore`; a global gitignore may exclude the filename.
- Keep commit messages focused; this repo's history uses short imperative
  subjects. New tooling/docs commits use conventional prefixes (`chore:`,
  `feat:`, `fix:`, `docs:`).
