# Roadmap and acceptance

> Related decisions: [D1](decisions.md#d1--single-player-first-solo-vs-ai-is-the-first-competitive-build)
> (solo first; solo vs. AI is the first competitive build),
> [D2](decisions.md#d2--planning-plus-playback) (playback),
> [D3](decisions.md#d3--defer-auctions-stewardship-and-petitions) (defer
> auctions), [D4](decisions.md#d4--the-confluence-is-the-main-mode) (the
> Confluence is the main mode).
>
> The guiding rule is **prove the people, then add the competition.** Each phase
> has a single acceptance question. Do not start the next phase until the current
> one answers it.

---

## Current status — 2026-11-11

**Phase 0 is substantially implemented.** The warm nebula backdrop, floating
shards with deep keels, crystal veins, cables and debris, vacuum-safe props, the
Garden Dome glasshouse and doors/airlocks on services are in the build. There is
no sea, beach or open-air planting. `npm run check` and the smoke test pass.

**Phase 1 is substantially implemented** as the **First Light vertical slice**:

- one playable home shard plus a Contest commons isle (the other islands are scenery);
- a seeded 15-name roster with 6 founding residents;
- four needs (Sustenance, Rest, Company, Wonder) and five buildable services
  (Housing, Canteen, Tea House, Garden Dome);
- paused planning, deterministic day playback at 1×/2×/4× with Skip, and an
  evening report;
- lumen from resident wellbeing, daily upkeep, construction and shortfall
  closures;
- Devotion and Flourishing;
- a resident card with needs, traits, home, last choice and a "why" line;
- queues, enter/exit and post-visit feedback for the service programs;
- save v2 under `falesc.save.v2`;
- victory as soon as 12 housed residents + flourishing 62 are reached at the end
  of a day, and defeat at the day limit or below four residents.

**Remaining before Phase 1 is complete:**

- **Tune the balance.** Early victory removes the long surplus tail, but the
  opening four days still do not force a hard care choice.
- **Departures are implemented.** Homelessness and chronic 92+ needs remove a
  resident after the threshold, and the population defeat is reachable. More
  social/word-of-mouth departure paths remain a later layer.
- **Run the acceptance playtest.** `resident-day.mjs` proves the mechanics; the
  fun of watching a choice and reading the "why" still needs a human pass.
- Decide after that pass whether the five services need more differentiation
  before rivals, or whether the resident loop is strong enough to move on.

**Phase 2 preview is now in the build:** two AI rival chapters, doctrine build
moves, shared services/occupancy, shared residents, rival Welcome Houses and
housing growth, per-chapter lumen/contributions/upkeep/closures, Devotion
standings, patronage, a patronage-flow overlay and a most-beloved-chapter end at
the day limit. Rivals also recover from closures and choose builds by need
pressure, the last three days run a three-event campaign with rival promises and
matching service appeal, and the day limit convenes a pledge/vote Confluence.
A player winner chooses a stewardship promise that seeds the next charter with
a small legacy. The archipelago can fund a shared Commons Beacon for a nightly
multi-need comfort and a first Assembly ballot; the outer commons isle hosts
shared works funded by a commons purse, and 2–3 day visitors trade with the
services. A fuller commons archipelago, long-term rival plan, multi-round
festival events, auctions and deeper legacy effects remain.

**Not started:** the rest of Phase 2, Phase 3 (true stacked floors,
district identity and access policy), shared capital budgeting, deeper Phase 4
scenarios, and Phase 5
(multiplayer, audio, accessibility polish).

---

## Phase 0 — Design lock and visual correction

**Goal:** make the world read as FALESC before changing the game.

- Agree this design folder as the direction.
- Replace the sea backdrop with a nebula/starfield.
- Remove the foam, beach and open-air plants.
- Add vacuum props: rocks, cables, antennae, solar fins, cargo pods, memorials,
  void coral.
- Deepen the island underside; add a cast shadow into the void.
- Redraw the Tide Garden as a Garden Dome.
- Add doors/windows/airlocks to the existing buildings.
- No gameplay change.

**Acceptance:** a screenshot looks like floating islands in a warm void, not a
tropical sea. No open-air plants. Buildings have doors. `npm run check` and the
existing smoke test still pass.

**Why first:** it is low risk, immediately aligns the prototype with the dream,
and gives the team a shared visual reference before systems work.

---

## Phase 1 — The vertical slice (solo, no rivals)

**Goal:** prove the resident loop.

- One island.
- 12–15 named residents.
- Four needs: Sustenance, Rest, Company, Wonder.
- Four services: Housing, Canteen, Tea House, Garden Dome.
- Plan → playback → report.
- Lumen from resident wellbeing; upkeep; construction.
- Devotion and Flourishing tracked.
- Resident card with needs, traits, last choice and a "why" line.
- Enter/exit and queues for at least the Canteen and Tea House.
- No rivals, no scenarios, no auctions, no multiplayer.

**Acceptance:**

> The player can watch a resident choose a service, enter it, emerge happier,
> and explain why. The resident's card shows the reason.

**If it fails:** do not add rivals. Fix the resident choice, the "why," the
day length, or the service feedback. The rest of the game depends on this
moment.

**Explicit D1 clarification:** "solo vs. AI" is the first *competitive* build
(Phase 2). Phase 1 is solo **without** rivals, deliberately, so the resident loop
is validated in isolation. If the loop is immediately fun but feels pointless
without a rival, pull one AI chapter forward — but do not skip the resident
proof.

---

## Phase 2 — Solo vs. AI competition

**Goal:** prove that two chapters competing for the same residents is fun.

- Two AI rivals on a shared central island.
- Shared residents; rivalry for patronage and Devotion.
- Morning bulletin includes one rival move.
- Standings card with Devotion.
- Patronage and word of mouth.
- Survey overlay with patronage flow (dotted lines from homes to services,
  coloured by chapter).
- No auctions, no stewardship, no petitions (D3).
- No human multiplayer (D1).

**Acceptance:** the player changes a service in response to a rival and sees
visits shift. The standings feel earned, not arbitrary. A resident can explain
why they chose the rival.

**If it fails:** the first lever is service differentiation (quality, hours,
inclusion, capacity), not land. Do not add auctions.

---

## Phase 3 — Layers

**Goal:** prove that building customisation is deep without being a spreadsheet.

- Shells: Kiosk/Hall/Civic, floors, styles.
- Modules: two slots, trade-offs.
- Finish: Humble/Comfortable/Grand.
- Policy: access, hours, vibe.
- Retrofitting.
- Multi-cell footprints and entrance/queue validation.
- Adjacency resonance and district identity.
- More programs: Bathhouse, Clinic, Creche, Amphitheatre, Observatory, Workshop,
  Night Kitchen.

**Acceptance:** two players can build the same program in different ways and
both be viable for different residents. A Humble and a Grand version of the same
service attract different people for legible reasons.

**If it fails:** cut modules or finishes, not the resident traits. Depth should
come from combinations the player can explain.

---

## Phase 4 — Archipelago, scenarios and the Confluence

**Goal:** deliver the full social-competition arc.

- Outer isles, neutral isles, transit tubes.
- Shared commons and home isles.
- Stewardship and petitions (D3's deferred layer).
- The Confluence vote; shared Flourishing failure; the Commons Beacon.
- Save schema expansion for chapters, layers and the Confluence (v2 landed with
  First Light).
- Scenarios: First Light (landed), The Contest, No One Left Behind, The Long
  Night, A Garden in the Void, The Open Door.
- Full 15–20 tide charters.

**Acceptance:** a full scenario can be won and lost. The end vote reflects the
run's relationships, and the player can read why each resident voted. The
Commons Beacon feels like a shared ritual, not a win button.

**If it fails:** simplify the finale before adding more land mechanics. The vote
must be legible.

---

## Phase 5 — Multiplayer, audio, accessibility and polish

**Goal:** make it a game friends can share.

- Hot-seat/async multiplayer first.
- Co-op "Commonwealth" mode if it earns its place.
- Audio: ambient void, doors, chatter, festival.
- Accessibility: keyboard build cursor, focus management, reduced motion,
  mobile reflow.
- Visual polish: queues, enter/exit, festival.
- Save/export/import.

**Acceptance:** two players can plan, resolve a day, and read the same report
without a real-time connection. The game remains playable with keyboard only and
at 390×844.

**If it fails:** ship single-player. Multiplayer is a multiplier, not the core.

---

## Phase summary

| Phase | Proves | Must not include |
| --- | --- | --- |
| 0 | The world reads as FALESC | Gameplay changes |
| 1 | Residents choose and love | Rivals, scenarios, auctions |
| 2 | Competition for residents is fun | Auctions, stewardship, petitions |
| 3 | Building layers are deep but readable | 40 types, stock/prices |
| 4 | The full arc and the vote | Human multiplayer |
| 5 | Friends can play together | Real-time networking as a requirement |

---

## Cross-phase rules

- **No phase skips.** The resident loop is the foundation.
- **No new resource without a review.** Lumen and Flourishing should carry the
  game; do not add a third currency casually.
- **No hidden systems.** Every mechanic gets a UI surface that explains it.
- **No content before the loop.** Do not build 20 programs before one resident
  can choose a canteen and explain why.
- **No art before the system.** A beautiful Garden Dome is not a substitute for
  residents entering it.
- **Keep the tests green.** Update or retire the old Prism Tide tests as the loop
  changes; do not leave a false green.

---

## What we will not build yet

- Auctions, landlords, rent, stock, prices.
- Human multiplayer, real-time networking.
- 40 building types, a tech tree, a stock market.
- 3D interiors or a second map view.
- Combat, raids, disasters that destroy buildings.
- Procedural quests or a dialogue tree for every resident.
- More crystal/Beacon mechanics.
- A campaign plot. Scenarios are enough.

---

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Scope creep | Phase acceptance gates; cut programs before residents |
| Opaque resident choice | "Why" card and day report are mandatory in Phase 1 |
| Navigation failures | Build the nav graph before the first service |
| Performance | 30–40 residents, throttle pathfinding, cache paths |
| Art becomes generic dark space | Warm palette, one-light rule, early screenshots |
| Save fragility | Version, test load, accept a prototype reset |
| Doc drift | This folder is canonical; update component docs with decisions |
| The vote feels arbitrary | Show favourites and reasons before the tally |

---

## Definition of done for the vertical slice

- A new player can start a charter and understand the first three actions
  without a manual.
- A resident visibly chooses a service, enters it, and emerges changed.
- The resident card explains the choice in one line.
- The day report tells a small story, not just numbers.
- Lumen comes from people, not from harvest tiles.
- The world reads as floating islands in a void, with plants only in a dome.
- `npm run check`, the smoke test and the new resident/day scenario pass.
- No old Prism Tide loop remains as the primary objective.

When all of that is true, Phase 1 is done. Then, and only then, add the rivals.
