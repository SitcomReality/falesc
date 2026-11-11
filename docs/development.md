# Development guide

This is the practical handbook for working on FALESC. For the system design see
[architecture.md](architecture.md); for testing see [testing.md](testing.md).

## 1. Requirements

- **Node.js 18+** — used only for the dev server and project checks. The game
  itself runs in any modern browser with WebGL.
- **A modern browser** — Chrome, Firefox, or Safari with ES modules, import
  maps, and WebGL enabled.
- **No install step.** The runtime dependencies are committed under `vendor/`.

The game will not run correctly from a `file://` URL because browsers block ES
module imports from the filesystem. Use the dev server.

## 2. Running locally

```bash
npm run dev
# FALESC dev server
#   Local: http://127.0.0.1:5173/
```

The server is `scripts/dev-server.mjs`, a zero-dependency Node static server.

| Option | Default | Behaviour |
| --- | --- | --- |
| `--port <n>` | `5173` (or `PORT`) | First port to try. If busy, the next ports are tried unless strict. |
| `--host <host>` | `127.0.0.1` (or `HOST`) | Bind address. Use `0.0.0.0` to test from another device. |
| `--strict-port` | off | Fail if the requested port is unavailable instead of picking another. |

It sets `Cache-Control: no-store`, correct MIME types for JS/HTML/SVG/fonts,
refuses dotfiles and path traversal, supports `HEAD`, and never writes into the
project. `npm start` is an alias for `npm run dev`.

There is no hot reload. Edit a file and refresh the browser; the static server
always serves the current bytes.

## 3. Checks

```bash
npm run check
```

`scripts/check.mjs` verifies:

- every first-party `.js`/`.mjs` file parses as an ES module (`node --check`);
- relative imports resolve to a real file;
- the import map targets in `index.html` exist locally;
- first-party source does not contain remote runtime URLs (a warning, not an
  error, so temporary debugging URLs are visible).

When the shared browser harness is available, also run its static check:

```bash
node ../webgame-tools/bin/webgame-harness.mjs check
```

It additionally checks asset references and readiness hooks, and writes
`.artifacts/webgame/check.json`. The two checks are complementary; do not
remove `npm run check` because the harness has its own.

## 4. Dependencies and vendoring

The game has exactly one runtime dependency:

| Specifier | Vendored file | Version |
| --- | --- | --- |
| `pixi.js` | `vendor/pixi.min.mjs` | 7.3.3 |

`index.html` maps it:

```json
{
  "imports": {
    "pixi.js": "./vendor/pixi.min.mjs"
  }
}
```

Fonts are not npm dependencies. `assets/fonts/` contains the OFL-licensed
Fraunces, Jost, and Space Mono woff2 files plus their license texts; they are
loaded by `styles/main.css`. Add a new font there with its license, never from a
CDN.

Do **not** switch the import map back to a CDN. Runtime network access breaks
offline development and fails the harness's `noExternalRequests` check.

### Upgrading a vendored dependency

1. Download the new npm ESM build from jsDelivr (or unpack the npm tarball).
2. For Pixi, remove the trailing `//# sourceMappingURL=...` comment because the
   map is not vendored.
3. Replace the file, update `vendor/README.md` (version, source, notes).
4. Run `npm run check` and the browser smoke test.
5. For a Pixi major version, update `src/world/World.js` and `src/Camera.js`
   for the new application/canvas API before anything else.

The old `src/UI.js` sandbox controller and `lil-gui` were removed during the
engine/design work. The service dock in the HUD is the real build UI; do not
reintroduce a hidden debug GUI without a test and a design reason.

## 5. Code conventions

- Vanilla ES modules; explicit `.js` extensions on relative imports.
- Four-space indentation and semicolons, matching the existing code.
- One system per class/module under `src/<area>/`; no framework or state
  library.
- DOM UI structure is created in screen/modal classes; the shared visual
  language lives in `styles/main.css` (tokens, scene, chrome, screens). Prefer
  classes over inline styles. `data-testid` hooks are the test contract.
- Pixi objects handle world rendering. The main canvas is transparent over the
  illustrated DOM backdrop; keep it that way.
- Keep `window.__falesc` and `window.__APP_READY__` stable; the browser test
  depends on them.
- Read [design-vision.md](design-vision.md) before changing colours, type,
  spacing, or screen layout. In particular: no navy/gold default, no external
  fonts, no generic glass cards.
- Economy and program tuning live in `src/design/balance.js` and
  `src/design/programs.js`; needs and traits live beside them. The day loop is
  ticker-driven (`FalescGame.update()`); do not add gameplay `setTimeout` or
  `setInterval` calls.
- World units are pixels. Grid constants live in `src/constants.js`
  (`TILE_WIDTH = 512`, `TILE_HEIGHT = 256`).
- Prefer small, focused changes. Do not reformat whole files or mix a feature
  with a large refactor.

### Adding a new screen

1. Add a phase constant to `src/state/GamePhase.js` if needed.
2. Create `src/screens/YourScreen.js` with `show()` and `hide()` methods and a
   fixed-position container that reads the charter through `this.game`.
3. Register it in `FalescGame`:
   `this.screenStateMachine.registerScreen(GamePhase.YOUR_PHASE, new YourScreen(this))`.
4. Add the transition in `FalescGame` (or `ScreenStateMachine.setState`) and
   style the screen in `styles/main.css`.
5. Add a smoke step or a focused scenario for the new transition. Remember that
   `onPhaseChanged()` closes modals on any non-`PLAYING` phase.

### Adding a map size

1. Add a `gridConfigs` entry in `src/map/MapGenerator.js`.
2. Add a mineral count in `World.generate()` (`MINERAL_COUNTS`).
3. Add the day limit to `BALANCE.dayLimits` in `src/design/balance.js` and the
   `SIZE_DATA` entry/chart copy in `src/screens/LobbyScreen.js`.
4. Add a card to the visible size picker and keep the hidden native `<select>`
   in sync.
5. Extend `scripts/scenarios/map-regression.mjs` to sample the new size.

### Adding a service program

1. Add an entry to `src/design/programs.js` (id, name, need/secondaryNeed,
   capacity, duration, open phases, footprint, cost, upkeep, quality,
   finish/vibe, constructionDays, buildable, colour, icon, testid, blurb).
2. Add an icon to `src/ui/icons.js` and a `BuildingRenderer` branch plus a
   `PROGRAMS` metrics entry (footprint guide and crest) so the place is visually
   distinct.
3. The service dock and build dialog discover buildable programs from the array.
   Verify affordability, the door cell and the footprint.
4. Add/update a scenario if the program is needed for the First Light goal, and
   assert its state in the smoke test when it is part of the main path.

### Tweaking resident behaviour

Choice and need tuning live in `src/simulation/DaySimulator.js` and
`src/design/balance.js`; trait effects live in `src/design/traits.js`. Change
the balance table first. The day simulator owns drift, scoring, queues, visit
effects, complaints and the report; `Resident` owns only model state and memory;
`ResidentAgent`/`ResidentCrowd` own the visual timeline. There is no
`NPCController` or steering system to tune any more.

### Tweaking building art

`src/buildings/BuildingRenderer.js` dispatches on `building.programId` (with a
legacy `blueprintId` fallback) and draws a flat SE shadow, then the
program-specific structure. Under-construction services are ghosted by the
container alpha and scaffolded. Coordinates are relative to the tile centre.
Keep the footprint within its cells unless you also update
`src/design/programs.js` and placement/occupancy. Service state transitions live
in `ServiceBuilding` (`promote`, `close`, `reopen`) and
`ServiceManager.promoteUnderConstruction()`.

### Opening a build prompt for testing

In the browser console:

```js
const cell = window.__falesc.findFreeCell('canteen');
window.__falesc.app.onWorldTap(cell.x, cell.y);
```

The normal path is a primary click/tap on the canvas after arming a service.
`findFreeCell(programId)` is a test/debug helper; it does not place the service
itself. Use `window.__falesc.selectProgram('tea_house')` to arm a program through
the real validation path, and `saveGame()`/`continueGame()` to exercise
persistence.

## 6. Debugging

- `window.__falesc.snapshot()` — compact state: phase, day/limit, lumen, works,
  population, housing, flourishing, devotion, projections, selected program,
  seed/size, sectors, services, residents, report, ending, modal/playback state,
  camera. Legacy aliases (`turn`, `actionsRemaining`, `selectedBlueprint`,
  `buildings`, `buildingStates`, `buildingBlueprints`) are kept for scenarios.
- `window.__falesc.app` — the whole coordinator: `world` (Pixi app, map,
  camera, minerals), `charter`, `crowd`, `screenStateMachine`, modals, etc.
- `window.__falesc.findFreeCell(programId)` and `worldToScreen(x, y)` — placement
  and coordinate conversion.
- Browser devtools breakpoints work normally; the code is unminified except for
  the vendored libraries.
- Pixi is WebGL. If the canvas is blank, check the console for WebGL/context
  errors and confirm the page is served over HTTP with `vendor/pixi.min.mjs`
  returning 200.
- The minimap is a separate Canvas2D element (`#minimap`). It is a quick visual
  check that the world exists even if the main canvas is being investigated.

### Useful console snippets

```js
// What is the game doing?
window.__falesc.snapshot();

// Jump the camera to the world centre at the fit zoom.
const g = window.__falesc.app;
g.world.camera.zoom = g.world.camera.minZoom;
g.world.camera.position.x = g.world.MAP_WIDTH / 2;
g.world.camera.position.y = g.world.MAP_HEIGHT / 2;
g.world.camera.updateTransform();

// Inspect sectors, services and residents.
g.world.map.sectors.map(s => ({ id: s.id, x: s.centerX, y: s.centerY, size: s.gridSize }));
g.charter.services.services.map(s => ({ name: s.name, program: s.programId, state: s.state, u: s.u, v: s.v, visits: s.visits }));
g.charter.activeResidents.map(r => ({ name: r.name, needs: r.needs, why: r.memory.lastChoice?.reason }));
```

The debug helpers are not gameplay shortcuts; `selectProgram`, `onWorldTap`,
`finalizeBuild` and `openDay` all run the real validation and simulation paths.

## 7. Git workflow

- Keep commits focused and use imperative, descriptive subjects. Recent
  tooling/docs commits use `chore:`, `feat:`, `fix:`, and `docs:`.
- `.artifacts/`, logs, and local env files are ignored. Do not commit
  screenshots or browser profiles.
- If a global gitignore excludes the filename `.gitignore`, stage it with
  `git add -f .gitignore`.
- The `vendor/` files are intentionally committed. Update them in a separate
  commit from gameplay changes when possible.
- Run `npm run check` before committing. Run the smoke test after behavioural
  changes and mention the result in the commit body if it is relevant.

## 8. Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| `npm run dev` prints a different port | 5173 is busy; the server tried the next port. Use the printed URL or `--strict-port`. |
| Browser shows a blank page | Check the console/network. Usually a 404 import, a page opened via `file://`, or WebGL disabled. |
| `Failed to resolve module specifier "pixi.js"` | The import map is missing/changed, or the browser does not support import maps. |
| 404 for `vendor/pixi.min.mjs` | The file was not committed or the server root is wrong; run from the repository root. |
| Stale code after an edit | Hard reload (the dev server sends `no-store`); make sure you are on the dev-server URL, not another copy. |
| Smoke test says `canvas has content` failed / `no 2d context` | The main Pixi canvas is WebGL and cannot be sampled with `getContext('2d')`. The config points `canvasSelectors` at `#minimap`; keep the minimap or adjust the config. |
| Harness external-request failure | A runtime import still points at a CDN. Move it to `vendor/` or add a narrow allowlist with a reason. |
| Reload during the day or report jumps back to planning | Expected: saves are only written during `PLAYING` to `falesc.save.v2`. Continue restores the last planning save. |
| Continue charter is missing | A valid v2 save exists only while a run is in planning. V1 is removed on read; unknown versions are cleared and corrupt payloads are ignored. |
| Camera keeps panning after Alt-Tab | Fixed by the blur/visibility handler; if it recurs, check that `InputManager` is still receiving `keyup`/`blur`. |
| Middle-mouse pan stuck | Fixed by the window-level pointer release and `e.buttons` check; verify the pointer was pressed on the canvas. |
| `npm run check` warns about a remote URL | It is a warning, not a failure. Remove the URL or add it to the ignore rules if it is a legitimate local placeholder. |
| `git add .gitignore` says it is ignored | The global git ignore excludes `.gitignore`; use `git add -f .gitignore`. |

## 9. Project layout

```text
index.html                  import map, favicon, module entry, void backdrop
favicon.svg
package.json                scripts and Node engine
webgame.config.json         browser smoke test
scripts/
  dev-server.mjs            zero-dependency static server
  check.mjs                 dependency-free static checks
vendor/                     pinned Pixi + license/provenance
src/
  App.js                    pure entrypoint: new FalescGame()
  FalescGame.js             coordinator, screens, day playback, save, debug API
  Camera.js                 world transform, clamp, pointer/touch input
  Character.js              procedural chibi character container
  constants.js              palettes, animation states, tile sizes, minerals
  world/World.js            Pixi app, layers, camera/input, map and minerals
  charter/Charter.js        run model: day, lumen, works, roster, services, ending
  design/                   needs, traits, programs, balance, names
  services/                 ServiceBuilding, ServiceManager, PlacementPolicy
  simulation/DaySimulator.js deterministic day and report
  economy/LumenLedger.js    contributions, upkeep, closures
  residents/                Resident, ResidentFactory, ResidentAgent, ResidentCrowd
  navigation/IslandNavigator.js  per-island A*
  state/                    GamePhase, ScreenStateMachine
  screens/                  menu, lobby, HUD, day, report, end
  ui/                       build/service/bulletin/resident modals, chart, chatter, icons
  map/                      single-pass generation, packing, sectors, grid math, paths
  buildings/BuildingRenderer.js  illustrated service silhouettes (art only)
  character/                procedural character rendering/animation
  minerals/                 seeded static rock/crystal scenery
  persistence/              versioned localStorage save v2
styles/main.css             design tokens, void backdrop, all chrome
assets/fonts/               OFL fonts and licenses
scripts/scenarios/          browser regressions (resident, economy, save, map, engine, victory, mobile)
docs/                       design vision, architecture, development, testing, gameplay, issues
```
