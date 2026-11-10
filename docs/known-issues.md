# Known issues and technical debt

This document records issues that are larger than a safe drive-by fix. It is a
living list: when something is fixed, move it to “Fixed during setup” (or delete
it) and update any tests/docs that referenced it.

Severity is about impact on the prototype, not effort:

- **High** — visibly wrong behaviour, lost work, or an architecture that blocks
  the next feature.
- **Medium** — real limitation or maintainability risk with a workaround.
- **Low** — cleanup, edge case, or environment-specific annoyance.

## Summary

| # | Severity | Issue |
| --- | --- | --- |
| 1 | High | Island packing uses circles, final shapes are regenerated, and the cluster can exceed the world bounds |
| 2 | High | NPCs ignore terrain and can walk across empty ocean / through buildings |
| 3 | High | No save/load or persistence |
| 4 | High | Turn and building timing is not state-driven |
| 5 | High | No economy, objective, or multiplayer despite the UI |
| 6 | Medium | Camera has no world-bound clamp |
| 7 | Medium | Building placement rules are minimal |
| 8 | Medium | Procedural content is only partly deterministic |
| 9 | Medium | Screen/overlay lifecycle and modal focus are incomplete |
| 10 | Medium | Single-character removal would leave a crowd controller behind |
| 11 | Medium | Dead code and an unused dependency remain |
| 12 | Medium | Keyboard/accessibility and narrow-screen support are incomplete |
| 13 | Low | WebGL context loss is not handled |
| 14 | Medium | Simulation and rendering continue behind menu/end overlays |
| 15 | Low | Map generation creates each island three times |
| 16 | Low | Minor teardown/cleanup gaps |

## High severity

### 1. Island packing and world bounds

**Evidence**

- `src/map/MapGenerator.js` treats each island as a circle of `radius`:
  `d < radius + existing.radius + minSpacing`.
- `src/map/Sector.js` derives that radius from half the grid width × 1.8, but
  `src/map/ShapeGenerator.js` generates an irregular, vertically squashed
  silhouette whose extent can reach **1.3 × radius** horizontally
  (`maxRadiusFactor`/clamp) and roughly 0.65 × radius vertically (`aspect`).
  A circle of `radius` is not a conservative bound for the drawn shape.
- After packing, the cluster is centred and **every sector is rebuilt** at the
  final position with the continued RNG. The shapes that are drawn were never
  the shapes that were collision-tested.
- A read-only simulation of the current algorithm over seeds `index * 7919`
  found at least one intersecting island pair in 38/100 medium, 29/100 large,
  and 6/100 small maps. For seed 123456 medium at 1280×720, final shape bounds
  were approximately `x [-643, 6962]`, `y [-815, 4343]` against a nominal
  `6400 × 3600` world.
- The smoke test's `map-overview.png` (camera at zoom 0.2) shows islands cut
  off at the top and bottom even at minimum zoom.

**Impact**

Islands can overlap or merge visually, grid overlays can collide, and part of
the map can sit outside the nominal world. At minimum zoom the whole map is not
visible, and characters spawned outside the world bounds can be clamped or walk
into empty space on their first movement.

**Suggested direction**

- Generate each sector once, after packing, and pack against the actual final
  shape bounds (polygon/AABB or a conservative shape-aware radius).
- Scale/translate the finished cluster to fit a **fixed virtual world size**
  rather than deriving the world from the window, or make the camera/minimap
  adapt to the actual cluster bounds.
- Add a regression test that samples many seeds and asserts no intersecting
  island polygons and `cluster ⊆ world`.
- This is tied to #6 (camera clamp) and #15 (allocation); treat it as one
  layout pass rather than three unrelated tweaks.

### 2. NPCs ignore terrain

**Evidence**

- `App.initializeWorld()` sets crowd bounds to the rectangular
  `MAP_WIDTH × MAP_HEIGHT`.
- `NPCController.move()` only reflects the character at the rectangle edges; it
  never calls `Sector.containsPoint`, checks the grid, or tests buildings,
  minerals, or other characters.
- Characters spawn at `getRandomPointOnMap()` / `sector.getRandomPoint()`,
  which can be outside the nominal world when the island cluster overflows it
  (see #1).

**Impact**

NPCs walk across the dark ocean/void, through buildings, and through each
other. On the first WANDER step, a character spawned outside the rectangle can
teleport to the nearest bound. The population is ambient scenery rather than a
simulation.

**Suggested direction**

- Add a land mask/navigation graph per sector (or a coarse grid) and restrict
  WANDER targets to connected land cells.
- Add spawn validation and a fallback to the sector centre.
- Add separation/steering and simple obstacle avoidance for buildings, or
  explicitly scope NPCs as decorative and keep them on their spawn island.
- Cover it with a scenario that runs many NPC updates and asserts each NPC stays
  inside a sector (or inside the world, if ocean walking is acceptable).

### 3. No save/load or persistence

**Evidence**

- `GameStateManager` settings, turn, and player data are plain memory.
- `BuildingManager.buildings` is the only building store; there is no
  serialization or storage code.
- Reloading the page constructs a new `GameApp` and starts at `MENU` with a
  fresh random seed.

**Impact**

Every reload loses the game, and there is no way to reproduce a session beyond
remembering the seed and replaying it. This blocks meaningful long sessions and
most debugging of “what happened in this game?”.

**Suggested direction**

- Define a versioned save schema for settings, turn, buildings, camera, and (if
  desired) characters/seed-derived state.
- Autosave to `localStorage` on turn end and expose Export/Import JSON.
- Keep save/load independent of the Pixi scene graph: serialize model data and
  rebuild visuals through `initializeWorld()`/`BuildingManager`.
- Add a smoke test that saves, reloads, and verifies turn/buildings survive.

### 4. Turn and building timing is not state-driven

**Evidence**

- `GameStateManager.endTurn()` uses an uncancelled `setTimeout(..., 2000)` to
  advance the turn and reset `actionsRemaining = 1`.
- `App` wraps `endTurn()` with a second uncancelled `setTimeout(..., 1000)` to
  call `buildingManager.processTurn()`.
- Neither timer is stored, cancelled, or tied to a turn id. The modal exploit
  that could abuse this was fixed by closing the modal on state changes, but
  the underlying pattern remains.

**Impact**

A future screen/transition that leaves `PLAYING` mid-interstitial can still be
forced back to `PLAYING` by the pending timer, and a slow/backgrounded tab can
desynchronize building phases from the turn counter. The two timers are hard to
reason about and impossible to cancel cleanly.

**Suggested direction**

- Replace both timeouts with a single turn scheduler owned by the state
  manager: `endTurn()` captures a turn token, schedules the transition, and
  cancels on `endGame`/menu/restart.
- Drive building phases from the turn number (e.g. `promote` on transition to
  turn N) instead of a separate timer.
- Add tests for “end turn, then leave the game before the timer fires” and
  “restart during interstitial”.

### 5. No economy, objective, or multiplayer despite the UI

**Evidence**

- `GameStateManager.settings.initialResources` is never read; `turnDuration` is
  never applied; `players` stays empty.
- Buildings have no cost, income, or effect; `BuildingManager` only enforces
  one building per cell.
- `End Game` is a manual button; there is no win/lose condition.
- `MenuScreen`'s “Join Multiplayer” button calls
  `alert('Multiplayer not yet implemented')`.

**Impact**

The prototype is a construction sandbox, not yet a game loop. The lobby exposes
settings that do not affect play, and the menu promises a mode that does not
exist.

**Suggested direction**

This is a design decision, not a patch. Pick the smallest loop worth building
(e.g. resources → building cost/income → turn goal), wire one setting at a time,
and remove or disable UI that is not implemented. Keep the multiplayer button
disabled/labelled “coming soon” until there is a real transport.

## Medium severity

### 6. Camera has no world-bound clamp

`Camera` can pan arbitrarily far past the islands. The minimap shows where the
camera is, but it is easy to lose the map at high zoom. Clamp the camera centre
to the actual cluster/world bounds expanded by half the viewport at the current
zoom (or a fixed margin), and recompute the clamp on resize/zoom.

### 7. Building placement rules are minimal

`BuildingManager.isCellOccupied()` checks only other buildings. Placement does
not check minerals, characters, terrain, ownership, or cost; buildings are
always one tile and cannot be removed or upgraded. A proper placement-policy
layer (terrain, occupancy, resources, ownership) should return a reason so the
modal/HUD can explain rejection. This pairs with #5.

### 8. Procedural content is only partly deterministic

The map seed controls sector placement and mineral positions, but
`Character.getRandomPalette()`, limb variations, `MineralStructure` variations,
`RockRenderer` shapes, and NPC decisions use `Math.random()`. The smoke test can
assert seed, counts, and building states, but not visuals. This is why visual
regression is not enabled. Inject a shared seeded RNG (with a test-only seed) if
reproducible visuals or NPC runs are needed; see
[testing.md](testing.md#7-visual-regression-not-enabled).

### 9. Screen/overlay lifecycle and modal focus are incomplete

All five screens are constructed once, appended permanently, and toggled with
`display`. They have no `destroy`, listener teardown, or focus management. The
build modal has `role="dialog"`, labels, Escape handling, and a cancel contract,
but it is not a focus trap and has no full-screen backdrop; HUD buttons remain
clickable and Tab can leave the dialog. The state wrapper now closes the modal
when leaving `PLAYING`, so the worst exploit is fixed, but a real overlay/focus
manager is still the right long-term structure.

### 10. Single-character removal would leave a crowd controller behind

`Character.destroy()` destroys graphics and nulls helpers but does not call
`CrowdManager.unregister`. `App.clearWorld()` masks this by destroying every
character and then clearing the whole crowd. Any future single-character
removal (death, despawn, selection) would leave an `NPCController` updating a
destroyed character. Give `Character` an owner callback or route removal through
`CrowdManager`.

### 11. Dead code and an unused dependency remain

- `src/UI.js` (`SandboxUI`) is imported nowhere and would throw if constructed:
  it references `game.settings`, `game.removeCharacters`, `game.clearAll`, and
  `game.randomizeAllColors`, none of which exist on `GameApp`. It is the only
  consumer of `lil-gui`.
- `src/character/bodyRenderer.js`, `headRenderer.js`, `limbRenderer.js`, and
  `shadowRenderer.js` are not imported; `CharacterRenderer` reimplements their
  logic. The dead shadow helper also disagrees with the live one about leg
  length.
- `src/map/Sector.js` computes `gridPoly` but never uses it; `SectorGraphics`
  imports `PIXI` without using it; `MineralRenderer` imports `SHAPES` without
  using it.

Delete the dead files/imports, or wire `SandboxUI` to the real game API and
implement the missing methods. If `UI.js` goes, remove `lil-gui` from the import
map and `vendor/`.

### 12. Keyboard/accessibility and narrow-screen support are incomplete

- `index.html` sets `user-scalable=no`, preventing browser zoom.
- Building placement requires a pointer/touch tap on the canvas; there is no
  keyboard cursor or accessible alternative.
- The modal labels are now associated, but there is no focus trap or
  `aria-live` turn announcement; focus can tab to the HUD behind it.
- Buttons use hover transforms but no visible focus style.
- Fixed HUD/minimap sizes are workable at 1280×720 but cramped on small phones;
  the modal now has a `max-width`, but the rest of the UI is not responsive.

### 14. Simulation and rendering continue behind menu/end overlays

`App.update()` always updates the camera, crowd AI, characters, minerals,
buildings, and minimap, regardless of state. `endGame()` only changes the DOM
screen. On menu/end, the hidden world keeps animating and consuming CPU, and NPC
state can drift before the next game. Consider pausing the crowd/buildings when
not `PLAYING` (or when `document.hidden`) while keeping the camera/minimap
available if desired.

## Low severity

### 13. WebGL context loss is not handled

Headless Firefox occasionally logs “WebGL context was lost” from Pixi. The smoke
screenshots still render and the run passes, but there is no
`webglcontextlost`/`webglcontextrestored` handling or fallback renderer. In a
real browser this can leave a blank canvas until reload. Add a listener that
surfaces a reload prompt, or recreate the renderer/application, and treat the
headless warning as environment noise only when screenshots confirm rendering.

### 15. Map generation creates each island three times

`MapGenerator` creates a scratch `Sector` for the radius, a placed `Sector`, and
a final rebuilt `Sector` after centring. The first two graphics objects are now
destroyed, so the leak is fixed, but shape generation, Graphics allocation, and
RNG consumption are wasted. A single-pass “pack extents, then build once”
approach would fix this and help #1.

### 16. Minor teardown/cleanup gaps

- `InputManager.destroy()` and `Camera` listener teardown exist only partially
  (Camera has no `destroy`); both are singletons today, so this is only a
  problem if the app ever supports teardown/hot reload.
- For crystals, the initial empty `mainG` remains a child of the mineral
  container forever; it is empty and harmless.
- `EndScreen` builds its stats with `innerHTML` from numeric values; safe today,
  but prefer `textContent`/elements if user-provided text is ever added.
- The minimap updates every third frame; that is fine for an orientation aid but
  still more often than necessary.

## Fixed during setup

These were found and fixed during the local-development/testing pass:

- Vendored Pixi/lil-gui and added the static dev server, so the game runs
  offline with no CDN and no install step.
- Added readiness/debug hooks and the 2D minimap, with a browser smoke test.
- The build modal now closes when leaving `PLAYING`; canvas taps are ignored
  while it is open; a build action is spent only when creation succeeds.
- Modal sizing, labels, Escape/Enter handling, cancel-vs-submit semantics, and
  name trimming were corrected.
- Character shadows now use the same clamped leg length as the drawn legs.
- Removed the unused unbounded mineral-renderer cache.
- Discarded map-sector graphics are destroyed; replaced sectors are cleaned up.
- Camera taps no longer fire on pointer-leave/right-click; pointer releases
  outside the canvas no longer leave middle-mouse panning stuck.
- Held keys are cleared on window blur/visibility change.
- Repeated `BEND` decisions restart their animation phase.
- First-frame character z-index uses the current ground Y when available.
- Seed `0` is preserved instead of being replaced by a random seed.
- HUD text is only written when it changes; the minimap updates every third
  frame.
- New games recentre the camera and reset zoom; map dimensions are recomputed
  from the current window at start.
- Added a favicon (the earlier 404 is gone).

## Updating this document

When you fix something here:

1. Move the entry to “Fixed during setup” (rename that section if the context
   changes) or delete it if it is no longer relevant.
2. Update the summary table and any cross-references in
   [architecture.md](architecture.md), [testing.md](testing.md), or
   [gameplay.md](gameplay.md).
3. Add or update a test when the issue is testable. If it cannot be tested yet,
   explain why in the entry.
