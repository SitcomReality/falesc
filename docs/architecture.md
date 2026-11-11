# Architecture

This document describes how FALESC boots, updates, renders, and changes state.
For setup and commands see [development.md](development.md); for tests see
[testing.md](testing.md); for the visual system see [design-vision.md](design-vision.md).

## 1. Runtime model

FALESC is a static site with no build step or server-side code:

```text
index.html
  ├─ local font preloads + styles/main.css
  ├─ illustrated Glass Sea backdrop (inline SVG, CSS grain/vignette)
  ├─ <script type="importmap">      bare "pixi.js" → ./vendor/pixi.min.mjs
  └─ <script type="module" src="./src/App.js">
```

Relative imports between first-party modules use explicit `.js` extensions. The
browser must load the page over HTTP(S); `file://` URLs cannot load ES modules.

There is no package install. Pixi 7 is vendored and served as a static file. All
fonts are OFL woff2 files under `assets/fonts/`; no CDN is used at runtime. Other
visual assets are inline SVG or Pixi Graphics.

The Pixi application is created with `backgroundAlpha: 0`, so the sunset sea is
a DOM backdrop behind a transparent game canvas. The canvas is fixed at
`z-index: 1`; DOM screens sit above it.

## 2. Boot sequence

`GameApp`'s constructor (`src/App.js`):

1. Creates the transparent Pixi `Application` (`resizeTo: window`, WebGL,
   antialiasing, device-pixel-ratio resolution).
2. Creates world layers inside `worldContainer`: `mapLayer`, `shadowLayer`,
   `characterLayer`. Only `characterLayer` has `sortableChildren`.
3. Creates `CrowdManager` (with a reference to the game for building/map
   queries), `InputManager`, `BuildingManager`, and `BuildModal`.
4. Creates `GameStateManager` and `SaveManager`.
5. Registers five DOM screens: menu, lobby, HUD, interstitial, end. The HUD gets
   the game instance so it can read the economy.
6. Wraps `setState` to close the build modal on every non-`PLAYING` transition,
   cancel pending turns when leaving to `MENU`/`LOBBY`/`END`, and clear the save
   on `END`.
7. Installs `onTideStart`, `onTideResolve`, and `onStateSettled` callbacks on the
   state manager. These supply the economy preview, resolution/victory check, and
   autosave.
8. Creates the camera and the survey chart (2D minimap).
9. Installs the `startGame` wrapper: clear save, generate the world, start the
   run, then save. Installs a `beforeunload` autosave.
10. Starts on `MENU` and exposes `window.__falesc`.
11. On the first completed ticker frame, sets `window.__APP_READY__` and
    dispatches `app-ready`.

The game is a singleton; reloading the page resets everything. Save/continue is
the only cross-reload state.

## 3. State machine and screens

`src/GameStateManager.js` defines:

| State | Meaning | Screen |
| --- | --- | --- |
| `MENU` | Title over the sunset | `MenuScreen` |
| `LOBBY` | Seed / map-size charter form | `LobbyScreen` |
| `PLAYING` | Active world and HUD | `GameScreen` |
| `INTERSTITIAL` | Tide resolution overlay | `InterstitialScreen` |
| `END` | Victory / defeat / abandon record | `EndScreen` |

Screens are fixed-position DOM overlays created once and toggled with
`display`. All visual styling lives in `styles/main.css`; JS adds classes and
`data-testid` hooks. Menu/Lobby/End use z-index 1000, interstitial 500, HUD 100,
and the build modal 2000.

The HUD is a full-screen container with `pointer-events: none`; individual
panels re-enable pointer events. This keeps the canvas pannable while HUD panels
sit on top.

### Turn flow

`GameStateManager` owns the only turn timer, a `TurnScheduler` token. The flow:

1. `endTurn()` refuses unless the state is `PLAYING` and no turn is pending.
2. It calls `onTideStart()` to produce the income preview for the interstitial,
   switches to `INTERSTITIAL`, and schedules resolution in 1.9 s.
3. The scheduler callback calls `onTideResolve()` (`App.resolveTide()`), which:
   - asks `BuildingManager.resolveTide()` to collect income from active
     structures and advance every structure one phase;
   - adds income to the purse;
   - returns `{ income, active, promoted, outcome, message }`, with `outcome`
     set to `victory` when the Beacon is active or `defeat` when the next day
     would pass the tide limit.
4. The state manager increments the day, restores one action, and either calls
   `endGame(outcome)` or returns to `PLAYING`. After returning to play it calls
   `onStateSettled()` to autosave.

Cancelling the run, leaving to the menu/lobby, or ending the charter invalidates
the scheduler token, so a stale timer can never force the game back to `PLAYING`.
There are no other `setTimeout` calls in the game flow.

## 4. Coordinate systems and camera

- **World pixels** — the scene graph. The world rectangle is derived from the
  packed island cluster plus water margin; it is no longer `window size × 5`.
- **Screen/CSS pixels** — pointer positions and DOM layout.
- **Grid coordinates** — fractional `(u, v)` inside a sector's isometric grid,
  `0..gridSize`. A cell is `TILE_WIDTH = 512` by `TILE_HEIGHT = 256` world
  pixels before camera zoom.

`Camera` moves `worldContainer`:

```text
screen = center + (world - camera.position) * zoom
 world = camera.position + (screen - center) / zoom
```

It supports WASD/arrow panning, wheel zoom at the cursor, middle-mouse drag, and
touch pan/pinch. `Camera.setBounds()` receives the generated cluster bounds,
derives a minimum zoom that lets the player see the whole archipelago, and
clamps the camera centre so the view stays within the cluster plus a water
margin. Clamping is applied on every `updateTransform`, including pan, zoom, and
resize.

The isometric projection in `src/map/GridUtils.js`:

```text
x = (u - gridSize/2 - (v - gridSize/2)) * TILE_WIDTH / 2 + sector.centerX
y = (u - gridSize/2 + (v - gridSize/2)) * TILE_HEIGHT / 2 + sector.centerY
```

`worldToGrid` is its inverse. `Sector.getGridCell()` returns fractional grid
coordinates; `App.onWorldTap()` validates the range and floors the cell when
placing a building.

## 5. World generation

`App.initializeWorld()` clears the previous world, creates a `MapGenerator` with
the lobby seed and size, replaces `MAP_WIDTH`/`MAP_HEIGHT` with the generator's
world rectangle, and points the camera at the home island.

`MapGenerator` (`src/map/MapGenerator.js`) is a single-pass pipeline:

1. Build each local island silhouette once with a per-sector `SeededRandom` and
   the configured grid size. Compute its actual axis-aligned bounds.
2. Pack islands on an Archimedean spiral against those **actual shape bounds**
   with a 110 px gap. AABB separation guarantees the irregular polygons cannot
   intersect. Nothing is regenerated after packing.
3. Translate the packed cluster into a world rectangle with 520 px of water on
   every side. Store `worldWidth`, `worldHeight`, `bounds`, and `homeSector`
   (largest/topmost island).
4. Construct each `Sector` once at its final position from the prebuilt local
   silhouette. The sector draws its own art via `SectorGraphics`.

| Map size | Sector grids | Minerals | Tide limit |
| --- | --- | --- | --- |
| `small` | 4 × `2×2` | 30 | 12 |
| `medium` | 2 × `3×3` + 4 × `2×2` | 50 | 14 |
| `large` | 1 × `4×4` + 2 × `3×3` + 4 × `2×2` | 70 | 16 |

`sector.shape` is an organic, vertically squashed polygon generated by
`ShapeGenerator` (wobble, clamping, two Chaikin passes). `SectorGraphics` draws a
foam halo, offset water shadow, plum cliff, sun-bleached sand top, warm ink grid,
and procedural shore dressing (palms, grass, pebbles, flowers) outside the build
grid.

Characters spawn on a random island using the entity RNG. Minerals spawn outside
the build grid on a random island. Both use per-item seeded RNG streams.

## 6. Economy, blueprints, and the build flow

`src/buildings/blueprints.js` owns the economy data:

| Blueprint | Cost | Income | Special |
| --- | --- | --- | --- |
| `prism_rig` | 3 | 2 | Default armed blueprint |
| `tide_garden` | 5 | 3 | Stronger economy |
| `lantern_house` | 4 | 1 | `beaconDiscount: 3` |
| `aurora_beacon` | 12 | 0 | `unique`, `goal`; price floor 6 |

`effectiveCost(blueprint, buildings)` computes the dynamic Beacon cost. Starting
lumen is 8; one action per tide; active structures pay income at resolution.
Prism Rigs and Tide Gardens within `AFFINITY_RANGE` (460 px) of a crystal gain
+1 lumen/tide; `Building.income` stores the base plus bonus, and the bonus is
persisted and included in HUD/snapshot income.

### Build interaction

1. Clicking a blueprint card calls `GameApp.selectBlueprint(id)`, which rejects
   the selection when the state/action/affordability/unique rules fail.
2. A primary click/tap on an empty grid cell while `PLAYING`, with an action and
   enough lumen, calls `GameApp.onWorldTap()`.
3. `onWorldTap()` stores `pendingBuildLocation` and opens `BuildModal` with the
   armed blueprint, current purse, and existing buildings.
4. The modal is a real dialog: scrim, `role="dialog"`, labelled title, focus
   trap, Escape cancels, Enter submits, focus is restored on close. It tells the
   input manager to ignore camera keys while open.
5. Confirm calls `GameApp.finalizeBuild(name)`, which validates state, action,
   uniqueness, affordability, and cell occupancy. It creates the building, spends
   lumen, spends the action, dismisses the hint, and autosaves.
6. Cancel, Escape, a failed validation, or leaving `PLAYING` clears the pending
   location. A failed validation keeps the dialog open with an inline reason.
7. Clicking an occupied plot opens `StructureModal` instead. Dismantling removes
   the building, refunds half its effective cost, rebuilds paths, updates the
   HUD, and autosaves. It does not spend a build action.

Buildings are added to `characterLayer` so they share Y-sorted draw order with
characters and minerals. `BuildingRenderer` draws four distinct illustrated
silhouettes; under-construction states are ghosted and scaffolded, and `PENDING`
pulses. A small living-crystal outcrop marks a structure with crystal affinity.

## 7. Characters, animation, and AI

`Character` owns a Pixi `Container` at `(x, y)` with six child `Graphics` (legs,
arms, body, head), a separate shadow in `shadowLayer`, an animation state, a
palette, and procedural limb variations. It accepts an optional seeded RNG for
palette, frame offset, and proportions.

`CharacterAnimation` blends `IDLE`, `WALK`, `RUN`, and `BEND`. `CharacterRenderer`
draws static geometry once and positions/rotates/scales limbs every frame,
assigning facing-dependent z-indexes and a `groundY` for depth sorting.

`CrowdManager` maps each character to an `NPCController`, passing its home sector
and the game reference. NPCs choose `IDLE`, `BEND`, or `WANDER` on seeded timers.
`WANDER`:

- chooses a heading and optionally curves it;
- tests the destination against `homeSector.containsPoint()` and
  `BuildingManager.isWorldBlocked()` before moving;
- applies a small separation force from nearby Tidelanders;
- steers back toward the island centre when a step is blocked.

The rectangular world bounds remain only as a fallback for characters without a
home sector. Spawns use island points and are validated by the sector shape.

`Character.destroy()` does not unregister from `CrowdManager`; `App.clearWorld()`
destroys all characters then clears the crowd. A future single-character removal
path must unregister explicitly (see [known-issues.md](known-issues.md)).

## 8. Minerals and determinism

`MineralStructure` owns a container, a separate shadow, a type (`ROCK`/`CRYSTAL`),
a palette, and seeded procedural variations. `MineralRenderer.initStructure()`
dispatches to:

- `RockRenderer` — chunky polygonal pieces with light/dark/top faces, sorted
  inside the container;
- `CrystalRenderer` — one container and `Graphics` per shard.

All random visual choices draw from per-item `SeededRandom` streams. The map,
character palettes/proportions, mineral variations, and NPC decisions are
deterministic for a seed. Animation phase and NPC positions still depend on
elapsed frame time, which is why visual regression is not enabled yet.

## 9. Rendering and z-order

Inside `worldContainer`:

1. `mapLayer` — sector graphics (foam, cliffs, sand, grid, shore props).
2. `pathLayer` — cream stepping-stone paths from structures to their island's
   central square, rebuilt only when the building set changes.
3. `shadowLayer` — character and mineral shadows.
4. `interactionLayer` — hover cell highlight and the armed-blueprint ghost.
5. `characterLayer` — characters, minerals, buildings; `sortableChildren` sorts
   by `zIndex` derived from ground Y.
6. `overlayLayer` — ambient Tidelander speech bubbles (`ChatterManager`), above
   all world objects but below DOM chrome.

The Pixi canvas is WebGL and transparent. Behind it, `index.html` renders an
inline SVG scene (gradient sky, sun, clouds, birds, distant islands, sea,
reflection, waves, foreground fronds) plus CSS grain and a vignette. DOM screens
and the build modal sit above the canvas and are not part of the Pixi scene graph.

A separate Canvas2D `#minimap` sits in the survey chart at bottom-left, above the
game canvas but below the menu/end screens. It draws a deep-water chart, island
coastlines, buildings, the Beacon halo, and the camera viewport; it updates every
third frame even before a world exists.

`--tide-progress` is updated from the game loop and drives a slow CSS filter on
the illustrated backdrop, so the Glass Sea darkens toward dusk as the tide limit
approaches.

## 10. Persistence

`src/persistence/SaveManager.js` stores a versioned JSON payload in
`localStorage` under `falesc.save.v1`. Model data only:

```json
{
  "version": 1,
  "savedAt": 0,
  "settings": { "mapSeed": 12345, "mapSize": "medium" },
  "turn": 3,
  "dayLimit": 14,
  "actionsRemaining": 1,
  "lumen": 4,
  "selectedBlueprint": "prism_rig",
  "hintDismissed": true,
  "buildings": [{ "sectorId": 0, "u": 1, "v": 2, "name": "Rig", "blueprintId": "prism_rig", "state": "RESERVED" }],
  "camera": { "x": 0, "y": 0, "zoom": 0.4 }
}
```

`continueGame()` restores settings, regenerates the seeded world, restores
buildings through `BuildingManager.restore()`, applies state fields through
`GameStateManager.restoreRun()`, and restores/clamps the camera. Corrupt or
unknown-version saves are discarded.

Autosaves happen after builds, after resolved tides, and on `beforeunload`.
`END` clears the save. There is no export/import yet.

## 11. Debug surface

`window.__falesc` is installed by `App.exposeDebugApi()`:

| Member | Purpose |
| --- | --- |
| `app` | The full `GameApp` instance |
| `ready` | Whether the first frame completed |
| `snapshot()` | State, day, actions, lumen, income, selected blueprint, seed, counts, building states/blueprints, modal state, end result, camera |
| `findFreeCell()` | First unoccupied grid cell plus its world position |
| `worldToScreen(x, y)` | Convert world coordinates to CSS pixels |
| `selectBlueprint(id)` | Arm a blueprint through the real validation path |
| `saveGame()` / `continueGame()` | Exercise persistence from a scenario |

`window.__APP_READY__` is the harness readiness flag. Scenario files under
`scripts/scenarios/` use these hooks plus DOM selectors.

## 12. Lifecycle and reset

`initializeWorld()` is called on every new game and on continue. It clears
characters, minerals, buildings, the map, and all layers, then regenerates
everything from the current lobby settings. It resets the selected blueprint and
hint but not the state manager's turn/economy fields; `startGame` or
`restoreRun` sets those.

Not reset or persisted:

- `players` is always empty (no multiplayer);
- audio is absent;
- `turnDuration` is unused (there is no turn timer);
- NPC position/animation state is not part of the save and restarts from spawn
  on continue.

The game loop only simulates the crowd, characters, minerals, and buildings while
`PLAYING` and `document.hidden` is false. Camera input and the survey chart keep
working while overlays are visible.

## 13. Extension points

- **New screen**: add a state constant, a screen class with `show`/`hide`, and
  register it in `App`; style it in `styles/main.css`.
- **New blueprint**: add an entry in `src/buildings/blueprints.js`, an icon in
  `src/ui/icons.js`, and a branch in `BuildingRenderer`; update the dock and
  victory scenario expectations.
- **New map size**: add a grid config in `MapGenerator`, a mineral count and tide
  limit, and a card in `LobbyScreen`.
- **New NPC behaviour**: extend `NPCController`; animation states live in
  `constants.js`.
- **New test step**: edit `webgame.config.json` or add a scenario in
  `scripts/scenarios/`; see [testing.md](testing.md).
- **New visual token or component**: add a custom property or component class in
  `styles/main.css`; keep the guardrails in [design-vision.md](design-vision.md).

For safe-change guidance see [development.md](development.md), and for remaining
issues see [known-issues.md](known-issues.md).
