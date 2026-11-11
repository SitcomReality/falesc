# Implementation — building the refined design on the current engine

> **Status note (2026-11-11):** most of this plan now exists in the First Light
> slice: `ServiceManager`, `PlacementPolicy`, `DaySimulator`,
> `IslandNavigator`, `Resident`/`ResidentAgent`/`ResidentCrowd`, the bulletin,
> resident/service cards, day report and save v2. Sections 4–6 are retained as
> the original plan and test rationale; §5's description of the "current
> engine" and the migration order in §7 are historical. Rivals, layers,
> scenarios, the Confluence and multiplayer remain unbuilt. For the shipped
> architecture start at [architecture.md](../architecture.md).

> Related decisions: [D1](decisions.md#d1--single-player-first-solo-vs-ai-is-the-first-competitive-build)
> (solo first), [D2](decisions.md#d2--planning-plus-playback) (playback),
> [D8](decisions.md#d8--no-real-time-networking-in-the-first-version) (no
> real-time networking).
>
> The engine is not the problem. The map generator, packing, camera, character
> rig, screens, saves and tests are worth keeping. The work is a new game layer:
> residents, services, needs, day simulation and a new HUD.

---

## 1. New models

```text
Chapter
  id, name, colour, doctrine
  lumen, works, hearts
  buildings[]
  promises[]            (Phase 4)

Resident
  id, name
  traits { temperament, standards, rhythm }
  needs { sustenance, rest, company, wonder, care, purpose }
  home { chapterId, buildingId } | null
  affinity { [chapterId]: hearts }
  memory { lastChoice, lastReason, recentVisits[] }
  state, position, schedule

Building
  id, chapterId, sectorId, u, v
  shell { size, floors, style }
  program
  modules[]
  finish
  policy { access, hours, vibe }
  footprint[]
  entrance { u, v }
  capacity, queue[], occupants[]
  visits, hearts
  construction { state, daysRemaining }

Service
  program metadata: need, capacity, duration, appeal, upkeep, quality
  (a data table, not a class if possible)

DayReport
  visits, hearts, complaints, arrivals, departures
  rivalMoves[], events[]
```

Use plain objects and data tables. The zero-build architecture and the existing
save style favour data over class hierarchies.

---

## 2. New systems

- **ResidentBrain** — need decay, schedule, destination utility, "why" string.
- **ResidentAgent** — path to door, queue slot, enter, timer, exit.
- **ServiceManager** — replaces `BuildingManager`; owns doors, queues, occupancy,
  visits and hearts.
- **Navigation** — per-island grid, A* to doors, queue slots, local avoidance.
- **DaySimulator** — deterministic simulated day; produces `DayReport`. Runs
  during playback and in tests.
- **RivalAI** — doctrine-driven build/policy choices with a blind spot (Phase 2).
- **DevotionLedger** — per-resident affinity updates and the final vote.
- **PlacementPolicy** — footprint, terrain, entrance, adjacency, cost; returns
  `{ ok, reason }` for UI and tests.
- **Board/Report UI** — morning bulletin, resident card, building card, day
  report, survey overlay.

---

## 3. Reuse map

| Current | Becomes |
| --- | --- |
| `BuildingManager` | `ServiceManager` (keep build/remove/restore; add queues/occupancy) |
| `NPCController` | `ResidentBrain` + `ResidentAgent` |
| `CrowdManager` | `ResidentManager` (registration, update order, LOD) |
| `resolveTide()` | `DaySimulator.resolve()` |
| `StructureModal` | Building card with retrofit and policy |
| `SaveManager` | v2 schema with chapters/residents/layers |
| `SectorGraphics` | Void island art + vacuum props; garden art moves to buildings |
| `BuildingRenderer` | Shell pass + program/module details; current four as salvage set |
| `CharacterRenderer` | Visor/backpack; hide inside buildings |

Keep the interfaces that tests rely on where possible (`data-testid`, debug
surface) so the regression suite can be updated incrementally rather than
rewritten.

---

## 4. Determinism, save and performance

### Determinism

- Use seeded RNG for resident names, traits and initial needs.
- The day simulation is deterministic given the seed, actions and day number.
- Do not use wall-clock time inside the simulation; the playback is a view over
  a deterministic result.
- Fixed chapter order at resolution.

### Save v2

- Store seed, day, chapters, residents (traits/needs/affinity/home), buildings
  (layers/policy/state/occupancy), lumen, works.
- A prototype reset is acceptable; document it. Do not silently half-load.
- Add migrations when fields change; keep the version check.
- The current `localStorage` approach and autosave cadence are fine.

### Performance

- Target 30–40 residents, 25–40 buildings, 60 fps.
- Throttle pathfinding; cache paths; use queue slots and simple timers.
- Do not pathfind every frame. Recompute when buildings change or a resident
  needs a new destination.
- Use a coarse navigation grid, not a per-pixel graph.
- Keep the render layer's Y-sorting; add buildings and residents to the same
  sorted layer as now.
- Batch UI updates with the existing cache pattern.

---

## 5. Prerequisites

These are not polish; the design fails without them.

### Navigation (#4 in known issues)

The current `NPCController` is steering-only. It tests the destination against
the island shape and occupied cells, then steers toward the centre when blocked.
Buildings are walls. The refinement needs residents to reliably reach a **door**
and a **queue slot**. Build a per-island navigation grid and A* (or a flow field
for common destinations) first.

### Placement policy (#1)

`BuildingManager.isCellOccupied()` checks only other buildings. The refined
design needs footprint checks, terrain/entrance checks, adjacency and a
`{ ok, reason }` result that feeds the UI and tests. Build this before
multi-cell shells.

### Overlay/focus stack (#2)

The morning bulletin, resident card, building card and day report are four new
overlays. The current one-off modal handling will not scale. Introduce a small
`OverlayManager`/focus scope that applies `inert`, stacks dialogs and restores
focus. Keep the existing `data-testid` hooks stable.

### Day state

The current `INTERSTITIAL` is a 1.9-second pause. It becomes a `DAY` state with
a playback clock, speed controls and a skip. The `TurnScheduler` remains the
owner of the timing; do not add `setTimeout` elsewhere.

---

## 6. Test plan

Add scenarios for:

- A resident with a need chooses a service, enters, emerges, and the need
  improves.
- A full service queues residents; they wait and then enter.
- A closed service causes a complaint and a rival visit.
- Day report determinism: same seed + actions = same report.
- Devotion changes only from visits/queues/care, not from time alone.
- Save/load restores residents, needs, affinity and building layers.
- Rival AI builds within the same lumen/works rules (Phase 2).
- Flourishing failure ends the run with no winner.
- Multi-cell placement and entrance/queue validation.
- The existing map, NPC-land, camera, turn-cancel, determinism and victory tests
  are updated or retired with the old loop.

Keep the harness workflow: `npm run check`, `webgame_smoke`, and scenario files
under `scripts/scenarios/`. Add a resident/day scenario as soon as the first
service exists.

---

## 7. Migration order

1. **Visual correction** — void backdrop, remove open-air plants, vacuum props,
   Garden Dome, doors on buildings. No gameplay change.
2. **Resident model + needs + one service** — Canteen with a door, queue,
   enter/exit; a resident card with a "why." This is the vertical slice kernel.
3. **Day playback + report** — replace the 1.9-second interstitial with a
   deterministic day and a report.
4. **Economy swap** — lumen from resident wellbeing; upkeep; construction;
   remove harvest income.
5. **HUD** — Devotion, Flourishing, population, bulletin.
6. **Rivals** — two AI chapters, standings, rival bulletin item.
7. **Layers** — shells, modules, finish, policy, retrofit, footprints,
   adjacency.
8. **Archipelago/scenarios** — outer isles, transit, stewardship/petitions,
   Confluence, Commons Beacon.
9. **Multiplayer** — hot-seat/async, then co-op.

Do not start at 7. The resident/day loop is the proof.

---

## 8. Zero-build constraints

- No bundler, framework or runtime CDN.
- Vanilla ES modules, explicit `.js` extensions, import map for Pixi.
- Local fonts/assets only.
- DOM screens own their structure; shared styles in `styles/main.css` with
  classes, not inline CSS.
- Keep the transparent canvas over the DOM backdrop.
- Keep the debug surface (`window.__falesc`) and extend it with resident/day
  snapshots for tests.

---

## 9. Risks

- **Scope.** The vertical slice must stay small. If it slips, cut programs, not
  the resident simulation.
- **Opacity.** Needs and utility can become a hidden spreadsheet. The "why" card
  and day report are mandatory in Phase 1.
- **Navigation.** Steering-only NPCs will not reliably use doors. Build the nav
  graph before the first service.
- **Performance.** 30–40 residents with per-frame pathfinding will hurt. Cache
  and throttle.
- **Save complexity.** Residents and building layers make the save larger and
  more fragile. Version it and test load.
- **Art drift.** The void can become generic dark space. Use the one-light rule
  and warm palette; review screenshots.
- **Doc drift.** Keep this folder and `design-vision.md`/`gameplay.md` in sync.
  The overview is canonical; component docs are living.

---

## 10. Open questions

1. Is A* per resident enough at 30–40 residents, or do we need flow fields from
   day one? (Start with A* on small grids; measure.)
2. Should the day simulation run in real time during playback, or be precomputed
   and replayed? (Recommend precomputed deterministic ticks, replayed; easier to
   test and skip.)
3. How much of the current `BuildingRenderer` can be reused before a shell
   system is needed? (Wrap the four silhouettes first; shells in Phase 3.)
4. Do we need a separate `ResidentManager` or can `CrowdManager` grow? (Prefer a
   rename plus clear responsibilities.)
5. What is the minimum save migration story for existing prototype saves?
   (Likely reset with a clear message; document it.)
