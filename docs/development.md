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

The game has exactly two runtime dependencies:

| Specifier | Vendored file | Version |
| --- | --- | --- |
| `pixi.js` | `vendor/pixi.min.mjs` | 7.3.3 |
| `lil-gui` | `vendor/lil-gui.esm.min.js` | 0.19.1 |

`index.html` maps them:

```json
{
  "imports": {
    "pixi.js": "./vendor/pixi.min.mjs",
    "lil-gui": "./vendor/lil-gui.esm.min.js"
  }
}
```

Do **not** switch the import map back to a CDN. Runtime network access breaks
offline development and fails the harness's `noExternalRequests` check.

### Upgrading a vendored dependency

1. Download the new npm ESM build from jsDelivr (or unpack the npm tarball).
2. For Pixi, remove the trailing `//# sourceMappingURL=...` comment because the
   map is not vendored.
3. Replace the file, update `vendor/README.md` (version, source, notes).
4. Run `npm run check` and the browser smoke test.
5. For a Pixi major version, update `src/App.js` and `src/Camera.js` for the
   new application/canvas API before anything else.

`lil-gui` is currently only referenced by the unused `src/UI.js` sandbox
controller (see [known-issues.md](known-issues.md#11-dead-code-and-an-unused-dependency-remain)). If you delete
that file, remove `lil-gui` from the import map and `vendor/` as well.

## 5. Code conventions

- Vanilla ES modules; explicit `.js` extensions on relative imports.
- Four-space indentation and semicolons, matching the existing code.
- One system per class/module under `src/<area>/`; no framework or state
  library.
- DOM UI is created in screen/modal classes with inline styles. Pixi objects
  handle world rendering.
- Keep `window.__falesc` and `window.__APP_READY__` stable; the browser test
  depends on them.
- World units are pixels. Grid constants live in `src/constants.js`
  (`TILE_WIDTH = 512`, `TILE_HEIGHT = 256`).
- Prefer small, focused changes. Do not reformat whole files or mix a feature
  with a large refactor.

### Adding a new screen

1. Add a state to `GameState` in `src/GameStateManager.js` if needed.
2. Create `src/screens/YourScreen.js` with `show()` and `hide()` methods and a
   fixed-position container.
3. Register it in `App`:
   `stateManager.registerScreen(GameState.YOUR_STATE, new YourScreen(stateManager))`.
4. Add a way to enter/leave it (`setState`), and decide whether the world should
   pause while it is visible.
5. Add a smoke step or a focused test for the new transition.

### Adding a map size

1. Add a `gridConfigs` entry in `src/map/MapGenerator.js`.
2. Add a mineral count in `App.initializeWorld()` (`mineralCounts`).
3. Add the option to the `<select>` in `src/screens/LobbyScreen.js`.
4. Add a smoke assertion for the new size if the packing or counts are
   important.

### Tweaking NPC behaviour

`src/ai/NPCController.js` exports `NPC_PARAMS` at the top: durations, walk/run
speed, turn speed, curve chance, calm factor, boundary padding, and a movement
toggle. Change values there first; only change the state machine if the
behaviour itself needs to change. The renderer/animation states are in
`src/constants.js` and `src/character/CharacterAnimation.js`.

### Tweaking building art

`src/buildings/BuildingRenderer.js` is a static draw function that receives the
building's state. It draws the shadow parallelograms, right/left faces, and top
face in that order. Coordinates are relative to the tile centre. Keep the
building within one tile footprint unless you also update placement/occupancy.
Building state transitions live in `src/buildings/Building.js` and
`BuildingManager.processTurn()`.

### Opening a build prompt for testing

In the browser console:

```js
const cell = window.__falesc.findFreeCell();
window.__falesc.app.onWorldTap(cell.x, cell.y);
```

The normal path is a primary click/tap on the canvas. `findFreeCell()` is a
test/debug helper; it does not place the building itself.

## 6. Debugging

- `window.__falesc.snapshot()` — compact state: mode, turn, actions, counts,
  building states, modal state, camera.
- `window.__falesc.app` — the whole app: `map`, `camera`, `characters`,
  `buildingManager`, `stateManager`, etc.
- `window.__falesc.findFreeCell()` and `worldToScreen(x, y)` — placement and
  coordinate conversion.
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

// Jump the camera to the world centre at minimum zoom.
const g = window.__falesc.app;
g.camera.zoom = 0.2;
g.camera.position.x = g.MAP_WIDTH / 2;
g.camera.position.y = g.MAP_HEIGHT / 2;
g.camera.updateTransform();

// Inspect sectors and buildings.
window.__falesc.app.map.sectors.map(s => ({ id: s.id, x: s.centerX, y: s.centerY, size: s.gridSize }));
window.__falesc.app.buildingManager.buildings.map(b => ({ name: b.name, state: b.state, u: b.u, v: b.v }));
```

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
| Camera keeps panning after Alt-Tab | Fixed by the blur/visibility handler; if it recurs, check that `InputManager` is still receiving `keyup`/`blur`. |
| Middle-mouse pan stuck | Fixed by the window-level pointer release and `e.buttons` check; verify the pointer was pressed on the canvas. |
| `npm run check` warns about a remote URL | It is a warning, not a failure. Remove the URL or add it to the ignore rules if it is a legitimate local placeholder. |
| `git add .gitignore` says it is ignored | The global git ignore excludes `.gitignore`; use `git add -f .gitignore`. |

## 9. Project layout

```text
index.html                  import map, favicon, module entry
favicon.svg
package.json                scripts and Node engine
webgame.config.json         browser smoke test
scripts/
  dev-server.mjs            zero-dependency static server
  check.mjs                 dependency-free static checks
vendor/                     pinned Pixi/lil-gui + licenses/provenance
src/
  App.js                    bootstrap, layers, loop, debug API
  GameStateManager.js       state machine
  Camera.js                 world transform and pointer input
  constants.js              palettes, shapes, tile sizes
  controls/InputManager.js  key bindings and modal lock
  screens/                  DOM screens
  map/                      generation, sectors, grid math
  buildings/                model, manager, renderer
  character/                procedural character rendering/animation
  ai/                       crowd manager and NPC controller
  minerals/                 static rock/crystal scenery
  ui/                       build modal and minimap
docs/                       architecture, development, testing, gameplay, issues
```
