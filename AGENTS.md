# AGENTS.md

FALESC is a zero-build, single-page isometric city-builder: vanilla ES modules,
Pixi.js 7 (WebGL), DOM overlays for menus, and no backend. The entry point is
`index.html` → `src/App.js` (a three-line entrypoint) → `src/FalescGame.js` (the
application coordinator). Dependencies are vendored under `vendor/` and resolved
through the import map, so the game runs offline with no install or bundling
step.

The current build is the **First Light vertical slice** of **FALESC: The
Confluence** — floating shards in a warm nebula void, coral/mint/cream UI, local
Fraunces/Jost/Space Mono fonts, and a lumen economy made from residents'
wellbeing. Read [docs/design-vision.md](docs/design-vision.md) before making
visual changes; the palette, typography and paper/ink chrome are the guardrail
against generic dark-dashboard styling. The sea/beach/open-air-plant imagery in
that document is prototype-era; the current world is the void described in
[docs/design/world.md](docs/design/world.md).

**Design direction.** The refined design — resident needs, service buildings,
planning plus playback, care-based competition and the Confluence — is
substantially implemented across a home shard and a Contest commons isle, including a **Contest preview**
with two AI rivals, a shared lumen economy, shared residents, rival housing,
recovery and need-pressure builds, Devotion standings, a patronage-flow overlay,
a final campaign, pledge and Confluence vote, a post-vote stewardship promise and
a fundable shared Commons Beacon that becomes a six-seat all-needs civic service,
transient day visitors who pay for service visits, and a two-module service retrofit. The full multi-round festival, auctions, deeper legacy effects, deeper rival
strategy, true stacked floors and multiplayer are not. Read [docs/design-refinement.md](docs/design-refinement.md)
and [docs/design/roadmap.md](docs/design/roadmap.md) before changing the loop.

## Start here

```bash
npm run dev          # static dev server, default http://127.0.0.1:5173/
npm run check        # syntax, local import resolution, import-map targets
```

Browser verification from this workspace (shared harness):

```bash
webgame_smoke
webgame_smoke --scenario scripts/scenarios/keyboard-cursor.mjs
webgame_smoke --scenario scripts/scenarios/resident-day.mjs
webgame_smoke --scenario scripts/scenarios/economy.mjs
webgame_smoke --scenario scripts/scenarios/persistence.mjs
webgame_smoke --scenario scripts/scenarios/determinism.mjs
webgame_smoke --scenario scripts/scenarios/engine-regression.mjs
webgame_smoke --scenario scripts/scenarios/contest.mjs
webgame_smoke --scenario scripts/scenarios/contest-recovery.mjs
webgame_smoke --scenario scripts/scenarios/confluence-defeat.mjs
webgame_smoke --scenario scripts/scenarios/campaign.mjs
webgame_smoke --scenario scripts/scenarios/contest-season.mjs
webgame_smoke --scenario scripts/scenarios/commons.mjs
webgame_smoke --scenario scripts/scenarios/visitors.mjs
webgame_smoke --scenario scripts/scenarios/visitor-stay.mjs
webgame_smoke --scenario scripts/scenarios/visitor-return.mjs
webgame_smoke --scenario scripts/scenarios/commons-assembly.mjs
webgame_smoke --scenario scripts/scenarios/commons-purse.mjs
webgame_smoke --scenario scripts/scenarios/retrofit.mjs
webgame_smoke --scenario scripts/scenarios/service-floors.mjs
webgame_smoke --scenario scripts/scenarios/service-hours.mjs
webgame_smoke --scenario scripts/scenarios/bathhouse.mjs
webgame_smoke --scenario scripts/scenarios/building-finishes.mjs
webgame_smoke --scenario scripts/scenarios/commons-isle.mjs
```

The CLI equivalents and the full scenario list are in
[docs/testing.md](docs/testing.md). Run `npm run check` and the main smoke test
after any behavioural change.

## What lives where

| Path | Responsibility |
| --- | --- |
| `index.html` | Import map, local font preloads, warm nebula void backdrop |
| `styles/main.css` | Design tokens, scene, chrome, all screen/HUD/modal styles |
| `assets/fonts/` | OFL woff2 fonts + licenses (no runtime CDN) |
| `src/App.js` | Pure entrypoint: `new FalescGame()` |
| `src/FalescGame.js` | Coordinator: charter lifecycle, screens/modals, day playback, save, debug API, ticker |
| `src/world/World.js` | Pixi application, layered scene, camera/input, map and mineral generation |
| `src/world/PatronageFlow.js` | World-space arcs from homes to residents' last choices |
| `src/charter/Charter.js` | The run model: day, player chapter, rivals, roster, services, reports, ending |
| `src/chapters/` | `RivalChapter` and doctrine-driven `RivalAI` for the Contest preview |
| `src/confluence/` | Campaign, pledges, stewardship and the deterministic Confluence vote |
| `src/commons/` | Commons Assembly policies and shared service modifiers |
| `src/design/` | Needs, traits, five service programs, balance table, names |
| `src/services/` | `ServiceBuilding`, `ServiceManager`, `PlacementPolicy` |
| `src/simulation/DaySimulator.js` | Deterministic day: needs, choices, queues, visits, report |
| `src/economy/LumenLedger.js` | Contributions from wellbeing, upkeep, closures |
| `src/residents/` | `Resident` model, seeded resident/visitor factories, visual agent, crowd |
| `src/navigation/IslandNavigator.js` | Per-island A* to service doors |
| `src/state/` | `GamePhase` constants and `ScreenStateMachine` |
| `src/screens/` | DOM screens: menu, lobby, game HUD, day strip, report, Confluence, stewardship, end |
| `src/ui/` | Shared `OverlayManager`, build/service/bulletin/campaign/commons/resident/visitor modals, standings, survey chart, chatter, icons |
| `src/map/` | Seeded single-pass island generation, packing, grids, sector art, paths |
| `src/character/`, `src/Character.js` | Procedural chibi rig and animation |
| `src/minerals/` | Seeded static rock/crystal scenery |
| `src/buildings/BuildingRenderer.js` | Service silhouettes (art only; no building model) |
| `src/persistence/SaveManager.js` | Versioned `localStorage` save v2 (model data only) |
| `scripts/scenarios/` | Browser regressions for the resident/visitor loop, economy, saves, maps, determinism, victory, mobile |
| `vendor/` | Pinned Pixi.js build and license (committed; no fetch at runtime) |
| `webgame.config.json` | Main browser smoke configuration and steps |

## Ground rules

- **Keep the zero-build architecture.** Do not add a bundler, framework, or
  runtime CDN imports without an explicit request. Native ES modules and the
  import map are the deployment model. There is no npm dependency at runtime.
- **Pixi is v7.** `new PIXI.Application(...)` and `app.view` are synchronous. A
  v8 upgrade requires changes in `World.js`/`Camera.js`; do not bump it casually.
- **Canvas is transparent.** The warm nebula void is a DOM/SVG backdrop behind
  the Pixi canvas. Do not set an opaque renderer background without redesigning
  the scene.
- **Respect the model/view split.** The charter, day simulation, economy and
  resident model are plain JavaScript; DOM screens read the charter and never
  own the rules. `ServiceBuilding` owns its Pixi container, and `World` owns the
  scene. The Pixi ticker drives updates; only `PLAYING` runs ambient planning
  behaviour and only `DAY` runs playback, and updates freeze while the tab is
  hidden (`dt = 0`).
- **The day is precomputed, not real-time.** `FalescGame.openDay()` runs
  `DaySimulator` once; playback at 1×/2×/4× is a view over the finished events
  and report. Do not add wall-clock simulation or move rules into the render
  loop.
- **No gameplay timers.** Day timing is ticker-driven. The only `setTimeout` is
  the HUD toast; focus moves use `requestAnimationFrame`. Do not add
  `setTimeout`/`setInterval` for simulation.
- **One home shard plus one commons isle.** Contest placement also accepts the
  marked second sector (`map.commonsSector`) via `map.commonsEnabled`; every
  other island remains scenery. Do not make further islands buildable without
  their own navigation and ownership.
- **Keep generated output out of git.** `.artifacts/`, `node_modules/`, logs and
  local env files are ignored. Scenarios are source; screenshots are not.
- **Test after changes.** `npm run check` catches broken imports and syntax; the
  smoke test catches the main flow. Scenario files cover the engine and design
  regressions.
- **Use the debug surface.** From the browser console:
  `window.__falesc.snapshot()`, `findFreeCell(programId)`,
  `worldToScreen(x, y)`, `saveGame()`, `continueGame()`,
  `selectProgram(id)`, `openDay()`, `skipDay()`, `showResidents()`,
  `togglePatronage()`, `showCampaign()`, `showCommons()`, `showConfluence()`,
  `showStewardship()`. The full game object is
  `window.__falesc.app`.
- **Do not reintroduce dead sandbox UI.** `src/UI.js` and `lil-gui` were
  removed; the service dock is the real build UI.

## Key conventions

- ES modules with explicit `.js` extensions in relative imports.
- Four-space indentation and semicolons, matching the existing source.
- DOM screens own their structure; shared visual language lives in
  `styles/main.css` with classes, not inline CSS. Tests rely on `data-testid`.
- World distances are in pixels; grid cells are `TILE_WIDTH × TILE_HEIGHT`
  (512 × 256); camera zoom is clamped to the generated world.
- Tuning lives in `src/design/balance.js`; service data in
  `src/design/programs.js`; needs in `src/design/needs.js`; traits in
  `src/design/traits.js`. Do not scatter balance literals through the
  simulation.
- First Light starts with **6 of 15 residents**, **10 lumen**, **2 works/day**,
  and a fixed six-bed **Welcome Post**. The Contest starts with **9 residents**
  (three per chapter), **15 lumen** per chapter, and a four-bed Welcome House per
  chapter. Contest chapters also receive a **1 lumen per resident per day civic
  dividend**. Services cost 4–6 lumen and one work, and take one day to open
  (`PENDING → ACTIVE`). Only `ACTIVE`, open services accept visits and pay
  upkeep.
- Lumen comes from resident wellbeing, not harvest tiles. Upkeep is paid at the
  end of the day; a shortfall closes services in the order wonder → company →
  sustenance (housing is exempt). Closed services can be reopened for lumen.
- Do not change the economy or the First Light goals (12 residents, flourishing
  62, day limits 12/14/16) without updating `victory.mjs`, `economy.mjs`,
  `resident-day.mjs` and [docs/gameplay.md](docs/gameplay.md).
- Save schema is v2 under `falesc.save.v2` (including `mode` and `rivals`).
  Change the version and document the reset when the schema changes; never
  half-load an old save.
- Placement occupancy is shared across player and rival chapters. Do not give a
  chapter its own private occupancy map or services will overlap. Contest
  arrivals go to the least-crowded chapter with room before Devotion breaks a
  tie; do not make arrivals pile onto the leader.
- The Contest home grid is deliberately larger (7×7 small, 8×8 medium, 9×9
  large) so three chapters can build for a full season.
- Rival chapters pay construction costs and upkeep, receive contributions from
  their own residents, own fixed Welcome Houses, reopen services lost to
  shortfalls, and choose builds by need pressure plus doctrine. The last three
  days run a campaign: a seeded three-event festival programme makes matching
  promises more magnetic, rivals publish promises, the player chooses one, and
  the final vote uses both. A player victory then chooses one of four stewardship
  promises for the epilogue; a rival winner skips that choice. A shared Commons
  Beacon can be funded by every chapter; once lit it gives every resident a
  nightly comfort and opens as a six-seat all-needs shared service. Contest days
  also bring 2–3 transient visitors who use services, pay 1 lumen per visit and
  leave before the next day. A charmed visitor with a spare bed can be invited
  from the report into a one-day trial stay; a trial guest holds a bed but does
  not contribute or vote until they pass. Charmed visitors who are not invited
  may return on later days (up to two). Clicking a visitor's name opens
  their card with traits, needs, affinity and last door. Once the Beacon is lit, the
  first Commons Assembly lets residents petition, each chapter nominate and
  residents vote; the winner becomes one shared policy (`src/commons/CommonsPolicies.js`,
  `CommonsBallot.js`). One second reading can amend it after a full day. An open player service can hold up to two retrofit
  modules (6–7 lumen each) from Sunroom, Atelier and Night Kitchen. The
  service record owns the action and the module is saved. Open services can also
  choose As built, Round the clock, Daylight or Evening hours. The five buildable
  services include the 2×2 Bathhouse for Rest + Company. A build chooses a
  Humble, Comfortable or Grand shell finish. An open service can add two
  floors for capacity and upkeep. In Contest, a second
  commons isle is buildable and residents reach it through reserved shuttle gates.
  This is a first pass; a fuller archipelago, a larger multi-round festival,
  auctions, shared capital budgeting and deeper legacy effects are still
  missing.
- The main Pixi canvas is WebGL. The harness samples `#minimap` (2D) instead; do
  not remove the survey chart without adjusting `canvasSelectors` and the smoke
  test.
- Fonts are local and licensed. Add new fonts under `assets/fonts/` with their
  OFL license and an `@font-face` rule; never add a font CDN.

## Where to read more

- [docs/design-refinement.md](docs/design-refinement.md) — refined design overview, pillars, decisions, scope
- [docs/design/](docs/design/) — component docs: residents, buildings, economy, competition, world, implementation, roadmap, decisions
- [docs/design-vision.md](docs/design-vision.md) — identity, palette, typography, UX guardrails
- [docs/architecture.md](docs/architecture.md) — detailed runtime and system design
- [docs/development.md](docs/development.md) — local setup, vendoring, common tasks
- [docs/testing.md](docs/testing.md) — checks, smoke test, scenarios, manual checklist
- [docs/gameplay.md](docs/gameplay.md) — controls, needs, services, day loop, economy, victory
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
