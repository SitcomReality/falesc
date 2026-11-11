# FALESC

**FALESC: The Confluence — First Light** is a small isometric city-builder on
floating shards in a warm nebula void. Six Tidelanders, one Welcome Post, and a
finite reserve of civic energy: keep people fed, rested, social and curious long
enough for the chapter to flourish.

This build is the **First Light vertical slice**. One playable home shard, four
needs, four services, a paused planning day, a deterministic playback, and an
evening broadsheet. A **Contest preview** adds two rival chapters and shared
residents on the same shard; the full shared commons, rival economy and the
Confluence vote are the design target beyond that.

Built with vanilla ES modules and [Pixi.js](https://pixijs.com/) 7. There is no
build step: `index.html` loads `src/App.js`, which starts `src/FalescGame.js`,
and an import map points at the vendored Pixi build. Fonts and art are local;
the game makes no network requests at runtime.

> **Status:** the First Light slice is playable end to end: plan, build, watch
> the day, read the report, repeat. Residents arrive, leave when a need or a bed
> goes unmet for days, and can empty the chapter. Balance is generous and not yet
> tuned; only the home shard is playable. A two-rival Contest preview is
> available, but rival upkeep, housing competition and the Confluence vote are
> not implemented. Building layers, auctions and multiplayer are also absent.
> See [docs/known-issues.md](docs/known-issues.md).

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
  **The Contest** (two AI rivals on the same shard). Day 1 gives you six
  Tidelanders, a fixed Welcome Post with six beds, 10 lumen, two works, and the
  Canteen armed.
- Read the morning bulletin. Arm a service with `1`–`4` (or click a dock card),
  then click a free plot on the home shard and name the place.
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
of fifteen with six founders, four needs, four service programs, construction
and works, wellbeing-driven lumen with upkeep and closures, deterministic day
playback, an evening report, Devotion and Flourishing, victory/defeat, and
local save v2.

The **Contest preview** is present: two rival chapters build services, shared
residents choose between them, Devotion standings and patronage appear in the
HUD and report, and the day limit crowns the most-beloved chapter. Still absent:
rival upkeep/economy and housing competition, the full shared commons, the
Confluence vote, building layers or retrofit, auctions, audio, multiplayer, or a
keyboard build cursor. The Commons Beacon silhouette exists as endgame art but
is not buildable. See [docs/known-issues.md](docs/known-issues.md).
