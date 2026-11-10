# Testing guide

FALESC has two layers of automated checks and one manual checklist:

1. **Static checks** — fast, no browser, catch syntax and broken imports.
2. **Browser smoke test** — real headless Firefox, full user flow, screenshots.
3. **Manual playtest** — camera/touch/visual checks the harness cannot judge.

The browser harness is a shared workspace tool, not a dependency of this
repository. From the repository root it is at `../webgame-tools/`.

## 1. Quick commands

```bash
# Project-local, dependency-free
npm run check

# Shared browser harness (run from the repo root)
node ../webgame-tools/bin/webgame-harness.mjs doctor
node ../webgame-tools/bin/webgame-harness.mjs check
node ../webgame-tools/bin/webgame-harness.mjs smoke
node ../webgame-tools/bin/webgame-harness.mjs runs
```

The DSH tools `webgame_check`, `webgame_smoke`, `webgame_shot`, and
`webgame_runs` expose the same harness when available.

`webgame_doctor` reports the browser engine, the config, and artifact locations.
It does not launch a browser.

## 2. Static checks

### `npm run check`

`scripts/check.mjs` walks the first-party source (excluding `vendor/`,
`node_modules/`, `.git/`, `.artifacts/`) and checks:

- each `.js`/`.mjs` file parses as an ES module;
- relative imports resolve on disk;
- the `index.html` import map points at local files that exist;
- first-party source has no remote runtime URLs (warnings only).

It is intentionally not a bundler, type checker, or linter.

### Harness `check`

`webgame_check`/`webgame-harness check` adds asset-reference and readiness
checks and writes `.artifacts/webgame/check.json`. It reads
`webgame.config.json` for its `check` settings. It scans the vendored
minified Pixi file but stays below the 2 MB content-scan limit.

Run both before committing; they catch different classes of mistake.

## 3. Browser smoke test

`webgame.config.json` describes a real Firefox run:

- the server is `node scripts/dev-server.mjs --port {port} --strict-port`, so
  the test also proves that `npm run dev` serves the game correctly;
- readiness is `window.__APP_READY__ === true`;
- viewport is 1280×720 at DPR 1;
- external requests must be zero (all dependencies are local);
- page errors are failures, console errors are warnings;
- the harness samples `#minimap` for the canvas-content check.

The current run reports **39/39 checks** (34 scripted steps plus automatic
checks for page errors, console errors, external requests, title, and canvas
content).

### What the steps cover

| Area | Coverage |
| --- | --- |
| Boot | title, first rendered frame, ready flag, no lost WebGL context |
| Navigation | menu → lobby → game, end-game overlay |
| Lobby | deterministic seed `12345`, start-game transition |
| World generation | 6 sectors, 15 characters, minerals present, one build action |
| Build flow | open modal on a free cell, type a name, reserve, `PENDING` state, action spent |
| Turn flow | interstitial, 2 s turn advance, `PENDING → RESERVED` |
| Second turn | `RESERVED → ACTIVE`, turn 3, solid building |
| Camera | zoom-out to 0.2 and map-overview screenshot, restore |
| Modal lifecycle | modal closes when the game ends, cannot build in `END` |
| Rendering | screenshots of playing, pending, active, overview, and end |

### Artifacts

Every run writes a timestamped directory under `.artifacts/webgame/`:

```text
.artifacts/webgame/<timestamp>-falesc/
  report.json          checks, steps, warnings, console/page errors, network
  summary.txt          short human summary
  browser.log          Firefox/WebDriver log
  console.log          captured page console
  playing.png
  building-pending.png
  building-active.png
  map-overview.png
  end.png
  final.png
```

Open `report.json` when a step fails; the failing step's `detail` usually names
the selector or assertion. The browser log is the place to look for WebGL or
module-loading problems.

Useful commands:

```bash
# Visible Firefox window for debugging
node ../webgame-tools/bin/webgame-harness.mjs smoke --headed

# Keep the browser profile
node ../webgame-tools/bin/webgame-harness.mjs smoke --keep-profile

# Recent-run dashboard (writes .artifacts/webgame/index.html)
node ../webgame-tools/bin/webgame-harness.mjs runs

# One screenshot with the config's readiness hook
node ../webgame-tools/bin/webgame-harness.mjs shot --out .artifacts/shot.png
```

Do not commit `.artifacts/`; it is ignored.

## 4. Why `canvasSelectors` is `#minimap`

The Pixi canvas is WebGL. The harness's generic canvas scanner calls
`canvas.getContext('2d')`, which returns `null` for a WebGL canvas, so it cannot
measure painted pixels on the game view. Without an override, every smoke run
would fail the automatic “canvas has content” check with `no 2d context`.

The minimap is a real Canvas2D UI element and is painted whenever the world
exists, so `webgame.config.json` sets:

```json
"canvasSelectors": ["#minimap"]
```

This is a deliberate, documented override. The actual game view is verified by
the screenshots (`playing.png`, `building-active.png`, `map-overview.png`) and
by the `frame`/renderer assertions. If the minimap is removed, update
`canvasSelectors` and add another Canvas2D surface or disable the relevant
check knowingly.

## 5. Manual playtest checklist

Run `npm run dev`, open the printed URL, and check:

- [ ] Menu → Lobby → Start Game shows an island map and 15 characters.
- [ ] WASD/arrow keys pan; the camera stops and starts cleanly.
- [ ] Mouse wheel zooms toward the cursor; zoom stops at 0.2 and 4.
- [ ] Middle-mouse drag pans; releasing outside the window does not leave the
      camera stuck.
- [ ] Clicking a free grid cell opens the build prompt; the name field is
      focused and the camera does not move while typing.
- [ ] Enter reserves, Escape cancels, whitespace-only names become `Untitled`.
- [ ] The minimap shows islands, buildings, and the camera viewport.
- [ ] End Turn shows the interstitial; the building pulses, becomes a ghost,
      then becomes solid on the expected turns.
- [ ] End Game closes an open build prompt and shows the Game Over screen.
- [ ] Return to Menu → Start Game regenerates the world and recentres the
      camera at zoom 1.
- [ ] Resize the window: the camera stays centred on the same world point.
- [ ] Touch (if available): one-finger pan, two-finger pinch, tap-to-build.
- [ ] No console errors during any of the above.

Known expected warning in headless Firefox: a Pixi/WebGL “context was lost”
message may appear in `browser.log`; the screenshots and checks still pass. See
[known-issues.md](known-issues.md#13-webgl-context-loss-is-not-handled).

## 6. Extending the smoke test

Steps live in `webgame.config.json` under `steps`. Each step has a `name` (for
reporting) and exactly one action/assertion. Common forms:

```json
{ "name": "open lobby", "click": "[data-testid=menu-start]" },
{ "name": "wait for game", "waitFor": "window.__falesc.snapshot().state === 'PLAYING'" },
{ "name": "canvas exists", "assert": "window.__falesc.snapshot().frame > 1" },
{ "name": "screenshot", "screenshot": "playing.png" },
{ "name": "type name", "type": "Test Hall", "selector": "[data-testid=build-name]" }
```

Useful selectors are exposed as `data-testid` attributes:

| Selector | Element |
| --- | --- |
| `[data-testid=menu-screen]`, `menu-start`, `menu-join` | menu |
| `[data-testid=lobby-screen]`, `lobby-seed`, `lobby-size`, `lobby-start`, `lobby-back` | lobby |
| `[data-testid=game-hud]`, `end-turn`, `end-game`, `turn-display` | in-game HUD |
| `[data-testid=build-modal]`, `build-name`, `build-submit`, `build-cancel` | build prompt |
| `[data-testid=interstitial-screen]` | turn overlay |
| `[data-testid=end-screen]`, `end-menu` | game over |
| `[data-testid=minimap]` | minimap canvas |

Keep assertions tied to `window.__falesc.snapshot()` or visible DOM, not to
exact pixels, NPC positions, or animation timing. Those are intentionally
procedural.

For a new user-visible feature, add one happy-path step and one edge-case step
where practical (for example, “build succeeds” and “build is rejected after the
action is spent”). Avoid sleeping when `waitFor` can express the condition.

### When to use a scenario file

The JSON steps cover the main flow. If you need loops, computed coordinates, or
custom polling, write an `.mjs` scenario and run it with `--scenario` (or the
`webgame_smoke` tool's `scenario` parameter). The harness page API exposes
`goto`, `reload`, `evaluate`, `click`, `press`, `keyDown`, `keyUp`, `type`,
`pause`, `text`, `count`, `visible`, `title`, `canvasStats`, and `screenshot`.
See the harness's `docs/` for the full contract.

## 7. Visual regression (not enabled)

Pixel regression is **not** enabled. The map layout is seeded, but character
palettes, limb variations, mineral shapes, and NPC decisions use `Math.random()`
and frame timing. A baseline would be flaky, and changing any of that would
require a new baseline rather than catching a regression.

To enable it later:

1. Make the visual path deterministic (seed a shared RNG for character/mineral
   variation and NPC decisions, or add a test-only `Math.random` seed).
2. Add a `visual` block with a stable selector (`#game-hud` or `#minimap`).
3. Capture a baseline with `webgame_visual --update` and commit it under
   `test/baselines/`.
4. Set `visual.createBaseline: false` in CI.

The harness's `webgame_visual` seeds `Math.random`, freezes clocks, and settles
frames, but it cannot make the game's procedural content deterministic by
itself. Do not raise the pixel threshold until the check is meaningless.

## 8. CI

The repository does not commit a CI workflow. To add one, the harness must be
available in the checkout (for example, vendored at `tools/webgame-tools/` or
provided as a submodule), then:

```bash
node tools/webgame-tools/bin/webgame-harness.mjs check
node tools/webgame-tools/bin/webgame-harness.mjs smoke
```

`webgame_ci` can generate a GitHub Actions workflow that installs a browser,
runs the checks, and uploads `.artifacts/webgame/`. CI should use the Playwright
engine if Firefox is unreliable on the runner; the config and steps are engine
agnostic. Keep screenshots and reports as artifacts, not committed files.

## 9. Troubleshooting the test run

| Symptom | Check |
| --- | --- |
| Timeout waiting for readiness | `window.__APP_READY__` is only set after the first completed ticker frame. Look for module/WebGL errors first. |
| `canvas #minimap` not found | The minimap is created in `App`; verify `src/ui/Minimap.js` is imported and `#minimap` is in the DOM. |
| `no 2d context` | `canvasSelectors` is pointing at the WebGL canvas. Point it at `#minimap` or another Canvas2D element. |
| External request failure | A runtime import or asset still points at a CDN. Move it to `vendor/`. |
| Port conflict | The config uses `--strict-port`; another process may be on the harness's chosen port. Stop the other server. |
| Page reloads/loses state | The harness navigates once per run unless a step says `goto`/`reload`; reloading resets a game with no save system. |
| Screenshots look stale | Add a short `sleep` or a `waitFor` after changing camera/state; the screenshot is captured from the next presented frame. |
