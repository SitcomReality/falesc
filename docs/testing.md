# Testing guide

FALESC has three layers of automated checks and one manual checklist:

1. **Static checks** — fast, no browser, catch syntax and broken imports.
2. **Browser smoke test** — real headless Firefox, full user flow, screenshots.
3. **Scenario regressions** — victory loop, persistence, map packing, NPC/camera
   engine behaviour, determinism, and mobile layout.
4. **Manual playtest** — camera/touch/visual checks the harness cannot judge.

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

# Engine / UX regressions
node ../webgame-tools/bin/webgame-harness.mjs smoke --scenario scripts/scenarios/victory.mjs
node ../webgame-tools/bin/webgame-harness.mjs smoke --scenario scripts/scenarios/persistence.mjs
node ../webgame-tools/bin/webgame-harness.mjs smoke --scenario scripts/scenarios/map-regression.mjs
node ../webgame-tools/bin/webgame-harness.mjs smoke --scenario scripts/scenarios/engine-regression.mjs
node ../webgame-tools/bin/webgame-harness.mjs smoke --scenario scripts/scenarios/determinism.mjs
node ../webgame-tools/bin/webgame-harness.mjs smoke --scenario scripts/scenarios/affinity.mjs
node ../webgame-tools/bin/webgame-harness.mjs smoke --scenario scripts/scenarios/mobile.mjs --width 390 --height 844
node ../webgame-tools/bin/webgame-harness.mjs smoke --scenario scripts/scenarios/showcase.mjs
```

The DSH tools `webgame_check`, `webgame_smoke`, `webgame_shot`, and
`webgame_runs` expose the same harness when available. In this workspace prefer
`webgame_smoke` with a `scenario` argument over the CLI; the tool path applies the
headless WebGL setup reliably.

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
`webgame.config.json` for its `check` settings. It resolves the local font files,
CSS, and the inline SVG backdrop and confirms there are no external requests.

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

The current run reports **49/49 checks** (44 scripted steps plus automatic
checks for page errors, console errors, external requests, title, and canvas
content).

### What the steps cover

| Area | Coverage |
| --- | --- |
| Boot | title, first rendered frame, ready flag, no lost WebGL context |
| Navigation | menu → lobby → game, end-game overlay |
| Lobby | deterministic seed `12345`, start-game transition |
| World generation | 6 sectors, 15 characters, minerals present, 8 starting lumen, 14-day limit, default blueprint |
| Build flow | free cell, build dialog, typed name, reserve, `PENDING` state, 3-lumen cost paid, action spent |
| Turn flow | interstitial, ~2 s turn advance, `PENDING → RESERVED` |
| Second turn | `RESERVED → ACTIVE`, turn 3, `+2` income |
| Charter menu | open, visible, resume, close |
| Hover | pointer move shows a validated cell highlight and blueprint ghost; pointer leave clears both |
| Keyboard | `1`–`4` arm blueprints through the real validation path |
| Camera | fit-zoom overview screenshot, restore |
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

## 4. Scenario regressions

Scenarios live in `scripts/scenarios/` and are loaded with
`webgame_smoke --scenario <path>` (or the CLI `smoke --scenario`).

| Scenario | What it proves |
| --- | --- |
| `victory.mjs` | A full, real-UI run follows a sensible build order and wins by activating the Aurora Beacon; assertions on end state/title. |
| `persistence.mjs` | A turn and structure are saved, the page reloads, **Continue charter** restores day, lumen, seed, and structure state. |
| `map-regression.mjs` | 72 sampled seeds/sizes produce non-intersecting islands, all shapes inside the world rectangle, and deterministic layouts. |
| `engine-regression.mjs` | 15 NPCs stay on their home island and out of buildings through 3,600 updates; the camera clamps at both extremes; leaving during the interstitial cancels the pending turn. |
| `determinism.mjs` | The same seed produces identical island geometry, character palettes/proportions, and mineral variations across reloads. |
| `affinity.mjs` | A Prism Rig near a crystal gets +1 income, the dialog announces it, and the bonus survives save/continue. |
| `mobile.mjs` | Menu, lobby, HUD, and build dialog are captured at 390×844; the build dialog is visible. |
| `showcase.mjs` | Places one of each blueprint, marks them active, and captures the illustrated structures and HUD for design review. |

`mobile.mjs` is intended to be run with `--width 390 --height 844`. The scenario
does not set the viewport itself. `showcase.mjs` is a visual tool, not a pass/fail
regression; use it when changing building art.

Scenario APIs: the harness `page` object exposes `goto`, `reload`, `evaluate`,
`text`, `count`, `visible`, `click`, `press`, `keyDown`, `keyUp`, `type`,
`pause`, `title`, `canvasStats`, `viewport`, and `screenshot`. Use `assert.ok`,
`assert.equal`, and `log` from the scenario arguments. Return nothing; a thrown
error fails the run.

## 5. Why `canvasSelectors` is `#minimap`

The Pixi canvas is WebGL. The harness's generic canvas scanner calls
`canvas.getContext('2d')`, which returns `null` for a WebGL canvas, so it cannot
measure painted pixels on the game view. Without an override, every smoke run
would fail the automatic “canvas has content” check with `no 2d context`.

The survey chart is a real Canvas2D UI element and is painted even before a world
exists, so `webgame.config.json` sets:

```json
"canvasSelectors": ["#minimap"]
```

This is a deliberate, documented override. The actual game view is verified by
the screenshots and by the `frame`/renderer assertions. If the chart is removed,
update `canvasSelectors` and add another Canvas2D surface or disable the relevant
check knowingly.

## 6. Manual playtest checklist

Run `npm run dev`, open the printed URL, and check:

- [ ] Menu: sunset scene, local display/UI fonts load, New charter and (after a
      save) Continue charter work. No layout overflow at 1280×720.
- [ ] Lobby: seed, Roll, size cards, Sign the charter, Back to the water.
- [ ] Menu → Lobby → Start Game shows an island map, 15 characters, crystals,
      rocks, palms, and the HUD; an occasional Tidelander speech bubble appears
      after a while.
- [ ] WASD/arrow keys pan; the camera stops cleanly at the cluster edge.
- [ ] Mouse wheel zooms toward the cursor; zoom respects camera min/max.
- [ ] Middle-mouse drag pans; releasing outside the window does not leave the
      camera stuck.
- [ ] Click a blueprint card; clicking a free grid cell opens the build dialog.
      The name field is focused, Tab stays inside the dialog, Escape cancels.
- [ ] Enter reserves, a failed build keeps the dialog open with a reason,
      whitespace-only names fall back to the blueprint name.
- [ ] Lumen and action count update; cards disable when unaffordable or spent.
- [ ] End Turn shows the interstitial, income/structures, then the next day.
- [ ] The structure is ghosted/`RESERVED`, then solid/`ACTIVE` on the expected
      turns; the survey chart updates.
- [ ] Raise the Beacon (or use the victory scenario) and confirm the victory end
      screen. Abandon a run and confirm the record screen.
- [ ] Reload during a run and use Continue charter: day, lumen, structures, and
      camera survive.
- [ ] Resize the window and check the camera and HUD; use a narrow phone viewport
      (390×844) and check the menu, lobby, HUD, and build dialog.
- [ ] No console errors during any of the above.

Known expected warning in headless Firefox: a Pixi/WebGL “context was lost”
message may appear in `browser.log`; the screenshots and checks still pass. See
[known-issues.md](known-issues.md#5-webgl-context-loss-is-not-handled).

## 7. Extending the smoke test

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
| `[data-testid=menu-screen]`, `menu-start`, `menu-continue`, `menu-join` | menu |
| `[data-testid=lobby-screen]`, `lobby-seed`, `lobby-size`, `lobby-start`, `lobby-back`, `lobby-random-seed` | lobby |
| `[data-testid=game-hud]`, `hud-menu`, `charter-menu`, `resume-game`, `end-game`, `end-turn`, `turn-display` | in-game HUD |
| `[data-testid=blueprint-prism-rig]`, `blueprint-tide-garden`, `blueprint-lantern-house`, `blueprint-aurora-beacon` | build dock cards |
| `[data-testid=build-modal]`, `build-name`, `build-submit`, `build-cancel`, `build-close` | build prompt |
| `[data-testid=interstitial-screen]` | tide overlay |
| `[data-testid=end-screen]`, `end-menu`, `end-retry` | game over / record |
| `[data-testid=minimap]` | survey chart canvas |

Keep assertions tied to `window.__falesc.snapshot()` or visible DOM, not to
exact pixels, NPC positions, or animation timing. Those are procedural.

For a new user-visible feature, add one happy-path step and one edge-case step
where practical. Avoid sleeping when `waitFor` can express the condition.

### When to use a scenario file

JSON steps cover the main flow. If you need loops, computed coordinates, reloads,
dynamic imports, or custom polling, write an `.mjs` scenario and run it with
`--scenario` (or `webgame_smoke`'s `scenario` parameter). See the existing files
for the page API contract.

## 8. Visual regression

Pixel regression is **not enabled**. The world geometry and palettes are now
seeded, but character animation phase and NPC positions still depend on elapsed
frame time, so a full-viewport baseline would be flaky. The survey chart and
static HUD are stable enough to baseline in a future pass.

To enable it later:

1. Pause or fix the simulation clock (or capture the survey chart only) so the
   frame is repeatable.
2. Add a `visual` block with a stable selector (`#minimap` or `.build-dock`).
3. Capture a baseline with `webgame_visual --update` and commit it under
   `test/baselines/`.
4. Set `visual.createBaseline: false` in CI.
5. Do not raise the pixel threshold until the check is meaningless.

The harness's `webgame_visual` seeds `Math.random`, freezes clocks, and settles
frames, but it cannot make the game's animation phase deterministic by itself.

## 9. CI

The repository does not commit a CI workflow. To add one, the harness must be
available in the checkout (for example, vendored at `tools/webgame-tools/` or
provided as a submodule), then:

```bash
node tools/webgame-tools/bin/webgame-harness.mjs check
node tools/webgame-tools/bin/webgame-harness.mjs smoke
node tools/webgame-tools/bin/webgame-harness.mjs smoke --scenario scripts/scenarios/victory.mjs
```

CI should use the Playwright engine if Firefox is unreliable on the runner; the
config, scenarios, and steps are engine agnostic. Keep screenshots and reports
as artifacts, not committed files.

## 10. Troubleshooting the test run

| Symptom | Check |
| --- | --- |
| Timeout waiting for readiness | `window.__APP_READY__` is only set after the first completed ticker frame. Look for module/WebGL errors first. |
| `canvas #minimap` not found | The survey chart is created in `App`; verify `src/ui/Minimap.js` is imported and the mount exists. |
| `no 2d context` | `canvasSelectors` is pointing at the WebGL canvas. Point it at `#minimap`. |
| External request failure | A runtime import, font, or CSS asset still points at a CDN. Move it under `assets/` or `vendor/`. |
| Port conflict | The config uses `--strict-port`; another process may be on the harness's chosen port. Stop the other server. |
| Page reloads/loses state | Check `falesc.save.v1` in localStorage and the Continue button. A failed save should be cleared, not half-loaded. |
| Screenshots look stale | Add a short `sleep` or a `waitFor` after changing camera/state; the screenshot is captured from the next presented frame. |
| WebGL “Unable to auto-detect a suitable renderer” | Environment-level WebGL exhaustion; retry the run. The browser smoke normally gets a software context. |
