# FALESC

**FALESC: The Prism Tide** is a small isometric island city-builder with the
warmth of a 1970s travel poster and the geometry of art deco. Raise a settlement
on the Glass Sea, harvest lumen from living crystals, and finish the Aurora
Beacon before the last tide.

Built with vanilla ES modules and [Pixi.js](https://pixijs.com/) 7. There is no
build step: `index.html` loads `src/App.js` directly and an import map points at
the vendored Pixi build. Fonts and art are local; the game makes no network
requests at runtime.

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

- One **tide** (turn) per day, one build action each tide.
- Structures take two tides to finish: `PENDING → RESERVED → ACTIVE`.
- **Prism Rig** and **Tide Garden** generate lumen each tide once active.
  **Lantern House** generates a little and makes the Beacon cheaper.
- Raise the **Aurora Beacon** and let it become active to win. If the tide limit
  passes first, the charter fails.
- `WASD`/arrows pan, wheel zooms, middle-drag pans, click an empty plot to build.
- Progress autosaves to `localStorage`; the menu offers **Continue charter** after
  a reload.

Full controls and economy: [docs/gameplay.md](docs/gameplay.md).

## Checks and tests

```bash
npm run check    # dependency-free syntax/import/import-map checks
```

With the shared browser harness available in this workspace:

```bash
node ../webgame-tools/bin/webgame-harness.mjs smoke
node ../webgame-tools/bin/webgame-harness.mjs smoke --scenario scripts/scenarios/victory.mjs
```

The main smoke test drives menu → lobby → game → build → turn → end. Scenario
files cover a full victory, save/continue, map packing, NPC land awareness,
camera clamping, turn cancellation, determinism, and mobile layout. See
[docs/testing.md](docs/testing.md).

## Documentation

- [AGENTS.md](AGENTS.md) — concise entry point for coding agents
- [docs/design-vision.md](docs/design-vision.md) — visual identity, palette, type, UX rules
- [docs/architecture.md](docs/architecture.md) — runtime, state, rendering, systems
- [docs/development.md](docs/development.md) — setup, conventions, common tasks
- [docs/testing.md](docs/testing.md) — static checks, smoke tests, scenarios, manual checklist
- [docs/gameplay.md](docs/gameplay.md) — controls, tides, blueprints, victory
- [docs/known-issues.md](docs/known-issues.md) — remaining limitations and risks

## Status

Playable prototype with a complete build/turn/economy loop, victory and defeat,
local autosave, seeded procedural world, and a hand-built HUD. Not yet present:
audio, upgrades, multiplayer, and a fully accessible keyboard build cursor. See [docs/known-issues.md](docs/known-issues.md).
