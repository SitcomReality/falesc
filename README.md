# FALESC

**FALESC: The Confluence — First Light** is a small isometric city-builder on
floating shards in a warm nebula void. Six Tidelanders, one Welcome Post, and a
finite reserve of civic energy: keep people fed, rested, social and curious long
enough for the chapter to flourish.

This build is the **First Light vertical slice**. One home shard plus a Contest commons isle, four
needs, five services, a paused planning day, a deterministic playback, and an
evening broadsheet. A **Contest preview** adds two rival chapters, a shared lumen
economy, shared residents and rival housing on the same shard, ending in a three-day campaign, a **Confluence vote**, a post-vote
**stewardship** promise, a fundable **Commons Beacon** and transient **day visitors**; the full multi-round festival, auctions and a
separate shared-commons layer are the design target beyond that.

Built with vanilla ES modules and [Pixi.js](https://pixijs.com/) 7. There is no
build step: `index.html` loads `src/App.js`, which starts `src/FalescGame.js`,
and an import map points at the vendored Pixi build. Fonts and art are local;
the game makes no network requests at runtime.

> **Status:** the First Light slice is playable end to end: plan, build, watch
> the day, read the report, repeat. Residents arrive, leave when a need or a bed
> goes unmet for days, and can empty the chapter. Balance is generous and not yet
> tuned; only the home shard is playable. A two-rival Contest preview is
> available, with rival upkeep, contributions, housing, Devotion standings, a
> three-day campaign, a final Confluence vote and a stewardship epilogue. The
> full multi-round festival, deeper rival strategy, building layers, auctions,
> systemic stewardship and multiplayer are not implemented. A patronage
> flow overlay is available in the Contest standings card (or `P`). See [docs/known-issues.md](docs/known-issues.md).

## Run it locally

Requirements: Node.js 18+ (only for the dev server and checks). There is nothing
to install.

```bash
npm run dev
# open http://127.0.0.1:5173/
```

If port 5173 is busy the server picks the next free port; use
`npm run dev -- --port 3000 --strict-port` to pin it. The game is a static site,
so any static file server works, but ES modules require `http://`, not `file://`.

## How to play

- Start a charter from the lobby and choose **First Light** (solo) or
  **The Contest** (two AI rivals on the same shard). First Light gives you six
  Tidelanders, a fixed six-bed Welcome Post, 10 lumen and two works. The Contest
  gives each of the three chapters three residents, a four-bed Welcome House,
  15 lumen and two works (rivals get one build work per day). Contest chapters
  also receive a civic dividend of 1 lumen per resident per day. The Canteen is
  armed in both.
- Read the morning bulletin. Arm a service with `1`–`4` (or click a dock card),
  then click a free plot on the home shard and name the place.
- Fund the shared **Commons Beacon** from the HUD card; every chapter can give
  lumen; once lit it eases every resident's needs at night. Its first Assembly
  lets residents petition, each chapter nominate and every resident vote.
- On Contest days, watch for 2–3 **day visitors**. They use services and pay a
  small fee to the chapter whose door they choose. A visitor who likes your
  chapter and a spare bed can begin a one-day trial stay; clicking their name
  opens a card with their needs, affinity and last door. Open a player service and choose **Retrofit** to pick Sunroom, Atelier or
  Night Kitchen. Open services can also switch to Round the clock, Daylight or
  Evening hours.
- In the last three Contest days, choose a **campaign promise** from the
  standings card or the automatic campaign dialog. Rivals publish theirs, and a
  three-day festival programme makes matching services more magnetic.
- Press `P` (or **Show flows** in the Contest standings) to trace each
  resident's last choice from their home door to the service that earned it.
- A service costs lumen and one work. It is `PENDING` for a day and opens at the
  start of the next day. You get **two works per day**.
- Click **Open the day** (or press `E`) to run the day. Playback moves through
  morning, afternoon, evening and night at 1×, 2× or 4×; **Skip** jumps to the
  report.
- The evening report shows visits, hearts, lumen contributions and upkeep, needs
  at dusk, complaints and a few quotes. **Begin Day N** returns to planning with
  a fresh pair of works.
- Spare beds plus a flourishing of at least 20 bring new residents. Meeting
  **12 housed residents and flourishing 62** at the end of a day wins First Light;
  the day limit is the deadline. Fewer than four residents, or missing both goals
  at the limit, loses.

`WASD`/arrows pan, wheel zooms, middle-drag pans, one-finger drag pans and a
two-finger pinch zooms. Click a service for its record, a resident for their
card, or the survey chart to move the camera.

Full controls, needs, economy and limitations:
[docs/gameplay.md](docs/gameplay.md).

## Checks and tests

```bash
npm run check    # dependency-free syntax/import/import-map checks
```

With the shared browser harness available in this workspace:

```bash
webgame_smoke
webgame_smoke --scenario scripts/scenarios/resident-day.mjs
webgame_smoke --scenario scripts/scenarios/economy.mjs
webgame_smoke --scenario scripts/scenarios/persistence.mjs
webgame_smoke --scenario scripts/scenarios/departure.mjs
webgame_smoke --scenario scripts/scenarios/overlay-stack.mjs
webgame_smoke --scenario scripts/scenarios/report-save.mjs
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
webgame_smoke --scenario scripts/scenarios/retrofit.mjs
webgame_smoke --scenario scripts/scenarios/service-hours.mjs
webgame_smoke --scenario scripts/scenarios/bathhouse.mjs
webgame_smoke --scenario scripts/scenarios/commons-isle.mjs
webgame_smoke --scenario scripts/scenarios/victory.mjs
```

The main smoke test drives menu → lobby → planning → build → day playback →
report → resident card → end. Scenarios cover the resident loop, the civic
economy, save v2, determinism, engine/map regressions, demolition, a full
victory, and mobile layout. The CLI equivalents and the manual checklist are in
[docs/testing.md](docs/testing.md).

## Documentation

- [AGENTS.md](AGENTS.md) — concise entry point for coding agents
- [docs/gameplay.md](docs/gameplay.md) — controls, planning, needs, services, economy, victory
- [docs/architecture.md](docs/architecture.md) — runtime, modules, state, day simulation, rendering
- [docs/development.md](docs/development.md) — setup, conventions, vendoring, common tasks
- [docs/testing.md](docs/testing.md) — static checks, smoke test, scenarios, manual checklist
- [docs/known-issues.md](docs/known-issues.md) — current limitations and technical debt
- [docs/design-refinement.md](docs/design-refinement.md) — the refined design and where the build is going
- [docs/design/roadmap.md](docs/design/roadmap.md) — phases, current status and acceptance
- [docs/design-vision.md](docs/design-vision.md) — visual identity, palette, typography, UX guardrails

## Status

Playable First Light vertical slice: seeded floating-shard world, a named cast
of fifteen with six First Light founders (nine Contest founders), four needs,
five service programs, construction
and works, wellbeing-driven lumen with upkeep and closures, deterministic day
playback, an evening report, Devotion and Flourishing, victory/defeat, and
local save v2.

The **Contest preview** is present: two rival chapters build services and
housing, pay upkeep from their own residents' contributions, share the same
residents and occupancy, and compete for Devotion; standings and patronage
appear in the HUD and report. At the day limit the archipelago convenes a
**Campaign and Confluence**: the final three days run a three-event festival
programme where rivals publish promises and the player chooses one; every
resident then votes and the result becomes the charter record. Still absent: a
larger multi-round festival, a separate shared-commons island,
auctions/systemic stewardship and a deeper rival strategy beyond need-pressure
builds/recovery, building layers or retrofit, audio, multiplayer, or a keyboard
build cursor. A patronage-flow overlay traces each resident's last choice from
home to door. The Commons Beacon is now a fundable shared project on the home
shard. See [docs/known-issues.md](docs/known-issues.md).
