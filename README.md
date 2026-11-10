# FALESC

An isometric island city-builder prototype built with vanilla ES modules and
[Pixi.js](https://pixijs.com/) 7. There is no build step: `index.html` loads
`src/App.js` directly and an import map points at the vendored Pixi build.

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

## Checks and tests

```bash
npm run check    # dependency-free syntax/import/import-map checks
```

With the shared browser harness available in this workspace:

```bash
node ../webgame-tools/bin/webgame-harness.mjs smoke
```

The browser smoke test drives the full menu → lobby → game → build → turn →
end-game flow and writes screenshots to `.artifacts/webgame/`. See
[docs/testing.md](docs/testing.md).

## Documentation

- [AGENTS.md](AGENTS.md) — concise entry point for coding agents
- [docs/architecture.md](docs/architecture.md) — runtime, state, rendering, systems
- [docs/development.md](docs/development.md) — setup, conventions, common tasks
- [docs/testing.md](docs/testing.md) — static checks, smoke tests, manual checklist
- [docs/gameplay.md](docs/gameplay.md) — controls, turns, building lifecycle
- [docs/known-issues.md](docs/known-issues.md) — known limitations and risks

## Status

This is a prototype. There is no save/load, no economy or win condition, and
multiplayer is a placeholder. See [docs/known-issues.md](docs/known-issues.md)
before planning larger work.
