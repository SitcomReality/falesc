# Known issues and technical debt

This document records issues that are larger than a safe drive-by fix. It is a
living list: when something is fixed, move it to “Fixed during the Prism Tide
overhaul” and update any tests/docs that referenced it.

Severity is about impact on the prototype, not effort:

- **High** — visibly wrong behaviour, lost work, or an architecture that blocks
  the next feature.
- **Medium** — real limitation or maintainability risk with a workaround.
- **Low** — cleanup, edge case, or environment-specific annoyance.

## Summary

| # | Severity | Issue |
| --- | --- | --- |
| 1 | Medium | Building placement policy is still thin, and there is no demolition or upgrade path |
| 2 | Medium | Screens are permanent and the HUD is not fully inert/accessible behind the build dialog |
| 3 | Medium | Keyboard placement and small-screen interaction are incomplete |
| 4 | Medium | NPC navigation is steering-only and can stall on awkward shorelines |
| 5 | Low | WebGL context loss is not handled |
| 6 | Low | Save schema has no migration, export or import |
| 7 | Low | Multiplayer remains a disabled placeholder |
| 8 | Low | Minor teardown/cleanup gaps remain |
| 9 | Low | Visual regression is still not enabled |

## Open issues

### 1. Building placement policy and demolition

**Evidence**

- `BuildingManager.isCellOccupied()` checks only other buildings.
- Placement does not check minerals, characters, terrain type, ownership, or
  adjacency as blockers. Cost and uniqueness are enforced in
  `App.finalizeBuild()`, and the dialog keeps an inline error, but the world
  itself does not explain a rejected plot. Crystal affinity is only a positive
  proximity bonus.
- All buildings are one tile, cannot be removed, and cannot be upgraded.
- Blueprints have a fixed cost/income; Lantern House's Beacon discount is the
  only placement-adjacent decision.

**Impact**

The map is a free grid rather than a place with rules. Players cannot fix a
mistake, react to a bad opening, or specialise a district. Minerals and
characters are scenery with no relationship to the town.

**Suggested direction**

Add a `PlacementPolicy` returning `{ ok, reason, cost }` for terrain,
occupancy, minerals, characters, and blueprint-specific constraints. Feed the
same reason into the dialog and a short HUD toast. Add a `Demolish` action with a
partial refund and a confirmation, then an upgrade path for at least one
blueprint. Cover policy reasons and refunds with scenario assertions.

### 2. Screen lifecycle and HUD inertness

**Evidence**

- All five screens are constructed once, appended permanently, and toggled with
  `display`. They have no `destroy`, listener teardown, or focus manager.
- `BuildModal` now has a scrim, `role="dialog"`, a focus trap, focus restore,
  Escape/Enter handling, and an input-manager lock. The rest of the HUD is
  visually blocked by the scrim but is still in the accessibility tree and can
  be read by a screen reader.
- Menu/Lobby/End transitions rely on the state wrapper to hide the HUD; there is
  no shared overlay stack or `inert` manager.

**Impact**

The build dialog is usable with a keyboard, but a screen-reader user can still
reach the HUD behind it. Future screens or nested overlays will need another
one-off wrapper. Teardown remains impossible without leaks.

**Suggested direction**

Introduce an `OverlayManager`/focus scope that applies `inert` to the underlying
screen, stacks dialogs, and restores focus centrally. Give screens an optional
`destroy`, and route all show/hide through the manager. Keep the current
`data-testid` hooks stable.

### 3. Keyboard placement and small-screen interaction

**Evidence**

- Building placement requires a pointer/touch tap on the canvas. There is no
  keyboard cell cursor, no keyboard confirmation of a target, and the canvas is
  not exposed as a meaningful control to assistive tech.
- Menu buttons have visible focus rings and `viewport` now allows zoom
  (`maximum-scale=5`), and the HUD reflows at 860/620 px. The mobile scenario
  captures 390×844 but does not run a full touch interaction suite.
- The HUD still has small text at the 620 px breakpoint (9–10 px mono labels).

**Impact**

Keyboard-only players can build only by using the pointer. Touch controls are
verified by the code path and screenshots, not automated gestures. Some labels
are below comfortable mobile reading size.

**Suggested direction**

Add a keyboard cursor that moves a highlighted grid cell, opens the dialog with
Enter, and uses arrow keys plus Escape. Announce selection with an `aria-live`
region. Add a touch scenario for one-finger pan and tap-to-build. Raise mobile
label sizes to at least 11 px where space allows.

### 4. NPC navigation is steering-only

**Evidence**

- `NPCController.isWalkable()` tests the destination against the home sector and
  occupied building cells. When blocked it applies separation and steers toward
  the island centre.
- There is no navigation graph, pathfinding, or spawn reservation. Two NPCs can
  converge on the same narrow point; a building placed across a narrow neck can
  trap a wanderer until it picks a new heading.
- No NPCs currently path between islands or use buildings.

**Impact**

The crowd stays on land and out of buildings (verified over 3,600 updates), but
movement is ambient rather than simulated. A future NPC job system should not be
built on the current steering layer without a path plan.

**Suggested direction**

Add a coarse land grid or navigation graph per sector, mark occupied cells, and
choose wander targets from connected cells. Use simple A* or flow fields for
longer trips. Keep the current steering as local avoidance, not the whole plan.

### 5. WebGL context loss is not handled

Headless Firefox occasionally logs “WebGL context was lost” from Pixi. Smoke
screenshots still render and the run passes, but there is no
`webglcontextlost`/`webglcontextrestored` handling or fallback renderer. In a
real browser this can leave a blank canvas until reload. Add a listener that
surfaces a reload prompt, or recreate the renderer/application, and treat the
headless warning as environment noise only when screenshots confirm rendering.

### 6. Save schema migration, export and import

`SaveManager` writes `falesc.save.v1` and discards unknown versions. There is no
migration path, no export/import JSON, and no “clear save” command in the UI.
A future schema change will intentionally reset saves rather than migrate them.
Add explicit migrations when fields change, and expose Export/Import in the
charter menu for debugging and backups.

### 7. Multiplayer placeholder

The menu keeps a disabled **Multiplayer — soon** button. There is no transport,
lobby, or authority model, and `GameStateManager.players` stays empty. Keep the
button disabled until there is a real implementation; do not make it open an
alert.

### 8. Minor teardown and cleanup

- `InputManager.destroy()` exists but is never called; `Camera` has no destroy
  for its window/document listeners. Both are singletons today.
- For crystals, the initial empty `mainG` remains a child of the mineral
  container forever; it is empty and harmless.
- The survey chart updates every third frame; that is fine for orientation but
  more often than necessary.
- `EndScreen` uses safe text nodes for numbers, but the layout is not tested
  against long user-provided names.
- There is no audio subsystem.

### 9. Visual regression is still not enabled

The world geometry, character palettes/proportions, mineral variation, and NPC
decision seeds are deterministic per seed, but animation phase and NPC positions
still depend on elapsed frame time. A full-viewport baseline would be flaky.
`#minimap` or the build dock could be baselined once the visual flow is settled;
see [testing.md](testing.md#8-visual-regression-not-enabled).

## Fixed during the Prism Tide overhaul

These were found and fixed during the design/engine overhaul:

- **Map packing and world bounds.** Islands are generated once from local
  silhouettes, packed by actual AABB bounds, never regenerated after packing, and
  placed in a world rectangle derived from the cluster. A 72-map regression
  checks non-overlap, containment, and determinism.
- **NPCs and terrain.** Characters have a home sector, test the sector shape and
  occupied building cells before moving, apply simple separation, and steer back
  toward land. A 3,600-update scenario verifies they stay on land and out of
  buildings.
- **Save/load.** Versioned localStorage save of settings, day, lumen, actions,
  buildings, selected blueprint, and camera; menu Continue; autosave after builds
  and tides; save cleared on end. Persistence scenario covers reload/continue.
- **Turn timing.** Both uncancelled timeouts were replaced by one
  `TurnScheduler` owned by the state manager. A stale timer cannot return the
  game to play after leaving. Engine scenario covers leaving mid-interstitial.
- **Economy and objective.** Lumen, three blueprints, dynamic Beacon discount,
  victory/defeat, a real end record, and a full victory scenario.
- **Camera clamp.** `Camera.setBounds()` derives a fit zoom and clamps pan/zoom
  to the cluster plus water margin; engine scenario verifies both extremes.
- **Determinism.** Map shapes, character palettes/proportions, mineral
  variations, and NPC decisions use seeded RNG streams. A reload-determinism
  scenario compares generated content.
- **Dead code and dependency.** Removed unused `src/UI.js`, the orphan character
  renderer helpers, and the `lil-gui` import-map entry/vendor files.
- **Pause behind overlays.** The crowd, character, mineral, and building
  simulation only runs while `PLAYING` and the document is visible; the camera
  and survey chart continue.
- **Map allocation.** Each island is created once instead of three times.
- **UI/UX overhaul.** Local OFL fonts, sunset scene, paper/ink/coral visual
  system, illustrated HUD, blueprint dock, framed survey chart, themed menu,
  lobby, interstitial, end screen, build dialog, mobile reflow, and visible focus
  styles. See [design-vision.md](design-vision.md).
- **Modal and focus.** Backdrop, focus trap, focus restore, Escape/Enter, input
  manager lock, affordability/unique validation reasons.
- **Keyboard/narrow-screen basics.** `maximum-scale=5`, focus-visible styles,
  `aria-live` day/lumen, HUD reflow, and a mobile screenshot scenario.
- **World presentation.** Foam, water shadow, cliffs, sand grade, warm grid,
  procedural palms/grass/flowers/pebbles, four illustrated building silhouettes,
  and a transparent canvas over the illustrated Glass Sea.
- **Build packaging.** Zero-build architecture retained; no runtime network
  requests; local font licenses and vendor file included.

## Updating this document

When you fix something here:

1. Move the entry to “Fixed during the Prism Tide overhaul” (rename that section
   if the context changes) or delete it if it is no longer relevant.
2. Update the summary table and any cross-references in
   [architecture.md](architecture.md), [testing.md](testing.md), or
   [gameplay.md](gameplay.md).
3. Add or update a test when the issue is testable. If it cannot be tested yet,
   explain why in the entry.
