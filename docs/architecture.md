# Architecture

This document describes how the **First Light vertical slice** boots, updates,
renders and changes state as implemented today. For the refined design target
see [design-refinement.md](design-refinement.md); for setup see
[development.md](development.md); for tests see [testing.md](testing.md); for
the visual system see [design-vision.md](design-vision.md) and
[design/world.md](design/world.md).

## 1. Runtime model

FALESC is a static site with no build step or server-side code:

```text
index.html
  ├─ local font preloads + styles/main.css
  ├─ inline SVG warm-nebula void backdrop (CSS grain + vignette)
  ├─ <script type="importmap">      bare "pixi.js" → ./vendor/pixi.min.mjs
  └─ <script type="module" src="./src/App.js">
        └─ src/App.js  →  new FalescGame()
```

Relative imports between first-party modules use explicit `.js` extensions. The
browser must load the page over HTTP(S); `file://` URLs cannot load ES modules.

There is no package install. Pixi 7 is vendored and served as a static file. All
fonts are OFL woff2 files under `assets/fonts/`; no CDN is used at runtime. Other
visual assets are inline SVG or Pixi Graphics.

The Pixi application is created with `backgroundAlpha: 0`, so the DOM backdrop
is visible past every shard. The canvas is fixed at `z-index: 1`; DOM screens
sit above it.

### Module map

```text
src/
  App.js                     pure entrypoint
  FalescGame.js              application coordinator
  Camera.js                  world transform, clamp, pointer/touch input
  Character.js               procedural chibi character container
  constants.js               palettes, animation states, tile size, mineral palettes
  buildings/
    BuildingRenderer.js      illustrated service silhouettes (art only)
  character/
    CharacterAnimation.js    IDLE/WALK/RUN/BEND animation
    CharacterRenderer.js     static geometry, limb posing
  chapters/
    RivalChapter.js          rival identity, budget, works and services
    RivalAI.js               doctrine/need-pressure builds and recovery
  commons/
    CommonsPolicies.js       Assembly policy data and service modifiers
    CommonsBallot.js         chapter nominations and the deterministic resident ballot
  confluence/
    Pledges.js               the four shared campaign promises
    Campaign.js              final-days promises and player choice
    Stewardship.js           post-vote governing promises
    ConfluenceVote.js        the deterministic resident vote
  charter/
    Charter.js               run model: day, player chapter, rivals, roster, services, ending
  controls/
    InputManager.js          key bindings and modal lock
  design/
    balance.js               tuning table, day phases, goals, day limits
    names.js                 seeded Tidelander name pool
    needs.js                 four needs, urgency and wellbeing helpers
    programs.js              service program data, buildable list, footprints
    traits.js                temperament, standards, rhythm
  economy/
    LumenLedger.js           contributions, upkeep, closure order
  map/
    GridUtils.js             isometric projection and inverse
    MapGenerator.js          seeded single-pass shapes, AABB packing, world rect
    Sector.js                one island: shape, grid, graphics
    SectorGraphics.js        void shadow, keel, top surface, grid, vacuum props
    SeededRandom.js          deterministic RNG
    SettlementPaths.js       curved paths from services to the square
    ShapeGenerator.js        organic island silhouettes
  minerals/
    CrystalRenderer.js, RockRenderer.js, MineralRenderer.js,
    MineralStructure.js, MineralUtils.js
  navigation/
    IslandNavigator.js       per-island A* to doors
  persistence/
    SaveManager.js           versioned localStorage save v2
  residents/
    Resident.js              plain model: traits, needs, affinity, memory
    ResidentFactory.js       seeded 15-name roster, 6 founders
    ResidentAgent.js         visual timeline: walk, queue, hide, emerge
    ResidentCrowd.js         owns visible agents and playback timelines
  screens/
    MenuScreen.js, LobbyScreen.js, GameScreen.js,
    DayScreen.js, ReportScreen.js, ConfluenceScreen.js,
    StewardshipScreen.js, EndScreen.js
  services/
    ServiceBuilding.js       service model plus its Pixi container
    ServiceManager.js        placement, occupancy, housing, promotion, visits
    RetrofitModules.js       Sunroom, Atelier and Night Kitchen retrofit data
    ServicePolicies.js       player-set hours, quality and upkeep modifiers
    PlacementPolicy.js       pure footprint/door/home-shard rules
  simulation/
    DaySimulator.js          deterministic day: drift, choice, queues, report
  state/
    GamePhase.js             MENU/LOBBY/PLAYING/DAY/REPORT/CONFLUENCE/STEWARDSHIP/END
    ScreenStateMachine.js    screen registry and phase changes
  ui/
    BuildModal.js, ServiceCardModal.js, BulletinModal.js,
    OverlayManager.js, StandingsCard.js, ResidentCardModal.js, Minimap.js,
    ChatterManager.js, CampaignModal.js, CommonsModal.js, icons.js
  world/
    World.js                 Pixi app, layers, camera/input, map and minerals
    PatronageFlow.js         world-space last-choice arcs on the overlay layer
```

There is no `GameStateManager`, `TurnScheduler`, `BuildingManager`, `Building`,
`blueprints.js`, `NPCController`, `CrowdManager`, `InterstitialScreen` or
`StructureModal`. The Prism Tide loop they served has been removed; `Building`
art survives only as `BuildingRenderer`, and `Character`/`character/` remain the
visual rig.

## 2. Boot sequence

`new FalescGame()` in `src/FalescGame.js`:

1. Sets random lobby settings (seed under one million, `medium` size).
2. Creates `World`, which:
   - creates the transparent Pixi `Application` (`resizeTo: window`,
     antialiasing, device-pixel-ratio resolution);
   - appends the canvas and creates `worldContainer`;
   - creates `mapLayer`, `pathLayer` + `pathG`, `shadowLayer`,
     `interactionLayer` (hover cell + ghost), `objectLayer` (sortable) and
     `overlayLayer`;
   - creates `InputManager` and `Camera`, wires tap/hover callbacks, and sets a
     temporary `screen × 5` world rectangle centred on camera.
3. Creates `ResidentCrowd` bound to `objectLayer`/`shadowLayer`.
4. Creates `SaveManager` and `ScreenStateMachine`.
5. Creates an `OverlayManager` and the four dialogs (`BuildModal`,
   `ServiceCardModal`, `BulletinModal`, `ResidentCardModal`). The manager owns
   the scrim body class, HUD `inert`, input lock, focus restore and Tab trap;
   dialogs can stack.
6. Creates `GameScreen`, `DayScreen`, `ReportScreen`; registers one screen per
   phase (`MenuScreen`, `LobbyScreen`, `GameScreen`, `DayScreen`,
   `ReportScreen`, `EndScreen`).
7. Creates `Minimap` (mounts into the HUD chart slot) and `ChatterManager`
   (world-space overlay).
8. Subscribes to phase changes and starts in `MENU`.
9. Adds the `beforeunload` autosave, exposes `window.__falesc`, and starts the
   Pixi ticker.
10. On the first ticker frame, sets `window.__APP_READY__ = true` and dispatches
    `app-ready`.

### Starting a charter

`FalescGame.startCharter()`:

1. Reads seed and size from settings.
2. `initializeWorld(seed, size)` disposes the old charter (playback, crowd,
   services, modals, chatter), then `World.generate()` builds the map and
   minerals and leaves the camera on the home shard.
3. Creates `Charter` with the map and `world.objectLayer`.
4. Gives the crowd the charter, syncs residents, rebuilds settlement paths and
   updates the HUD.
5. Arms the Canteen, clears the end result, reseeds chatter, switches to
   `PLAYING`, shows the morning bulletin, and autosaves.

### Continuing

`FalescGame.continueCharter()` reads `falesc.save.v2`, restores settings,
regenerates the seeded world, calls `Charter.fromSave()`, syncs the crowd and
views, restores/clamps the camera, switches to `PLAYING`, toasts, and saves
again. `initializeWorld()` calls `disposeCharter()` first, so there is no stale
service, agent or overlay between runs.

## 3. State machine and screens

`src/state/GamePhase.js` defines:

| Phase | Meaning | Screen |
| --- | --- | --- |
| `MENU` | Title over the void | `MenuScreen` |
| `LOBBY` | Seed / map-size charter form | `LobbyScreen` |
| `PLAYING` | Paused planning and HUD | `GameScreen` |
| `DAY` | Deterministic playback at 1×/2×/4× with Skip | `DayScreen` |
| `REPORT` | Evening broadsheet / charter record | `ReportScreen` |
| `CONFLUENCE` | Final pledge and resident vote | `ConfluenceScreen` |
| `STEWARDSHIP` | Winning chapter's governing promise | `StewardshipScreen` |
| `END` | Victory, defeat or abandon | `EndScreen` |

`ScreenStateMachine` is a small registry: it hides the active screen, shows the
next, and notifies listeners. It has no guard rails beyond "same phase is a
no-op"; transitions are the coordinator's job.

```text
MENU ──New charter──▶ LOBBY ──Sign the charter──▶ PLAYING
  │                                                │  ▲
  └──Continue charter──────────────────────────────┘  │
                                                     │
PLAYING ──Open the day──▶ DAY ──finish/skip──▶ REPORT ──Begin Day N
  │                                             │
  └──Abandon──▶ END ◀──charter record───────────┘
                 │
                 ├──Return to the drift──▶ MENU
                 └──New charter──────────▶ LOBBY
```

- `FalescGame.openDay()` builds the day and enters `DAY`.
- `finishDayPlayback()`/`skipDay()` enter `REPORT`.
- `beginNextDay()` either opens the next `PLAYING` day or finishes the charter
  when the previous day produced an ending; the report button does the same.
- `endCharter('abandon')` enters `END` directly.
- `onPhaseChanged()` closes every modal and clears the hover on any non-
  `PLAYING` phase, clears the save on `END`, and drops playback when returning
  to `MENU`/`LOBBY`.

Screens are fixed-position DOM overlays created once and toggled with
`display`. All visual styling lives in `styles/main.css`; JS adds classes and
`data-testid` hooks. Layer order: HUD `100`, day strip `200`, menu/lobby/end
`1000`, report `1100`, modal scrims `2000`. The HUD is `pointer-events: none`
with interactive panels re-enabling it, so the canvas stays pannable.

## 4. The charter model

`src/charter/Charter.js` is the run: plain data plus a handful of commands.

| Field | Meaning |
| --- | --- |
| `seed`, `mapSize` | World identity |
| `day`, `dayLimit` | Current day and the map-size limit |
| `lumen` | Civic energy in hand |
| `works` | Works left today (starts at 2, resets on a new day) |
| `roster` | All 15 `Resident` models, active or waiting |
| `services` | `ServiceManager` owning every service |
| `flourishing` | Average active-resident wellbeing |
| `devotion` | Sum of resident affinity with the player |
| `mode` | `first-light` or `contest` |
| `playerChapter`, `rivals` | The player chapter descriptor and rival chapters |
| `occupancy` | Shared shard occupancy across every chapter |
| `lastReport`, `history` | The evening report and prior reports |
| `bulletin` | The current morning news |
| `ending` | `{ outcome, day, title, message }` once decided |

Construction-time flow: create the seeded roster, place the fixed **Welcome
Post** near the grid centre (`housing`, capacity 6, `ACTIVE`, `fixed`); in
`contest` mode create The Gardener and The Host with one signature active
service each; assign homes, refresh Flourishing/Devotion, and build the first
bulletin. A roster resident is active only for the first six; the rest wait for
spare beds.

Key getters: `activeResidents`, `playerResidents`, `allServices`, `chapters`,
`population`, `housingCapacity`, `spareBeds`, `wellbeing`,
`projectedContributions`, `projectedUpkeep`, `projectedNet`,
`devotionByChapter`, `standings`, `firstLightProgress`, `goalsMet`.

Key commands:

- `canBuild(programId)` — buildable, works remaining, affordable.
- `build()` — placement, spend lumen and one work, assign homes, refresh.
- `dismantle()` / `reopen()` — half-cost refund / shortfall recovery.
- `openDay()` — run `DaySimulator`, store report, refresh derived values.
- `beginNextDay()` — increment day, reset player/rival works, promote
  construction, reset daily service state, assign homes, add arrivals, let
  `RivalAI` make one move per rival, remember `pendingArrivals`, and build the
  next bulletin.
- `addArrivals()` — if flourishing ≥ 20 and beds are spare, activate up to two
  waiting residents. Residents who already departed are never re-admitted.
- `evaluateEnding(report)` — First Light: population < 4 is defeat, meeting 12
  housed + flourishing 62 is immediate victory, the limit without both is
  defeat. Contest: at the limit, most Devotion wins unless shared flourishing is
  below the survival line. Writes `report.outcome`/`message`.
- `serialize()` / `restore()` — save v2 model data.

The charter does not own DOM or the Pixi scene. `ServiceManager` creates
`ServiceBuilding` objects, which do own their Pixi containers; the crowd and
screens are attached by `FalescGame`. A service carries `level`, `retrofitId`, `qualityBonus` and `upkeepBonus` in
addition to capacity; `Charter.upgradeService()` installs one module from
`src/services/RetrofitModules.js`, and `ServiceManager.upkeepFor()` charges its
upkeep.

### Cross-island commons isle

In Contest mode `Charter` marks the second-largest sector as `commonsSector`
and sets `map.commonsEnabled`. `Charter.build()` routes placements on that
sector into `commonsManager` and stamps `builderChapterId`; the service belongs
to the commons chapter and is excluded from dismantle, retrofit and hours
commands. `Charter.collectCommonsLevy()` takes 1 lumen per chapter into
`commons.purse` when shared works stand; `settleCommonsPurse()` pays their upkeep
or closes them together, and `sharedUpkeepTotal()` reopens them when the purse
can cover the full bill. `DaySimulator` credits a small affinity share to the
builder on each visit. `PlacementPolicy` accepts that sector as well as
the home shard. `Charter.setupTransit()` reserves a free gate cell on each
shard; `DaySimulator.routeTo()` composes a home path, the cross-void shuttle
leg and a commons path, then emits world-space points for `ResidentAgent`.
`TransitGate` draws the two pads and the dashed link (read-only). Rivals still
search only `rival.services.map.homeSector`.

### Contest preview

In `contest` mode `Charter.createRivals()` builds `RivalChapter` instances for
The Gardener and The Host. Each rival has its own `ServiceManager`, lumen,
works, a fixed four-bed Welcome House and one work per day. `RivalAI` seeds a
signature active service and then, at the start of each planning day, attempts
one doctrine-ordered build. Rival and player services share the same occupancy
map, so their footprints and doors cannot overlap.

Contest starts with nine active residents, three per chapter. Each has a
`homeChapterId`; housing is a chapter service with four beds. `Charter.assignHomes()`
tries the resident's chapter first and then any chapter with a spare bed.
`Charter.addArrivals()` gives new residents to the least-crowded chapter with
room, breaking ties by Devotion, so a rival that builds housing can grow its own
population without arrivals piling onto the leader. In the last three days
`Charter.startCampaign()` creates a `Campaign`: it shuffles a three-day festival
programme from the four needs, then each rival publishes a doctrine/need-pressure
promise (also weighted by the programme), and `CampaignModal` lets the player
choose one of the same four. On a day whose festival event matches a chapter's
promise, `DaySimulator` gives that chapter's services a 1.12 choice-appeal
multiplier. The promised need adds a bonus to that chapter's final vote with
residents whose urgent need matches; the player's promise is worth more than a
rival's, and repeated matched events add a small momentum bonus. Their `affinity` map gains
hearts for whichever chapter owns the service they visit; housing grants
affinity to the home chapter. `DaySimulator` offers every active service from
`charter.allServices`, labels rival doors with their chapter name, and writes
`devotionByChapter`, `patronageByChapter` and a chapter summary into the report.
The HUD's `StandingsCard` and the report use those numbers.

`LumenLedger.resolveDay()` resolves every chapter. Each chapter pays upkeep from
its own residents' contributions, and a shortfall closes its non-housing
services in the usual order. Rivals therefore have a real budget, can fall short
and can grow through housing. Their AI reopens a lost service when it can afford
the cost, then chooses the next build from shared need pressure plus doctrine.
At the day limit the contest does not pick a winner from Devotion directly:
`Charter.evaluateEnding()` sets `confluenceReady`, and the report hands over to
the Confluence screen. `ConfluenceVote.tally()` gives each active resident one
vote based on per-chapter affinity, home loyalty, last choice, the player's
campaign promise, rival campaign promises, campaign momentum and a seeded
tie-break. The winner becomes the charter ending; shared
Flourishing below the survival line produces a no-winner defeat.

The **Commons Beacon** is a shared project rather than a chapter service.
`Charter.setupCommons()` reserves a 2×2 site with a PENDING service in a
`commons`-owned `ServiceManager`; the site counts for occupancy and renders as
a ghost. `Charter.contributeCommons()` accepts player or rival lumen, records
contributors and flips the service to ACTIVE at 20. While active,
`VisitorFactory` creates 2–3 transient visitors per Contest day. They are
ordinary `Resident` models flagged `visitor`, included in `Charter.presentResidents`
for the phase loop and the crowd, but excluded from `activeResidents`, housing,
arrivals, Devotion and votes. `Charter.beginNextDay()` clears them. A visitor
visit adds `BALANCE.visitors.fee` to `DaySimulator.visitorFees`; `LumenLedger`
adds that to the owning chapter and reports `visitorFees` separately. Visitors
are not serialized. A charmed visitor (`affinity.player >= 0.15`) can begin a one-day trial stay
when the player has a spare bed: they occupy a bed, are present and sleep, but
remain outside `activeResidents`, contributions, Devotion and the vote.
`resolveTrialStays()` promotes them at the next day start if their wellbeing
reaches `BALANCE.visitors.trialWellbeing`, otherwise they leave. Unhoused charmed
visitors are remembered in `returningVisitors` (up to two) and return on a later day with the same
name, memory and affinity. The returning list is serialized, then moved back
into `visitors` by `spawnVisitors()`; `Charter.inviteVisitor()`
clears the visitor flag, adds them to the roster, assigns a bed and saves them
as an ordinary resident.

`DaySimulator.applyNightRest()` eases every need by `BALANCE.commons.comfort`
(3) after the home rest, and `servesNeed()` lets the six-seat Beacon answer any
need as a shared visitable service. `VisitorCardModal` shows a visitor's traits, needs, affinity and last choice
behind the report's visitor row. `CommonsModal` is the contribution and Assembly UI. `src/commons/CommonsPolicies.js`
defines the four one-time policies (Shared Table, Open Beds, Commons Garden,
Night Watch). `CommonsBallot.petitionFor()` records residents' petition signatures.
`Charter.nominateCommonsPolicy()` records the player's nomination and the two
rival nominations, then adds the petition policy to the finalists; `resolveCommonsAssembly()` runs the deterministic
resident ballot in `CommonsBallot.js`, then `Charter.chooseCommonsPolicy()`
applies the winning capacity/comfort modifiers to every existing service and
stores the policy. `Charter.build()` and `RivalAI` apply it to later builds. Night Watch is
read by `commonsComfortFor()` and `commonsRestRecoveryFor()`. The site,
contributors and service persist in the `commons` save block.

The **patronage-flow overlay** (`src/world/PatronageFlow.js`) is a read-only Pixi
layer over the world. When toggled from the standings card or with `P`, it draws
one chapter-coloured arc from each resident's home door to the door of their
last chosen service. It is cleared on day playback and refreshed after planning
changes; it never feeds the simulation.

## 5. Day simulation and playback

`src/simulation/DaySimulator.js` is deterministic. Its RNG is
`new SeededRandom(seed + day * 104729 + 17)`; it never calls `Math.random` or
reads wall-clock time. Same seed + same actions + same day = same report.

`run()`:

1. Snapshot each active resident's needs for `needBefore`.
2. For each of the four phases (`morning`, `afternoon`, `evening`, `night`):
   - apply need drift for every resident (`baseRise × rhythmRise`);
   - skip choice during `night`;
   - otherwise choose and schedule one visit per resident.
3. At night: housed residents recover Rest and gain a little affinity; homeless
   residents take a Rest penalty and complain.
4. Record daily unmet needs (92+) and homeless nights. A resident leaves after
   three consecutive unmet days or two nights without a bed; `depart()` marks
   them inactive, frees the bed and records the reason. The report and next
   bulletin announce departures.
5. Build the report (needs at dusk, wellbeing, visits, hearts gained/lost,
   arrivals, departures, service visits, quotes, complaints).
6. `LumenLedger.resolveDay()` applies contributions, upkeep, closures, and
   writes the economy fields onto the report. Contributions use the residents
   still present after departures.
7. Reset daily service counters, call `charter.evaluateEnding(report)`, and
   return `{ report, events, navigator }`.

### Choice

For each resident and non-night phase, services are filtered to active, open
services (`isOpenAt`). Needs are considered from most to least urgent; a need
below 20 is ignored, and Rest is skipped outside the nightly at-home pass.
Candidates are scored by:

```text
urgency × need match × quality × vibe fit × standards fit × proximity
        × availability/queue × familiarity × small seeded novelty × rhythm
```

The best positive score wins. If a service-phase load is at or above
`capacity + 3`, the resident re-evaluates the next candidate; if every option
is full, they give up with a visible reason, a complaint and a small affinity
loss. Otherwise the simulator schedules an event inside the five-second phase
window: depart, travel, queue, enter, use, exit, return. Travel is scaled by the
A* path length and the whole visit is compressed to fit its phase.

### Effects

A visit satisfies the chosen need by a primary or secondary effect scaled by
program quality and the resident's standards. It records a service visit and a
heart, adds affinity (more if the need was urgent), clears the unmet-day
counter for that need, and writes the resident's `memory.lastChoice` with a
generated **why** line.

### Playback

`FalescGame.openDay()` has already resolved the day when `DAY` starts:
`charter.openDay()` returns the finished report and event list. The app builds
`playback = { clock, duration, speed, report }` with
`duration = 4 × BALANCE.playback.phaseSeconds` (20 seconds), hands the events to
`ResidentCrowd.preparePlayback()`, and shows the day strip.

Each ticker update during `DAY` advances `clock` by `dt × speed`, derives the
phase from the clock, updates the crowd and service pulse, and updates the day
strip. `Skip` sets the clock to the duration. `finishDayPlayback()` resets
residents to their planning positions and enters `REPORT`. Playback is a
**view**, not a second simulation: lumen, needs, visits and the report cannot
change during it.

`DAY_PHASES` are five-second visual spans in the day strip, not a real-time
schedule. The crowd's precomputed timestamps happen to use the same phase
window, which keeps the replay legible.

## 6. Residents and navigation

`Resident` (`src/residents/Resident.js`) is plain model data:

```text
id, name, traits { temperament, standards, rhythm }
needs { sustenance, rest, company, wonder }   // 0 satisfied .. 100 urgent
active, homeServiceId
affinity { player }                           // 0..5, starts at 0.8
memory { lastChoice, recentVisits, complaints, unmetDays, lastComplaint,
         homelessDays, departure }
paletteSeed, state, position
```

Derived: `wellbeing` (`100 − average urgency`), `favouriteNeed`, `traitSummary`,
`isHomeless`. `recordChoice()` keeps the last choice and up to eight recent
visits (the card currently shows only the last); `addAffinity(amount, chapterId)` clamps per chapter;
`updateUnmetDays()` is called once at dusk; `recordHomelessNight()` and
`resetHomelessDays()` track bedlessness; `depart(reason, day)` removes the
resident from the active roster while preserving them in the saved cast.

`ResidentFactory.createRoster(seed, 15)` shuffles the name pool with a seeded
RNG, cycles temperament/standards/rhythm for a deliberate mix, seeds a rotating
urgent need, and marks the first six active. The same seed produces the same
cast.

`ResidentAgent` owns the visual `Character` for one resident: it hides the
character inside a service, walks precomputed paths, shows a need glyph bubble
on emergence, and idles at the home door during planning. `ResidentCrowd` creates
agents for active residents, places them around their housing door (or the
commons cell), prepares per-resident event timelines, and updates them during
playback. Planning ambient movement is a tiny idle sway; it is decoration, not
simulation.

`IslandNavigator` builds an A* grid for the home sector. Service footprints are
blocked; doors and other free cells are walkable. `path()` snaps start/goal to
the nearest walkable cell, returns grid cells (inclusive), and `worldPath()`
converts them to world points. Paths are computed only when a resident chooses a
destination. There is no inter-island travel, no crowd collision avoidance and
no routing around other residents.

## 7. Services, placement and the build flow

### Program data

`src/design/programs.js` is the single table behind every service:
`housing`, `canteen`, `tea_house`, `garden_dome` (all `buildable: true`) and
`commons_beacon` (`buildable: false`, kept as endgame art/data). Each entry has
id, name, category, primary/secondary need, capacity, visit duration, open
phases, footprint, cost, upkeep, quality, finish/vibe defaults, construction
days, colour, icon and test id.

### ServiceBuilding

`ServiceBuilding` mixes model and view: it stores program, footprint anchor,
state, entrance, capacity, visits, hearts, closure and construction progress,
and owns a Pixi container drawn by `BuildingRenderer`. `PENDING` services pulse
and are ghosted; `ACTIVE` services are solid; closed services are dimmed. Rival
services carry a chapter-coloured pennant.
`promote()` counts down `daysRemaining` and becomes `ACTIVE` at zero.
`recordVisit()`, `resetDaily()`, `close()`, `reopen()` and `update()` keep the
visual and daily state aligned.

### ServiceManager

- `occupancy` is a shared `Map` from `sectorId:u:v` to service, so player and
  rival footprints/doors cannot overlap. Footprint cells **and** the door cell
  are occupied.
- `canPlace()` delegates to `PlacementPolicy`.
- `place()` validates, creates a chapter-prefixed service id, registers cells,
  positions it and adds its container.
- `remove()` clears occupancy and destroys the container.
- `housingCapacity()`, `housingFor()`, `spareHousing()` and `assignHome()` fill
  houses in build order for a stable, legible report.
- `promoteUnderConstruction()` opens `PENDING` services.
- `upkeepFor()` only charges active, open services; `reopenCost()` is half
  upkeep, minimum 1.
- `serialize()`/`restore()` round-trip the model, including door, visits,
  hearts, closure and days remaining.

### PlacementPolicy

`evaluatePlacement()` returns `{ ok, reason, cells, entrance, sector }` for the
UI and tests. It rejects a missing map, any sector other than the home shard,
footprints outside the grid, occupied cells, and a footprint with no free door
cell. `findEntrance()` prefers the south-facing edge (camera-facing), then the
left/right edges, then the top edge. `cellKey()` is shared with the navigator.

### Build interaction

1. `selectProgram(id)` refuses when not `PLAYING`, not buildable, out of works,
   or unaffordable. It clears the pending plot and hover on change.
2. Hovering the canvas calls `onWorldHover()`: it validates the cell, draws a
   mint/coral diamond over the footprint, and shows a ghost silhouette when
   legal.
3. A primary tap calls `onWorldTap()`: a nearby resident wins first (opens the
   card); otherwise a service under the cell opens its record; otherwise the
   armed program is checked and the build dialog opens.
4. `finalizeBuild(name)` re-validates, calls `charter.build()`, syncs views,
   toasts, and autosaves.
5. The build dialog is a real dialog: scrim, `role="dialog"`, labelled title,
   shared `OverlayManager` (focus trap, Escape cancels, Enter submits, focus
   restored on close, HUD `inert` until the overlay stack is empty).
6. Cancel/phase change clears the pending plot. A failed build keeps the dialog
   open with an inline reason.
7. Service records handle dismantle (half cost, no work, not the Welcome Post)
   and reopen (closed services only).

## 8. Economy

`LumenLedger` is a static data service:

```text
contributionFor(resident) = 2 if wellbeing ≥ 65
                            1 if wellbeing ≥ 35
                            0 otherwise
projectedContributions = sum(active residents in the chapter)
                        + civic dividend (Contest: 1 per resident/day)
projectedUpkeep        = sum(active, open services' program upkeep)
projectedNet           = contributions − upkeep
```

`resolveDay(charter, report)` resolves each chapter through
`resolveChapter(chapter, residents)`:

1. Compute that chapter's contributions and upkeep before closure.
2. Add contributions, subtract upkeep.
3. If the balance is negative, close non-housing, non-fixed services in
   `BALANCE.economy.closureOrder` (`wonder`, `company`, `sustenance`, `rest`),
   highest upkeep first, adding each closed service's upkeep back until the
   balance is non-negative.
4. Recompute upkeep and net; clamp lumen at 0; write the chapter's
   `contributions`, `upkeep`, `upkeepBefore`, `net`, `lumenAfter` and `closures`
   into the report. The player fields mirror the player chapter; each entry in
   `report.chapters` carries its own economy.

The report and HUD use these numbers. `flourishing` is computed by the day
simulator as average wellbeing; `devotion` is the sum of affinity. There is no
price per visit, no stock, and no passive harvest income.

## 9. Persistence

`src/persistence/SaveManager.js`:

- key `falesc.save.v2`, version `2`;
- `read()` removes the legacy `falesc.save.v1` key, parses the payload, rejects
  a non-v2 version by clearing, and validates the charter's seed, resident
  array/shape, service array/shape (including a door cell) before returning it;
- `write(payload)` adds `version` and `savedAt`;
- `clear()` removes both v2 and legacy v1.

`FalescGame.saveGame()` writes when a charter exists and the phase is `PLAYING`
or `REPORT`: after starting/continuing, after build/dismantle/reopen, after
beginning the next day, when the evening report opens, and on `beforeunload`.
It stores:

```json
{
  "version": 2,
  "savedAt": 0,
  "settings": { "mapSeed": 12345, "mapSize": "medium" },
  "charter": {
    "seed": 12345, "mapSize": "medium", "day": 3, "dayLimit": 14,
    "lumen": 12, "works": 2, "flourishing": 63.5, "devotion": 8.3,
    "mode": "contest", "ending": null, "confluenceReady": true,
    "campaign": { "startedDay": 12, "dayLimit": 14, "seed": 12345,
      "rivalPledges": {}, "playerPledge": null, "events": [] },
    "commons": { "target": 20, "fund": 12, "active": false,
      "contributors": {}, "activatedDay": null, "serviceId": "commons-s1" },
    "pendingArrivals": [], "lastReport": {},
    "residents": [], "services": [], "rivals": []
  },
  "camera": { "x": 0, "y": 0, "zoom": 0.5 }
}
```

The world is regenerated from the seed. Residents restore traits, needs,
activity, home chapter, per-chapter affinity and memory (including departure and
homeless-day state); services restore program, cells, state, door, capacity,
visits, hearts and closure; rivals restore identity, doctrine, budget, works and
services. `pendingArrivals` keeps the current morning's new residents for
the next report; `lastReport` is a compact summary (no playback events) shown on
the restored report screen. Unknown or structurally invalid saves are cleared,
not partially loaded. Save v1 is intentionally abandoned. There is no
export/import. Reloading during `DAY` returns to the last planning save; reloading on `REPORT`
restores the report and does not replay the day.

## 10. World generation

`World.generate({ seed, size })` clears the previous map/minerals, starts from a
`screen × 5` world rectangle, creates `MapGenerator`, adopts its
`worldWidth`/`worldHeight`, adds each sector graphic to `mapLayer`, and spawns
minerals from a seeded RNG.

`MapGenerator` is a single-pass pipeline:

1. Build each local island silhouette once with a per-sector `SeededRandom` and
   the configured grid size; compute its actual axis-aligned bounds.
2. Pack islands on an Archimedean spiral against those **actual shape bounds**
   with a 110 px gap. AABB non-overlap is conservative: separated boxes mean
   separated irregular shapes. Nothing is regenerated after packing.
3. Translate the packed cluster into a world rectangle with 520 px of margin on
   every side. Store `worldWidth`, `worldHeight`, `bounds` and `homeSector`
   (largest grid, then topmost).
4. Construct each `Sector` once at its final position from the prebuilt
   silhouette.

| Size | Sector grids | Minerals |
| --- | --- | --- |
| `small` | 1 × `7×7` + 3 × `2×2` | 46 |
| `medium` | 1 × `8×8` + 2 × `3×3` + 3 × `2×2` | 64 |
| `large` | 1 × `9×9` + 2 × `3×3` + 4 × `2×2` | 82 |

Minerals spawn outside the build grid on random islands. Their rocks/crystals
use per-item seeded variation. The home shard is the only buildable sector.

## 11. Rendering and the world

### Void and shards

The world is a warm nebula void, not a sea. `index.html` holds a fixed inline
SVG backdrop: plum/wine/rose gradients, a soft bright core, aurora bands, stars,
a ringed planet and distant shard silhouettes, plus CSS grain and vignette. The
Pixi canvas is transparent above it.

`SectorGraphics` draws each shard in the NW light / SE shadow convention:

- a void shadow and a deep jagged rock keel with faceted buttresses, broken
  shard tips, mint/lavender crystal veins, hanging cables and pipes, and
  drifting debris;
- a paper-bright regolith/metal deck top with rim light, a warm ink grid, corner
  brackets and a compass mark;
- vacuum-safe dressing outside the build grid: rocks, outcrops, void coral,
  crates, pods, antennae, dishes, solar fins, radiators, pipes, cables, warning
  marks, memorials and small beacons.

There is no sea, no beach, no foam and no open-air planting. The Garden Dome is
the exception: a pressurised geodesic glasshouse with beds, a tree and shrubs
inside. All services have visible airlocks/doors on the camera-facing face.

### Layers

Inside `worldContainer`, in order:

1. `mapLayer` — sector graphics.
2. `pathLayer` — curved cream stepping-stone paths from each service to the
   island's central square; rebuilt only when services change.
3. `shadowLayer` — character and mineral shadows.
4. `interactionLayer` — hover cell highlight and armed-service ghost.
5. `objectLayer` — services, residents and minerals; `sortableChildren` sorts by
   ground Y every ten frames.
6. `overlayLayer` — ambient Tidelander speech bubbles.

DOM screens and modals are not part of the Pixi scene graph. They sit above the
canvas.

### Survey chart and mood

`Minimap` is a separate Canvas2D `#minimap` in the HUD chart slot. It paints a
warm-void chart with stars, a graticule, island coastlines, services, residents
and the camera viewport, updates every third frame, and moves the camera on
click. It is also the surface the browser harness samples because the main
canvas is WebGL.

`FalescGame.update()` computes `--tide-progress` from day / day limit and sets it
on the document root while `PLAYING`, `DAY`, `REPORT` or `END`. CSS uses it to
desaturate and dim the backdrop as the charter approaches its end. Chatter (up
to two bubbles, roughly every 20–40 seconds) is ambient only and runs during
`PLAYING`.

### Camera, coordinates and input

- **World pixels** — the Pixi scene graph.
- **Screen/CSS pixels** — pointer positions and DOM layout.
- **Grid coordinates** — fractional `(u, v)` inside a sector, `0..gridSize`.
  A cell is `TILE_WIDTH = 512` by `TILE_HEIGHT = 256` world pixels.

```text
screen = centre + (world − camera.position) × zoom
world  = camera.position + (screen − centre) ÷ zoom

x = (u − gridSize/2 − (v − gridSize/2)) × TILE_WIDTH/2  + sector.centerX
y = (u − gridSize/2 + (v − gridSize/2)) × TILE_HEIGHT/2 + sector.centerY
```

`Camera.setBounds()` derives a fit zoom from the packed cluster plus a 620 px
padding, sets a minimum zoom, and clamps the camera centre on every
`updateTransform` (pan, zoom, resize). `World.generate()` sets an initial
home-shard zoom clamped between 0.36 and 0.72.

Input supports WASD/arrows, wheel zoom at the cursor, middle-drag pan, one-finger
pan, two-finger pinch/pan, and a short primary-button tap. `InputManager` holds
camera key states and clears them on blur/visibility change and while a modal is
open. `Camera` listens for pointer release on `window` so a middle-drag cannot
stick when released outside the canvas.

## 12. Main loop and lifecycle

`FalescGame.update(delta)` runs on the Pixi ticker:

- `world.update(dt)` advances the camera and mineral shimmer while the tab is
  visible.
- `PLAYING`: services pulse, the crowd idles, chatter updates, HUD refreshes every
  third frame, objects sort every tenth.
- `DAY`: playback updates, services pulse faster with speed, objects sort.
- `REPORT`/`END`/`MENU`/`LOBBY`: the world still renders; no charter simulation
  runs.
- Every third frame, the survey chart updates.
- Every frame, the tide mood and frame count update; the first frame sets the
  harness readiness flag.

There is no separate pause state: when `document.hidden` is true the ticker
passes `dt = 0`, freezing ambience and playback, and the input manager clears
held keys. Leaving `PLAYING` still stops charter simulation immediately.

`initializeWorld()` is called on every new game and on continue. It disposes
the old playback, crowd, services, chatter and modals, regenerates the world,
resets the armed program to the Canteen and clears the pending plot. Resident
positions and animation are not saved; they restart from home points on
continue. Audio and multiplayer are absent.

## 13. Debug surface

`window.__falesc` is installed by `FalescGame.exposeDebugApi()`:

| Member | Purpose |
| --- | --- |
| `app` | The full `FalescGame` instance |
| `ready` | Whether the first frame completed |
| `snapshot()` | Phase, day/limit, lumen, works, population, housing, flourishing, devotion, projections, selected program, seed/size, sectors, services, residents, report, ending, modal/playback state, camera |
| `findFreeCell(programId)` | First legal cell on the home shard with its world point |
| `worldToScreen(x, y)` | World coordinates to CSS pixels |
| `selectProgram(id)` / `selectBlueprint(id)` | Arm a service through real validation (legacy alias) |
| `openDay()`, `skipDay()`, `beginNextDay()` | Drive the loop from a scenario |
| `setPlaybackSpeed(speed)` | 1, 2 or 4 |
| `showBulletin()`, `showResidents()`, `openResident(id)` | Open the real overlays |
| `saveGame()`, `continueGame()`, `continueCharter()` | Exercise persistence |
| `startCharter(seed, size)` | Start a deterministic run for tests |
| `serviceAt(sectorId, u, v)` | Look up occupancy, including doors |
| `endCharter(outcome)` | Abandon/end from a scenario |

`snapshot()` also exposes compatibility aliases `turn`, `actionsRemaining`,
`selectedBlueprint`, `buildings`, `buildingStates`, `buildingBlueprints` and
service `blueprintId` = `programId`, because several scenarios were adapted
from the previous loop. New code should use the program/service names.

`window.__APP_READY__` is the harness readiness flag. Scenario files under
`scripts/scenarios/` use these hooks plus DOM selectors.

## 14. Tests and extension points

`npm run check` parses every first-party `.js`/`.mjs`, resolves relative imports
and checks the import map. `webgame.config.json` drives the main browser smoke
test; `scripts/scenarios/` holds the resident, economy, persistence,
determinism, engine, map, demolition, showcase, victory and mobile scenarios.
See [testing.md](testing.md).

Extension points:

- **New service program:** add an entry to `src/design/programs.js`, an icon in
  `src/ui/icons.js`, and a `BuildingRenderer` branch. The dock and build dialog
  discover buildable programs from the array; check placement footprints and
  update the resident/queue expectations.
- **New need:** add it to `src/design/needs.js`, give services a matching
  program, and extend `DaySimulator` only if the need needs special handling
  (like Rest's nightly pass).
- **New screen/phase:** add a `GamePhase`, a screen class with `show`/`hide`,
  register it in `FalescGame`, and style it in `styles/main.css`.
- **New map size:** add a `gridConfigs` entry in `MapGenerator`, a mineral count
  in `World`, a day limit in `BALANCE.dayLimits`, and a card/readout in
  `LobbyScreen`.
- **New resident trait:** add stable ids in `src/design/traits.js`, wire the
  effect into scoring, and surface it on the card. Trait ids are stored in
  saves.
- **New test step:** edit `webgame.config.json` or add a scenario in
  `scripts/scenarios/`; keep assertions on model state or visible DOM.
- **New visual token/component:** add a custom property or class in
  `styles/main.css`; keep the guardrails in [design-vision.md](design-vision.md).

For safe-change guidance see [development.md](development.md), and for remaining
issues see [known-issues.md](known-issues.md).
