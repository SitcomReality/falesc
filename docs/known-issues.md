# Known issues and technical debt

> **Context:** this is the **First Light vertical slice** — one playable home
> shard, five needs, ten services, planning/playback/report, a solo
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
| 2 | Medium | Home, commons and garden isles are buildable; shared works, purse and capital exist, but no fuller archipelago |
| 3 | Medium | Floors are stacked room plans and districts are named clusters; no full loadout or shaped neighbourhoods |
| 4 | Medium | The festival programme is scripted and stewardship leaves only one small legacy |
| 5 | Low | Keyboard build cursor and an accessible grid summary exist; the canvas itself is still not a browsable grid |
| 6 | Medium | Day playback is a replay of an already-resolved day; no mid-day decisions |
| 7 | Low | Save v1 is discarded and a mid-`DAY` reload loses the day; v2 has JSON export/import |
| 8 | Low | Residents have an initial portrait, four-visit log and departure archive, but no illustrated portrait or full lifetime log |
| 9 | Low | Crowd movement has no local avoidance |
| 10 | Low | Procedural audio exists, but the multiplayer button remains a disabled placeholder |
| 11 | Low | WebGL context loss is not handled |
| 12 | Low | Visual regression is not enabled and no baseline is committed |
| 13 | Low | Minor teardown and cleanup gaps remain |
| 14 | Low | Visitors have an initial portrait, visit log, return arc and trial stay, but no illustrated portrait |
| 15 | Low | The Commons Assembly has one ballot and a single second reading, but no debate or further amendment |

## Open issues

### 1. Balance is generous and untuned

**Evidence**

- Six residents typically contribute 6 lumen against a 1-lumen Welcome Post
  upkeep; after slowing arrivals to **one per day**, the scripted medium victory
  now closes on **day 8** before the 14-day limit.
- Arrivals and housing remain affordable, and the opening sequence can build
  Canteen + housing, then housing, then Garden Dome + Tea House without a hard
  budget choice.
- Early victory closes the charter as soon as the goals are met, so the surplus
  does not accumulate across fourteen days — but the first week still rarely
  forces a sacrifice.
- The full 14-day `contest-season.mjs` probe reaches the Confluence with the
  player on 12 services and a 9–4–2 vote split; the player can still coast on
  the early lead while the Host sits on a large unspent lumen reserve. Visitor
  fees add another income stream on top.
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

### 2. Only the home shard and two outer isles are playable

**Evidence**

- `PlacementPolicy.evaluatePlacement()` allows the home shard, the Contest
  `commonsSector` and the Contest `gardenSector`; every other sector still rejects.
- `FalescGame.findGridTarget()` projects into all three buildable sectors.
- Residents reach the commons and garden isles through reserved shuttle gates
  and cross-island routes; rivals build on the home shard and may fund shared
  commons works.
- Other generated islands have scenery and minerals but no buildable grid.
- Services built on the commons isle are shared works owned by The Commons.
  A commons purse fed by every chapter pays their upkeep; the player can top
  it up and fund a shared capital budget that pays for commons construction;
  rivals add 1 lumen a day and may break ground there from that capital. There
  is still no fuller archipelago. The Commons Beacon remains a project on the home shard.
  interaction, services, transit or residents.

**Impact**

The archipelago is a beautiful backdrop, not a place. There is no commons, no
rival neighbourhood, no transit and no reason to look at the other shards once
the camera has settled on the home shard.

**Suggested direction**

Keep the home shard as the Phase 1 scope, but make the boundary explicit in the
lobby and HUD. The next step is the Phase 2 shared commons, not quietly enabling
placement on scenery. Add further islands only with their own navigation, ownership and camera
affordances; the garden isle is the second proof. The commons isle is the first
proof of cross-island transit and shared ownership.

### 3. Floors are blocks and districts are named clusters

**Evidence**

- The ten buildable programs are fixed compositions. `ServiceBuilding` stores
  `finish`, `policy`, `level`, `retrofitId`, `qualityBonus` and `upkeepBonus`;
  up to two retrofit modules change them, and retrofit sets the grand finish.
- Extra floors choose a Dormer, Common Room or Roof Garden and draw a stacked
  upper storey above the building, but each is a single service volume rather
  than a full interior with stairs or separate room uses. Connected services form a named
  district with a small quality bonus and a world label, and service atmosphere is player-set, but
  there is no shaped neighbourhood, access policy or full loadout.
- Footprints are `1×1` except the Garden Dome's `2×2`; entrance validation is a
  single free door cell, not multi-cell entrance/queue design.
- The service record can dismantle, reopen and hold two retrofit modules, but
  there is no remodel or floor plan.

**Impact**

Two canteens are the same canteen. The spatial/combination depth the refined
design promises is absent, and `finish`/`policy` fields risk looking implemented
when they are not.

**Suggested direction**

Add multi-slot module loadouts and access policies, then shells/floors. Keep the
"no spreadsheet" test: every option must show up in a resident's choice or the
report. Hours and retrofit are the first proofs that the service record can
carry a real trade-off.

### 4. The festival programme is scripted and stewardship leaves only one small legacy

**Evidence**

- The Contest preview has two AI chapters, doctrine biases, shared
  services/occupancy, shared residents, rival Welcome Houses, per-chapter lumen,
  contributions, upkeep and closures, a rival bulletin move, Devotion standings,
  a patronage-flow overlay, a final campaign and a pledge/vote Confluence.
- In the last three days both rivals publish a promise and the player chooses one;
  a seeded six-event programme (two bells per day) gives a 1.06–1.12 service-appeal
  multiplier to a chapter whose promise matches one or both of the day's needs,
  and promises also affect the final vote. It is still a single promise each, with one sponsored bell and a flat +0.05
  quality bonus for matching services; the two bells make the festival longer,
  not fully interactive.
- Rivals reopen services lost to a shortfall, choose builds by shared need
  pressure plus doctrine, and can grow through housing. Rivals now publish a long-term plan, save for it and honour it when they can, but still make at most two build moves
  per day and do not plan a long-term service mix or respond to the player's
  specific moves.
- A player winner chooses one of four stewardship promises. The promise now
  writes a small legacy that the next new charter remembers (one bed, one seat,
  a seeded commons purse, or a wider garden), but it does not reshape the wider
  rules or stack across many runs. There are no auctions or multi-round public
  judgment; the Commons Beacon is a single shared project, and the commons isle
  has shared works and an assembly policy.
- D3/D4 in [design/decisions.md](design/decisions.md) deliberately defer
  auctions and stewardship.

**Impact**

Competition is visible, the economy is shared and the run now has a campaign,
a social finale, a governing promise and a small cross-run legacy, but the
festival is still a short scripted programme and the legacy is one starting
bonus rather than a system. Rival play remains reactive rather than strategic.

**Suggested direction**

Add a small long-term rival plan, multi-round festival events and deeper legacy
effects before considering auctions. Follow
[design/roadmap.md](design/roadmap.md). Do not add auctions or human multiplayer
early.

### 5. Canvas grid semantics are minimal

**Evidence**

- A keyboard build cursor exists (`C` to enter, arrows to move, `G` to switch
  isle, Enter to open the build dialog, Escape to leave).
- A live region announces the current isle, cell, and whether the plot is free
  or why it is blocked.
- The pause menu's **Grid summary** exposes every buildable cell as an
  accessible table with coordinates. The canvas itself still is not a
  browsable grid, so pointerless players work from the table and cursor.

**Impact**

Keyboard placement now works, but non-visual players cannot survey the grid or
compare distant cells without moving the cursor.

**Suggested direction**

A focused cell cursor with arrow movement, a visible highlight, Enter to open the
build dialog, and an `aria-live` cell description now exist. A fuller grid
summary for assistive tech is still future work. Keep the canvas out of the
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
- There is no automatic cloud sync, backup or UI "clear save" action.

**Impact**

The reset is intentional and documented, but a mid-playback reload can lose the
day the player just watched. Save migrations will remain manual until a schema
is stable.

**Suggested direction**

Keep the v2 clear-on-mismatch rule until the schema settles. If mid-playback
reloads prove common, stage the report before `DAY` starts. Add Export/Import in
the charter menu for debugging and backups when the format stabilises.

### 8. The resident card has no full lifetime history

**Evidence**

- `Resident.memory.recentVisits` keeps up to eight visits; the card renders the
  last four with day, phase and reason.
- The card has an initial portrait, needs, traits, home, Devotion, wellbeing and
  the why line; departures are archived in the pause menu. There is no
  illustrated mood portrait or full lifetime log.
- There is no per-resident relationship view with other residents or services.

**Impact**

The "why" and the last four doors are legible, but the person is still mostly a
set of bars. The design's "little people are the game" pillar would benefit from
a stronger face and a full history.

**Suggested direction**

Add an illustrated current-mood portrait and a longer lifetime log while keeping
the card and the departure archive scannable.

### 9. Crowd movement has no local avoidance

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

### 10. Procedural audio only; multiplayer is a placeholder

- A procedural Web Audio pad and short cues exist behind the charter-menu Sound
toggle; there is no recorded music, voice or mixer.
- The menu keeps a disabled **Multiplayer — later** button. There is no
  transport, lobby or authority model; D1 deliberately keeps human multiplayer
  later.

Keep the button disabled until it is real; do not make it open an alert.

### 11. WebGL context loss is not handled

Headless Firefox occasionally logs "WebGL context was lost" from Pixi. Smoke
screenshots still render and the run passes, but there is no
`webglcontextlost`/`webglcontextrestored` handling or fallback renderer. In a
real browser this can leave a blank canvas until reload. Add a listener that
surfaces a reload prompt, or recreate the renderer/application, and treat the
headless warning as environment noise only when screenshots confirm rendering.

### 12. Visual regression is not enabled

The world geometry, roster, traits and mineral variation are seeded, and the day
simulation is deterministic, but character animation phase, ambient chatter and
minimap timing still depend on elapsed frame time. A full-viewport baseline would
be flaky, and none is committed. `#minimap` or the service dock could be
baselined once the ambient flow is settled; see
[testing.md](testing.md#8-visual-regression).

### 13. Minor teardown and cleanup

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

### 14. Visitors are day guests with a trial path

**Evidence**

- `VisitorFactory.create()` produces 2–3 transient `Resident` models per Contest
day, flagged `visitor` and excluded from `activeResidents`, housing, Devotion,
arrivals and the Confluence vote.
- Charmed visitors who are not invited are remembered in `returningVisitors`
(up to two) and return with the same name, memory and affinity. The returning
list is serialized.
- They have a visitor card with traits, needs, affinity and last door, a return
arc and a one-day trial stay. The card has no portrait, and there is no longer
relationship history beyond the trial.
- They exist only in Contest mode; First Light remains resident-only.

**Impact**

Visitors give the services a second audience, a card and a visible trade income.
A charmed visitor can return, start a trial stay, or become a resident.

**Suggested fix**

Add a small portrait and a longer relationship history after residency. Consider
solo visitors once the First Light economy is retuned.

### 15. The Commons Assembly allows only one amendment

**Evidence**

- At the Beacon, residents sign a petition for one of the four policies. The
  top petition joins the finalists automatically.
- Each chapter nominates one policy; every resident then votes once.
- One **second reading** can amend the chosen policy after a full day.
- There is no debate phase, no multi-amendment track and no third reading.

**Impact**

The petition gives residents an agenda before the ballot, and the second reading
allows one correction. The Assembly is still a short procedure, not a
continuing body.

**Suggested fix**

A single second reading now exists. A future body could add a debate phase and
more than one amendment. Let a petition
with enough signatures force a policy onto the ballot even when every chapter
has nominated something else.

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
- **Services have doors and rules.** Five buildable programs, footprints,
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
- **Shared overlay stack.** `OverlayManager` owns scrim/inert/input-lock/focus restore, stacks nested dialogs and traps Tab; the charter menu also traps focus.
- **Service districts.** Three connected services form a named district with a shared quality bonus. Covered by `service-district.mjs`.
- **Neighbouring services.** Each distinct neighbour adds quality, with an extra bonus for mixed chapters. Covered by `service-adjacency.mjs`.
- **Floor plans.** Extra floors choose Dormer, Common Room or Roof Garden, trading seats against quality and upkeep. Covered by `service-floors.mjs`.
- **Service floors.** An open, player-built service can add up to two floors for capacity and upkeep; the stacked upper storey is visible and saved. Covered by `service-floors.mjs`.
- **Building finishes.** A build chooses Humble, Comfortable or Grand; the shell changes cost, capacity, upkeep and the resident standard fit and is saved. Covered by `building-finishes.mjs`.
- **Service welcome.** Working player services can choose Open door, Chapter first or Visitors first for a small fit trade-off. Covered by `service-access.mjs`.
- **Service atmosphere.** Working player services can choose Cosy, Lively, Curious or Efficient for free, changing temperament fit without cost. Covered by `service-vibe.mjs`.
- **Service hours.** Open services can choose As built, Round the clock, Daylight or Evening; the choice changes open phases, quality and upkeep and is saved.
- **Service retrofit.** An active player service can install up to two of Sunroom, Atelier and Night Kitchen; each module trades seats, quality and upkeep and is saved. Covered by `retrofit.mjs`.
- **Garden isle.** A third buildable Contest shard with player-owned services, reached through the home shuttle pad. Covered by `garden-isle.mjs`.
- **Outer commons isle.** A second buildable shard in the Contest, reached by reserved shuttle gates; player services on it earn cross-island visits. Covered by `commons-isle.mjs`.
- **Stewardship legacy.** A winning stewardship promise is saved in `falesc.legacy.v1` and grants a small starting effect to the next charter. Covered by `campaign.mjs`.
- **Rival commons works.** A rival can spend the shared capital on a commons work when fewer than two shared works stand. Covered by `commons-rival-work.mjs`.
- **Rival capital gifts.** Each rival adds 1 lumen/day to the shared capital budget while it can. Covered by `commons-rival-capital.mjs`.
- **Commons capital budget.** Player gifts pay for shared commons construction before the builder's own lumen. Covered by `commons-capital.mjs`.
- **Commons purse.** Every chapter gives 1 lumen when shared works stand; the purse pays shared upkeep and closes/reopens the shared doors together. Covered by `commons-purse.mjs`.
- **Shared commons works.** Buildings raised on the Contest commons isle belong to The Commons, are usable by every resident and credit their builder. Covered by `commons-isle.mjs`.
- **Commons second reading.** After one full day the Assembly can be called once more to amend its policy; old capacity tags are reverted before the new policy applies. Covered by `commons-assembly.mjs`.
- **Commons Assembly ballot and petition.** A lit Beacon lets residents petition, each chapter nominate and all residents vote; existing and future services inherit the winner's capacity or comfort effect. Covered by `commons-assembly.mjs`.
- **Day visitors.** 2–3 transient Contest visitors arrive each day, use services, pay visitor fees and leave before the next day unless offered a trial stay; charmed visitors can return, and a visitor card shows their traits, needs and last door. Covered by `visitors.mjs`, `visitor-stay.mjs` and `visitor-return.mjs`.
- **Shared Commons Beacon.** A reserved 2×2 shared civic project can be funded by the player and rivals; when lit it applies a nightly multi-need comfort and becomes a six-seat all-needs service. It is covered by `commons.mjs`.
- **Contest full-season probe.** `contest-season.mjs` plays all 14 medium days, checks the campaign and Confluence, and records the economy/population trajectory for tuning.
- **Contest economy, campaign and Confluence preview.** Two rival chapters, shared services/residents, rival housing/economy/closures, recovery and need-pressure builds, Devotion standings, the patronage-flow overlay, a three-day campaign with a festival programme and rival promises, a pledge/vote Confluence finale and a post-vote stewardship epilogue are implemented and covered by `contest.mjs`, `contest-recovery.mjs`, `campaign.mjs` and `confluence-defeat.mjs`.
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
