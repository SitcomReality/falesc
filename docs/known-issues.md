# Known issues and technical debt

> **Context:** this is the **First Light vertical slice** — one playable home
> shard, four needs, four services, planning/playback/report, and a solo
> chapter. The refined design is in [design-refinement.md](design-refinement.md)
> and the build order in [design/roadmap.md](design/roadmap.md). Issues below
> are current limitations of this build, not of the target design.

This is a living list. When something is fixed, move it to the fixed section and
update the summary table and any tests/docs that referenced it.

Severity is about impact on the slice, not effort:

- **High** — visibly wrong behaviour, lost work, or a blocker for the next
  feature.
- **Medium** — real limitation or maintainability risk with a workaround.
- **Low** — cleanup, edge case or environment-specific annoyance.

## Summary

| # | Severity | Issue |
| --- | --- | --- |
| 1 | Medium | Balance is generous and untuned |
| 2 | Medium | Only the home shard is playable; there is no archipelago layer |
| 3 | Medium | No building layers, retrofit, modules, finishes or player-set policy |
| 4 | Medium | No rivals, standings, patronage flow or Confluence vote |
| 5 | Medium | No keyboard build cursor; plot choice is pointer/touch only |
| 6 | Medium | Day playback is a replay of an already-resolved day; no mid-day decisions |
| 7 | Low | Save v1 is discarded, a mid-`DAY` reload loses the day, and there is no export/import |
| 8 | Low | The resident card stops at the last choice; no portrait or visit history |
| 9 | Low | Overlay/focus management is still per-modal rather than a shared stack |
| 10 | Low | Crowd movement has no local avoidance |
| 11 | Low | No audio, and the multiplayer button remains a disabled placeholder |
| 12 | Low | WebGL context loss is not handled |
| 13 | Low | Visual regression is not enabled and no baseline is committed |
| 14 | Low | Minor teardown and cleanup gaps remain |

## Open issues

### 1. Balance is generous and untuned

**Evidence**

- Six residents typically contribute 6 lumen against a 1-lumen Welcome Post
  upkeep; the current medium victory run closes on day 4 with 24 lumen in hand.
- Arrivals (up to two per day) and housing are usually affordable, and the
  opening sequence can build Canteen + housing, then housing, then Garden Dome +
  Tea House without a hard budget choice.
- Early victory now closes the charter as soon as the goals are met, so the
  surplus does not accumulate across fourteen days — but the first four days
  still do not force a sacrifice.
- `BALANCE` centralises the numbers, but there is no tuning pass against a
  target difficulty curve, and some values (`devotion.decayTowardNeutral`,
  `devotion.maxAffinity`/`minAffinity`) are declared without being read.

**Impact**

The care decisions are legible, but the budget rarely forces a hard choice
between services. The intended pressure — who gets the last lumen — is weaker
than the design wants.

**Suggested direction**

Tune contributions, upkeep, construction costs, works or arrivals against
recorded runs until at least one of the four First Light services has to be
delayed or traded off. Remove or wire the unused affinity knobs. Keep
`victory.mjs` as the end-to-end guard, and add a tighter "close run" scenario
when the curve is chosen.

### 2. Only the home shard is playable

**Evidence**

- `PlacementPolicy.evaluatePlacement()` rejects any sector other than
  `map.homeSector` with "The chapter can only build on its home island for now."
- `FalescGame.findGridTarget()` only projects into the home sector.
- Other generated islands have scenery and minerals but no buildable grid
  interaction, services, transit or residents.

**Impact**

The archipelago is a beautiful backdrop, not a place. There is no commons, no
rival neighbourhood, no transit and no reason to look at the other shards once
the camera has settled on the home shard.

**Suggested direction**

Keep the home shard as the Phase 1 scope, but make the boundary explicit in the
lobby and HUD. The next step is the Phase 2 shared commons, not quietly enabling
placement on scenery. Add a second buildable sector only with its own
navigation, ownership and camera affordances.

### 3. No building layers, retrofit, modules, finishes or player-set policy

**Evidence**

- The four buildable programs are fixed compositions. `ServiceBuilding` stores
  `finish` and `policy`, but the player never chooses them; they come from
  program defaults and are only used by scoring.
- There are no shells, floors, modules, adjacency resonance, district identity
  or retrofit UI.
- Footprints are `1×1` except the Garden Dome's `2×2`; entrance validation is a
  single free door cell, not multi-cell entrance/queue design.
- The service record can dismantle and reopen, but not upgrade or remodel.

**Impact**

Two canteens are the same canteen. The spatial/combination depth the refined
design promises is absent, and `finish`/`policy` fields risk looking implemented
when they are not.

**Suggested direction**

Add player-facing finish and policy first (they already affect scoring and need
no new geometry), then modules, then shells/retrofit. Keep the "no spreadsheet"
test: every option must show up in a resident's choice or the report. Extend
`ServiceCardModal` and the placement preview before adding more programs.

### 4. No rivals, standings, patronage flow or Confluence vote

**Evidence**

- The bulletin has three items and never a rival move; there is no rival
  chapter model, AI, standings card or survey overlay for patronage.
- The Commons Beacon program (`buildable: false`) and its art exist as endgame
  data, but the shared commons and vote do not.
- The menu's Multiplayer button is disabled; no networking or authority model
  exists.
- D1/D3/D4 in [design/decisions.md](design/decisions.md) deliberately defer
  these to Phase 2/4.

**Impact**

The game is a solo care sandbox. There is no competition for residents and no
final social judgment; the word "Confluence" currently lives in the subtitle and
copy, not in mechanics.

**Suggested direction**

Follow [design/roadmap.md](design/roadmap.md): one shared central island with two
AI chapters, shared residents, a standings card and one rival bulletin item
before any vote. Do not add auctions or human multiplayer early.

### 5. No keyboard build cursor

**Evidence**

- Arm and open-day keys work (`1`–`4`, `E`, `B`, `R`, Escape).
- The build dialog is fully keyboard-accessible (focus trap, Enter, Escape), but
  choosing a plot requires a pointer/touch tap on the canvas.
- The canvas is not exposed as a meaningful grid control to assistive tech; the
  hover highlight has no keyboard equivalent.

**Impact**

A keyboard-only player can open dialogs but cannot place a service. The canvas
also lacks a screen-reader-readable grid summary.

**Suggested direction**

Add a focused cell cursor with arrow movement, a visible highlight, Enter to open
the build dialog, and an `aria-live` cell description. Keep the canvas out of the
tab order until that exists; route focus through a real grid control. Add a
keyboard-only scenario once implemented.

### 6. Day playback is a replay of an already-resolved day

**Evidence**

- `FalescGame.openDay()` calls `charter.openDay()` (which runs `DaySimulator`,
  applies needs, visits and `LumenLedger`) before the `DAY` screen appears.
- Playback only advances a clock over precomputed events; speed and Skip change
  presentation, not outcomes.
- There is no pause-and-intervene, policy change, mid-day build or live queue
  management.

**Impact**

This is a deliberate design decision (D2), not a bug, but it limits the sense of
a living day: the player cannot react to a bad queue or a closed door until the
next planning phase. It also means the report is decided before the visuals play.

**Suggested direction**

Keep the deterministic precompute for testability, but make the framing clear in
the day strip and docs. If playtests want pressure, add a pause/inspect moment or
a next-day consequence, not a real-time simulation. Revisit D2 only with
evidence.

### 7. Save v1 is discarded; a mid-day reload loses the day

**Evidence**

- `SaveManager` uses `falesc.save.v2`, removes `falesc.save.v1` on read, and
  clears unknown versions instead of migrating.
- `FalescGame.saveGame()` writes in `PLAYING` and `REPORT`, so reloading on the
  report restores it. Reloading during `DAY` returns to the last planning save
  and loses that day's result.
- There is no export/import, backup or UI "clear save" action.

**Impact**

The reset is intentional and documented, but a mid-playback reload can lose the
day the player just watched. Save migrations will remain manual until a schema
is stable.

**Suggested direction**

Keep the v2 clear-on-mismatch rule until the schema settles. If mid-playback
reloads prove common, stage the report before `DAY` starts. Add Export/Import in
the charter menu for debugging and backups when the format stabilises.

### 8. The resident card stops at the last choice

**Evidence**

- `Resident.memory.recentVisits` keeps up to eight visits, but
  `ResidentCardModal` renders only `memory.lastChoice`.
- The card has needs, traits, home, Devotion, wellbeing and the why line; it has
  no portrait, mood illustration or recent-history list.
- There is no per-resident relationship view with other residents or services.

**Impact**

The "why" is legible, but the person is still mostly a set of bars. The design's
"little people are the game" pillar would benefit from a stronger face and a
short history.

**Suggested direction**

Add a small current-mood portrait and a recent-visits list (the data is already
saved). Keep the card scannable: one reason, one face, three recent doors.

### 9. Overlay/focus management is per-modal

**Evidence**

- `BuildModal`, `ServiceCardModal`, `BulletinModal` and `ResidentCardModal` each
  duplicate scrim, focus trap, `inert` HUD handling and focus restore.
- There is no shared overlay stack, no nested-dialog ordering, and no central
  `destroy` for screens. `ScreenStateMachine` only shows/hides.
- The HUD is marked `inert` while a modal is open, which is an improvement over
  the old prototype, but the pattern will not scale to more overlays.

**Impact**

The current four overlays work and are testable, but a fifth or a nested
confirmation would be another copy. Screens are permanent objects with no
teardown.

**Suggested direction**

Introduce a small `OverlayManager`/focus scope that owns the active dialog,
applies `inert`, stacks modals and restores focus. Give screens an optional
`destroy`. Keep the current `data-testid` hooks stable.

### 10. Crowd movement has no local avoidance

**Evidence**

- `IslandNavigator` A* paths are computed per visit; agents follow the
  precomputed points.
- There is no separation force, collision radius, queue slot reservation or
  crowd steering during playback. Queue points are small offsets from the door.
- The day simulator models capacity and queue load, not physical bodies, so two
  residents can stand in the same spot.

**Impact**

The timeline reads well at normal zoom, but crowds can overlap and queue
visuals are approximate. This is cosmetic today because occupancy is hidden
inside services and queues are short.

**Suggested direction**

Keep model queues authoritative. If visual crowding becomes a problem, add
simple local avoidance or queue-slot positions in `ResidentAgent`; do not add a
second physical simulation that disagrees with the report.

### 11. No audio; multiplayer is a placeholder

- There is no audio subsystem, music or SFX.
- The menu keeps a disabled **Multiplayer — later** button. There is no
  transport, lobby or authority model; D1 deliberately keeps human multiplayer
  later.

Keep the button disabled until it is real; do not make it open an alert.

### 12. WebGL context loss is not handled

Headless Firefox occasionally logs "WebGL context was lost" from Pixi. Smoke
screenshots still render and the run passes, but there is no
`webglcontextlost`/`webglcontextrestored` handling or fallback renderer. In a
real browser this can leave a blank canvas until reload. Add a listener that
surfaces a reload prompt, or recreate the renderer/application, and treat the
headless warning as environment noise only when screenshots confirm rendering.

### 13. Visual regression is not enabled

The world geometry, roster, traits and mineral variation are seeded, and the day
simulation is deterministic, but character animation phase, ambient chatter and
minimap timing still depend on elapsed frame time. A full-viewport baseline would
be flaky, and none is committed. `#minimap` or the service dock could be
baselined once the ambient flow is settled; see
[testing.md](testing.md#8-visual-regression).

### 14. Minor teardown and cleanup

- `InputManager.destroy()` exists but is never called; `Camera` has no destroy
  for its window/document listeners. Both are singletons today.
- For crystals, the initial empty `mainG` remains a child of the mineral
  container forever; it is empty and harmless.
- The survey chart updates every third frame; fine for orientation, more often
  than necessary.
- `EndScreen` uses safe text nodes for numbers, but long user-provided service
  names are not layout-tested.
- Some `BALANCE` values are unused (see issue 1).
- Services are created with `finish`/`policy` fields that no UI can change yet
  (see issue 3).

## Fixed in recent slices

These are no longer open:

- **The Prism Tide loop was removed.** No income tiles, crystal-affinity
  economy, Aurora Beacon victory, `PENDING → RESERVED → ACTIVE` construction,
  `GameStateManager`, `TurnScheduler`, `BuildingManager` or 1.9-second
  interstitial.
- **Residents are people, not ambient NPCs.** A seeded 15-name roster, six
  founders, traits, needs, affinity, memory, a deterministic choice, queues,
  enter/exit playback and a one-line "why". `NPCController` and the steering
  crowd were replaced by `ResidentAgent`/`ResidentCrowd` and
  `IslandNavigator` A*.
- **Services have doors and rules.** Four buildable programs, footprints,
  capacity, opening hours, upkeep, visits/hearts, construction, closure,
  reopening and a real placement policy. `PlacementPolicy` returns `{ ok, reason }`
  for UI and tests.
- **The economy is civic energy.** Contributions from resident wellbeing,
  upkeep, shortfall closure order, reopening, and a report that explains it.
- **The day is deterministic and legible.** `DaySimulator` precomputes a day;
  playback at 1×/2×/4× is a view; the morning bulletin and evening report carry
  the story.
- **Save v2.** Residents, services, needs, affinity, last choice, door state and
  closure survive a reload; v1 is intentionally discarded.
- **Departures and returns.** Homeless nights and chronic high needs now remove residents from the model and the shard; the next bulletin and the report announce arrivals/departures, and the population defeat is reachable.
- **Save round-trip hardening.** Resident affinity, departures and service ids restore correctly; structurally invalid v2 payloads are rejected instead of half-loaded.
- **Evening report persistence.** The report is saved in `REPORT` and reopens after Continue instead of replaying the day.
- **Safer destructive actions.** Abandoning a charter is a two-step confirmation
  and the save is cleared only after the confirmation.
- **Truthful choice feedback.** "I come here often" is per resident, "open late"
  uses the actual phase, queue give-ups are visible in the resident card, and
  full services are re-evaluated before a resident gives up.
- **The world reads as FALESC.** Warm nebula backdrop, floating shards with deep
  keels, crystal veins, cables and debris, vacuum props, no sea/beach/open-air
  plants, Garden Dome glasshouse, airlocks, and a Commons Beacon silhouette as
  endgame art.
- **Map and engine regressions remain.** Actual-shape island packing, camera
  clamp, seeded determinism, survey-chart navigation and clean phase exit are
  covered by scenarios.
- **Modals and input.** Focus traps, Escape/Enter, `inert` HUD, input-manager
  modal lock, keyboard service shortcuts and a mobile reflow.
- **Dead code and dependency.** `src/UI.js`, `lil-gui`, the old game-state
  manager, turn scheduler, building manager/model, blueprints and NPC stack were
  removed; the zero-build architecture remains.

## Updating this document

When you fix something here:

1. Move the entry to "Fixed in recent slices" (rename the section if the context
   changes) or delete it if it is no longer relevant.
2. Update the summary table and any cross-references in
   [architecture.md](architecture.md), [testing.md](testing.md) or
   [gameplay.md](gameplay.md).
3. Add or update a test when the issue is testable. If it cannot be tested yet,
   explain why in the entry.
