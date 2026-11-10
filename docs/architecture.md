# Architecture

This document describes how FALESC boots, updates, renders, and changes state.
For setup and commands see [development.md](development.md); for tests see
[testing.md](testing.md); for known risks see [known-issues.md](known-issues.md).

## 1. Runtime model

FALESC is a static site with no build step or server-side code:

```text
index.html
  ├─ <script type="importmap">      bare "pixi.js" / "lil-gui" → ./vendor/*
  └─ <script type="module" src="./src/App.js">
```

`src/App.js` ends with `new GameApp()`. Relative imports between first-party
modules use explicit `.js` extensions. The browser must load the page over HTTP
(or HTTPS); `file://` URLs cannot load ES modules.

There is no package install. `vendor/pixi.min.mjs` and
`vendor/lil-gui.esm.min.js` are checked in and served as static files. The only
runtime dependencies are those two libraries; everything else is DOM, Canvas2D,
or Pixi drawing code.

## 2. Boot sequence

`GameApp`'s constructor (`src/App.js`) does the following, in order:

1. Creates a Pixi `Application` with `resizeTo: window`, WebGL, antialiasing,
   device-pixel-ratio resolution, and a dark background.
2. Appends the Pixi canvas and creates the world layers inside
   `worldContainer`: `mapLayer`, `shadowLayer`, `characterLayer`. Only
   `characterLayer` has `sortableChildren` enabled.
3. Creates `CrowdManager`, `InputManager`, `BuildingManager`, and `BuildModal`.
4. Creates `GameStateManager`, registers the five DOM screens, and installs a
   `setState` wrapper that closes the build modal when leaving `PLAYING`.
5. Creates `Camera` (bindings, pointer/wheel listeners) and `Minimap` (a 2D
   canvas overlay).
6. Computes the world size as `window size × 5`, centres the camera, and hooks
   `startGame`/`endTurn` to generate the world and advance buildings.
7. Exposes `window.__falesc`, starts on `MENU`, and registers the ticker update.
8. On the first completed ticker frame, sets `window.__APP_READY__ = true` and
   dispatches `app-ready`. The browser smoke test waits for this.

The game is single-page and singleton: `GameApp` is never destroyed or
recreated. Reloading the page resets everything.

## 3. State machine and screens

`src/GameStateManager.js` defines:

| State | Meaning | Screen |
| --- | --- | --- |
| `MENU` | Title screen | `MenuScreen` |
| `LOBBY` | Seed / map-size form | `LobbyScreen` |
| `PLAYING` | Active world and HUD | `GameScreen` |
| `INTERSTITIAL` | Turn processing overlay | `InterstitialScreen` |
| `END` | Manual game over | `EndScreen` |

`setState(newState)` hides the current screen, stores the new state, and shows
the registered screen. It returns early when the state is unchanged and a screen
is already active. Screens are ordinary fixed-position `<div>` overlays with
their own z-index; they are created once and toggled with `display`.

`MenuScreen`/`LobbyScreen`/`EndScreen` use z-index 1000,
`InterstitialScreen` uses 500, and `GameScreen` uses 100. `BuildModal` uses
2000, above every screen, which is why the modal must be closed explicitly on
state transitions.

### Turn flow

`startGame()` sets `currentTurn = 1`, `actionsRemaining = 1`, and switches to
`PLAYING`. `endTurn()`:

1. Refuses to run unless the state is `PLAYING`.
2. Switches to `INTERSTITIAL`.
3. After 2000 ms, increments the turn, resets `actionsRemaining = 1`, and
   returns to `PLAYING`.

`GameApp` wraps `endTurn` to also schedule `buildingManager.processTurn()` after
1000 ms. That is how a building moves one phase per interstitial. The two
timers are independent wall-clock timers, not part of the state machine; see
[known-issues.md](known-issues.md).

## 4. Coordinate systems and camera

Three coordinate spaces are used:

- **World pixels** — the scene graph, with the world origin in the top-left of
  a nominal `MAP_WIDTH × MAP_HEIGHT` rectangle. The map is `5 ×` the initial
  viewport.
- **Screen/CSS pixels** — pointer positions and DOM layout.
- **Grid coordinates** — fractional `(u, v)` inside a sector's isometric grid,
  `0..gridSize`. A cell is `TILE_WIDTH = 512` by `TILE_HEIGHT = 256` world
  pixels before camera zoom.

`Camera` (`src/Camera.js`) moves `worldContainer`:

```text
screen = center + (world - camera.position) * zoom
 world = camera.position + (screen - center) / zoom
```

It supports WASD/arrow panning, wheel zoom at the cursor, middle-mouse drag, and
touch pan/pinch. Zoom is clamped to `0.2–4`. There is no camera/world clamp, so
the player can pan into empty space; the minimap exists to help orientation.

The isometric grid projection in `src/map/GridUtils.js` is:

```text
x = (u - gridSize/2 - (v - gridSize/2)) * TILE_WIDTH / 2 + sector.centerX
y = (u - gridSize/2 + (v - gridSize/2)) * TILE_HEIGHT / 2 + sector.centerY
```

`worldToGrid` is its inverse. `Sector.getGridCell()` returns fractional grid
coordinates; `App.onWorldTap()` validates the range and floors the cell when
placing a building.

## 5. World generation

`App.initializeWorld()` clears the previous world, recomputes the map size from
the current window, and creates a `MapGenerator` with the lobby's seed and map
size. It then adds 15 characters and a map-size-dependent number of minerals.

`src/map/MapGenerator.js` uses a seeded LCG (`SeededRandom`) and packs island
sectors on an Archimedean spiral with a simple circle-collision test:

| Map size | Sector grids | Minerals |
| --- | --- | --- |
| `small` | 4 × `2×2` | 30 |
| `medium` | 2 × `3×3` + 4 × `2×2` | 50 |
| `large` | 1 × `4×4` + 2 × `3×3` + 4 × `2×2` | 70 |

Each `Sector` (`src/map/Sector.js`) stores a centre, grid size, radius, organic
outline (`ShapeGenerator`), and a Pixi `Graphics` object drawn by
`SectorGraphics`. The outline is an isometric-ish island: a smoothed polygon
with horizontal wobble and a vertical aspect of 0.5, plus a cliff/side face and
the grid overlay.

After packing, the cluster is translated so its bounding box is centred on the
map. The current implementation then **regenerates every sector at the final
position** with the continued RNG, so the shapes that are drawn were not the
shapes used for collision. This is a known map-layout risk; see
[known-issues.md](known-issues.md#1-island-packing-and-world-bounds).

Characters spawn at random points inside island shapes
(`MapGenerator.getRandomPointOnMap()`). Minerals spawn at random island points
outside the build grid (`getRandomMineralPoint()`), so they act as scenery around
the buildable area.

## 6. Buildings and the build flow

`src/buildings/BuildingManager.js` owns `buildings[]`, checks occupancy
(`sectorId + floored u + floored v`), and creates `Building` objects at the
centre of a grid cell. Buildings are added to `characterLayer` so they share the
Y-sorted draw order with characters and minerals. `Building.setPosition()` sets
`container.zIndex` to the ground Y.

A building has three states:

| State | Appearance | Entered |
| --- | --- | --- |
| `PENDING` | Pulsing translucent placeholder | Immediately on placement |
| `RESERVED` | Blue ghost | After the first interstitial |
| `ACTIVE` | Solid grey block | After the second interstitial |

`processTurn()` advances each building one step. `Building.update()` drives the
pulse for `PENDING`; `BuildingRenderer` draws the isometric top/left/right faces
and two flat shadow parallelograms.

### Build interaction

1. A primary click/tap on an empty grid cell while `PLAYING`, with
   `actionsRemaining > 0`, calls `App.onWorldTap()`.
2. `onWorldTap()` stores `pendingBuildLocation` and calls
   `buildModal.show()`.
3. `BuildModal` focuses its name field and tells `InputManager` that a modal is
   open, so camera key bindings are ignored.
4. Reserve calls `App.finalizeBuild(name)`. It only proceeds if the state is
   still `PLAYING`, an action remains, and `createBuilding()` returns a
   building. It then spends one action.
5. Cancel, Escape, or a state transition hides the modal and clears the pending
   location.
6. While the modal is open, `onWorldTap()` ignores further canvas taps.

The modal is a centred fixed `<div>` with a `role="dialog"` and labels, but it is
not a focus trap and has no full-screen backdrop. HUD buttons remain clickable;
leaving `PLAYING` closes the modal safely.

## 7. Characters, animation, and AI

`Character` (`src/Character.js`) owns:

- a Pixi `Container` at `(x, y)` with six child `Graphics` (two legs, two arms,
  body, head);
- a separate shadow `Graphics` placed in `shadowLayer`;
- an animation state, angle set, palette, and procedural limb-length variations;
- `CharacterAnimation` and `CharacterRenderer` helpers.

`CharacterAnimation` computes and blends `IDLE`, `WALK`, `RUN`, and `BEND`
poses. `CharacterRenderer` draws the static geometry once (and again if the
palette signature changes), then positions/rotates/scales limbs, torso, and head
every frame. It assigns facing-dependent child z-indexes and computes
`groundY` from the shadow offset for world sorting.

`CrowdManager` maps each character to an `NPCController`. NPCs randomly choose
`IDLE`, `BEND`, or `WANDER` with randomized durations. `WANDER` chooses a
facing, optionally curves it, rotates toward it, and moves forward at
walk/run speed. Bounds are the rectangular map dimensions, with a 50 px padding
and reflection on the edges. There is no terrain, building, or character
collision, and no island-aware navigation. See
[known-issues.md](known-issues.md#2-npcs-ignore-terrain).

`App.clearWorld()` destroys every character and mineral, clears the crowd
controllers, destroys buildings, destroys the map, and empties the layers.
`Character.destroy()` does not unregister itself from `CrowdManager`; the
current bulk-clear path masks that.

## 8. Minerals

`MineralStructure` owns a container, a separate shadow, a type
(`ROCK`/`CRYSTAL`), a palette, and random procedural variations.
`MineralRenderer.initStructure()` dispatches to:

- `RockRenderer` — multiple chunky polygonal pieces with light/dark/top faces,
  z-sorted inside a container;
- `CrystalRenderer` — one container and `Graphics` per crystal shard, with
  tilted light/dark/top faces.

Minerals are static scenery: `update()` only reapplies scale and recalculates
`groundY`. `MineralRenderer` used to keep an unused static cache of containers;
that leak was removed during setup.

## 9. Rendering and z-order

Inside `worldContainer`:

1. `mapLayer` — sector graphics (island top, cliffs, grid).
2. `shadowLayer` — character and mineral shadows.
3. `characterLayer` — characters, minerals, buildings; `sortableChildren` sorts
   by `zIndex`, which is derived from each object's ground Y.

The Pixi canvas is WebGL. A separate Canvas2D `#minimap` sits in the DOM at
bottom-left, above the game canvas but below the menu/end screens. It draws
island silhouettes, buildings, and the camera viewport, and updates every third
frame.

DOM screens and the build modal sit above the canvas. They are not part of the
Pixi scene graph and do not receive world transforms.

## 10. Debug surface

`window.__falesc` is installed by `App.exposeDebugApi()`:

| Member | Purpose |
| --- | --- |
| `app` | The full `GameApp` instance |
| `ready` | Whether the first frame completed |
| `snapshot()` | State, turn, actions, seed, counts, building states, modal state, camera |
| `findFreeCell()` | First unoccupied grid cell plus its world position |
| `worldToScreen(x, y)` | Convert world coordinates to CSS pixels |

`window.__APP_READY__` is the harness readiness flag. These hooks are cheap and
safe to use from the browser console or test scenarios.

## 11. Lifecycle and reset

`initializeWorld()` is called on every `startGame`. It clears characters,
minerals, buildings, the map, and all layers, then regenerates everything from
the current lobby settings. It also resets the camera to the map centre at zoom
1. The game state manager, screens, modal, minimap, and Pixi application are
reused across games.

Not reset or persisted:

- no save/load; a reload starts at `MENU` with a fresh random seed;
- `players` is always empty;
- `initialResources` and `turnDuration` settings are not applied;
- the world keeps updating while `MENU`/`END` overlays are visible.

## 12. Extension points

- **New screen**: add a state constant, a screen class with `show`/`hide`, and
  register it in `App`; switch to it through `GameStateManager`.
- **New map size**: add a `gridConfigs` entry and a mineral count in
  `App.initializeWorld()`, and add the option in `LobbyScreen`.
- **New building appearance**: extend `BuildingRenderer` and/or the building
  state enum; keep `BuildingManager.processTurn()` in sync.
- **New NPC behaviour**: extend `NPCController` and its parameters; the
  animation states live in `constants.js`.
- **New test step**: edit `webgame.config.json`; see
  [testing.md](testing.md#6-extending-the-smoke-test).

For safe-change guidance see [development.md](development.md), and for the
issues that need a design pass see [known-issues.md](known-issues.md).
