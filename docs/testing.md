# Testing guide

FALESC has four layers of checks:

1. **Static checks** — fast, no browser, catch syntax and broken imports.
2. **Browser smoke test** — real headless Firefox, full user flow, screenshots.
3. **Scenario regressions** — resident loop, economy, saves, determinism, map
   packing, engine behaviour, demolition, a full victory and mobile layout.
4. **Manual playtest** — camera, touch, visual and narrative checks the harness
   cannot judge.

The browser harness is a shared workspace tool, not a dependency of this
repository. From the repository root it is at `../webgame-tools/`.

## 1. Quick commands

```bash
# Project-local, dependency-free
npm run check

# Main smoke: menu → lobby → planning → build → day → report → resident → end
webgame_smoke

# Scenario regressions
webgame_smoke --scenario scripts/scenarios/resident-day.mjs
webgame_smoke --scenario scripts/scenarios/economy.mjs
webgame_smoke --scenario scripts/scenarios/persistence.mjs
webgame_smoke --scenario scripts/scenarios/determinism.mjs
webgame_smoke --scenario scripts/scenarios/engine-regression.mjs
webgame_smoke --scenario scripts/scenarios/map-regression.mjs
webgame_smoke --scenario scripts/scenarios/demolition.mjs
webgame_smoke --scenario scripts/scenarios/showcase.mjs
webgame_smoke --scenario scripts/scenarios/victory.mjs
webgame_smoke --scenario scripts/scenarios/mobile.mjs --width 390 --height 844

# CLI equivalents (run from the repo root)
node ../webgame-tools/bin/webgame-harness.mjs doctor
node ../webgame-tools/bin/webgame-harness.mjs check
node ../webgame-tools/bin/webgame-harness.mjs smoke
node ../webgame-tools/bin/webgame-harness.mjs runs
```

The DSH tools `webgame_check`, `webgame_smoke`, `webgame_shot` and
`webgame_runs` expose the same harness when available. In this workspace prefer
`webgame_smoke` with a `scenario` argument over the CLI; the tool path applies
the headless WebGL setup reliably. `webgame_doctor` reports the browser engine,
the config and artifact locations without launching a browser.

## 2. Static checks

### `npm run check`

`scripts/check.mjs` walks the first-party source (excluding `vendor/`,
`node_modules/`, `.git/`, `.artifacts/`) and checks:

- each `.js`/`.mjs` file parses as an ES module;
- relative imports (static and string-literal dynamic imports) resolve on disk;
- the `index.html` import map points at local files that exist;
- first-party source has no remote runtime URLs (warnings only).

It is intentionally not a bundler, type checker or linter.

### Harness `check`

`webgame_check`/`webgame-harness check` adds asset-reference and readiness
checks and writes `.artifacts/webgame/check.json`. It reads
`webgame.config.json` for its `check` settings, resolves local fonts, CSS and the
inline SVG backdrop, and confirms there are no external requests.

Run both before committing; they catch different classes of mistake.

## 3. Browser smoke test

`webgame.config.json` describes a real Firefox run:

- the server is `node scripts/dev-server.mjs --port {port} --strict-port`, so
  the test also proves that `npm run dev` serves the game correctly;
- readiness is `window.__APP_READY__ === true`;
- viewport is 1280×720 at DPR 1;
- external requests must be zero (all dependencies are local);
- page errors are failures; console errors are warnings;
- the harness samples `#minimap` for the canvas-content check.

A green run reports **71 checks**: 66 scripted steps plus automatic readiness,
page-error, console, external-request and canvas checks. (The exact total moves
when steps are added; read `report.json` rather than the number.)

### What the steps cover

| Area | Coverage |
| --- | --- |
| Boot | page ready, title, first rendered frame, no lost WebGL context |
| Navigation | menu → lobby → playing, charter menu, end screen |
| Lobby | deterministic seed `12345`, start-charter transition |
| Founding state | 6 residents, 1 Welcome Post, 10 lumen, 2 works, housing capacity 6, Canteen armed |
| Bulletin | morning bulletin visible, dismiss to planning |
| Keyboard | `1`–`4` arm services through the real validation path |
| Hover | pointer move shows a validated highlight and ghost; pointer leave clears both |
| Build flow | free cell, build dialog, typed name, break ground, `PENDING`, cost paid, work spent |
| Day flow | day playback screen, 4× speed, Skip, report with contributions and upkeep |
| Overnight | Canteen becomes `ACTIVE`, works reset to 2 |
| Residents | roster opens, card shows Devotion, Home and Last choice; a resident visits the Canteen, enters, leaves a why line |
| Camera | fit-zoom overview screenshot, restore |
| Modals | build modal closes when the charter ends; no building in `END` |
| Rendering | screenshots of playing, pending, playback, report, resident card, resident report, overview, end |

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
  day-playback.png
  day-report.png
  resident-card.png
  resident-report.png
  map-overview.png
  end.png
  final.png
```

Open `report.json` when a step fails; the failing step's `detail` usually names
the selector or assertion. Look in `browser.log` for WebGL or module-loading
problems.

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
| `save-transfer.mjs` | Exports the current charter as JSON, rejects an invalid file, imports it back and restores the report phase. |
| `chart-link.mjs` | Opens a chart URL into the lobby and checks the copied link carries seed, size and mode. |
| `chapter-name.mjs` | Signs a charter as The Long Table, checks the player chapter name and confirms it survives save/reload. |
| `open-charter.mjs` | Starts Open Charter, checks the HUD objective and day label, plays past the old limit and confirms no ending. |
| `charter-archive.mjs` | Abandons a live charter, checks the menu archive and its day/outcome/mode record, clears it and hides the menu button. |
| `legacy-menu.mjs` | Seeds a stewardship legacy, checks the menu card and effect text, then clears it and verifies storage is empty. |
| `departure-archive.mjs` | Records a departure, opens the Past residents archive from the pause menu, checks the day/reason/last door and closes it. |
| `return-menu.mjs` | Builds a Canteen, uses Save & menu, checks Continue/Export and returns to the same pending build and day. |
| `mobile-hud.mjs` | Runs the HUD at 390×844, checks no horizontal overflow, opens the charter menu and need survey, and captures the phone layout. |
| `high-contrast.mjs` | Toggles high contrast from the pause menu, checks the root class and storage, then confirms it survives reload and can be turned off. |
| `reduced-motion.mjs` | Toggles reduced motion from the pause menu, checks the document class and storage, reloads and toggles it back. |
| `onboarding-hints.mjs` | Checks the Canteen hint, the pending Canteen hint and the next Tea House hint after activation. |
| `grid-summary.mjs` | Opens the grid summary in Contest mode, checks three isle tables, occupied cells and cell labels, then closes it. |
| `daily-request.mjs` | Checks the daily request line and resident link, forces a Wonder request, plays the day and confirms the unmet result in the report. |
| `resident-roster.mjs` | Pushes a resident into crisis, opens the roster, checks six rows and the red row, then opens that resident’s card. |
| `milestones.mjs` | Seeds an all-time milestone, builds a Canteen, checks current/lifetime states and the earned marker, then closes the checklist. |
| `charter-journal.mjs` | Builds a Canteen, checks the journal entry, opens the journal from the pause menu and confirms it survives save/reload. |
| `care-watch.mjs` | Pushes a resident into crisis, checks the Care watch count, opens the need survey, clicks the at-risk resident and opens their card. |
| `charter-ledger.mjs` | Plays two days, checks the daily rows and sparkline, then reloads and confirms the history persists. |
| `need-survey.mjs` | Opens the need survey after a day, checks all four rows, urgency/capacity text and closes it. |
| `field-guide.mjs` | Opens the almanac from the menu and the pause menu, checks the service/policy/control sections, and closes it. |
| `sound-toggle.mjs` | Opens the charter menu, turns the procedural soundscape on and off, checks persistence and the audio context. |
| `keyboard-cursor.mjs` | Toggles the keyboard build cursor, moves it with arrows, opens the build dialog with Enter, and confirms a pending build. |
| `photo-mode.mjs` | Enters Photo mode, checks the HUD is hidden and the exit control appears, then exits by button and Escape. |
| `dock-counts.mjs` | Builds two Canteens and checks the dock badges show 2 Canteens and 1 Welcome House. |
| `playback-pause.mjs` | Opens a day, pauses and confirms the clock is frozen, resumes, then skips to the report. |
| `resident-day.mjs` | A Tidelander is scheduled into the Canteen, walks and enters during playback, emerges with a lower need, remembers the visit, and the card quotes the why line. |
| `economy.mjs` | Founding state is 10 lumen / 2 works / 6 residents; two builds cost 8 lumen and both works; the report satisfies `lumenAfter = prior + contributions − upkeep`; a new house adds beds and arrivals; both services open overnight. |
| `persistence.mjs` | Save v2 holds day 3, lumen, works, services, residents, needs and last choice; reload + **Continue charter** restores them, the Canteen comes back `ACTIVE`, a resident card renders without NaN, and a new build gets a non-colliding service id. |
| `determinism.mjs` | The same seed, actions and day produce byte-identical reports, resident needs, service visits/hearts and quote lines across two full runs. |
| `engine-regression.mjs` | During playback, visible residents stay on the home shard; clicking the survey chart moves the camera; the camera clamps at both extremes; leaving during `DAY` lands in `MENU` with no late transition. |
| `map-regression.mjs` | 72 maps (24 seeds × 3 sizes) have the expected sector counts, non-overlapping island AABBs, all shapes inside the world rectangle, and deterministic layouts. |
| `demolition.mjs` | Clicking an occupied plot opens the service record; dismantling a 4-lumen Canteen refunds 2, removes it, and frees the plot. |
| `contest.mjs` | Lobby Contest mode creates two rival chapters with Welcome Houses and opening services; each chapter starts with three residents; residents visit rival doors; standings/patronage/Devotion appear; rival upkeep is charged; a rival grows by housing new arrivals; the player Canteen earns visits; rival moves occur; the patronage-flow overlay draws one arc per last choice; the contest restores after reload, then the day limit convenes the Confluence; the player makes a pledge, every resident votes, and a player victory proceeds to a stewardship choice before the charter ending. |
| `garden-isle.mjs` | Builds a player service on the third garden isle, verifies garden placement, the garden shuttle gate, cross-island visits and save/reload. |
| `commons-isle.mjs` | Builds a shared Bathhouse on the second commons isle, verifies reserved shuttle gates, commons ownership, cross-island visits, the shared service card and save/reload. |
| `building-finishes.mjs` | Builds a Grand canteen and a Humble tea house, checks cost/capacity/upkeep, the finish in the service record, and save/reload. |
| `creche.mjs` | Builds the ninth service, the 2×2 Creche for Company + Rest, checks the dock shortcut, capacity/cost, visits and save/reload. |
| `observatory.mjs` | Builds the eighth service, the 2×2 night Observatory, checks the dock shortcut, capacity/cost, visits and save/reload. |
| `amphitheatre.mjs` | Builds the seventh service, the 2×2 Amphitheatre, checks the dock shortcut, capacity/cost, visits and save/reload. |
| `clinic.mjs` | Builds the sixth service, the 2×2 Clinic, checks the dock shortcut, capacity/cost, cross-day visits and save/reload. |
| `bathhouse.mjs` | Builds the fifth service, checks its 2×2 footprint, capacity 5, late opening, visits and saved state. |
| `service-district.mjs` | Builds three connected services, checks the named district/bonus and world label, the service record and save/reload. |
| `service-adjacency.mjs` | Builds a player canteen beside a rival service, checks the mixed-neighbour quality bonus, the service record and save/reload. |
| `service-floors.mjs` | Builds a Canteen, opens the interior stack, adds Dormer and Roof Garden floors, checks capacity/upkeep/quality and reload persistence. | Adds a Dormer and a Roof Garden to an active canteen, checks floor plans, capacity/quality/upkeep/lumen, the floor button hiding at three floors, the world stack and save/reload. |
| `housing-residents.mjs` | Opens the Welcome Post record, checks Residents here, a six-bed ground floor and opens a resident. |
| `service-rename.mjs` | Renames a Canteen to The Long Table, checks the title and confirms the name saves. |
| `service-regulars.mjs` | Visits a Canteen for a day, opens its record, checks the Last seen here names and opens a resident from the list. |
| `repair-all.mjs` | Wears two services, repairs all from the pause menu and checks both are full and 6 lumen spent. |
| `report-worn.mjs` | Wears the Welcome Post, opens a day and checks the report warns Worn at 40%. |
| `service-condition.mjs` | Wears a Canteen to 42%, checks the wear row and repair button, repairs it for 3 lumen and confirms the condition saves. |
| `service-focus.mjs` | Builds a Clinic, sets Focus to Rest first, checks the policy and confirms it saves. |
| `service-access.mjs` | Switches a canteen through Visitors first and Care first, checks the policies and save/reload without changing capacity. |
| `service-vibe.mjs` | Switches a working canteen from Efficient to Lively, checks the policy and save/reload without changing capacity or upkeep. |
| `service-hours.mjs` | Switches an open canteen to Round the clock, checks +2 upkeep and save/reload. |
| `retrofit.mjs` | Builds a canteen, waits for it to open, opens the retrofit chooser, installs the Atelier, checks +0.22 quality/+1 upkeep (capacity unchanged) and save/reload. |
| `commons-rival-work.mjs` | Funds the capital, advances a day, and checks a rival breaks ground on the commons with its builder name and save/reload. |
| `commons-rival-capital.mjs` | Advances a day, checks both rivals put 1 lumen into the shared capital budget, and checks the contributors survive reload. |
| `commons-annex.mjs` | Lights the Beacon, adds a capital-funded annex, checks level/capacity/capital, hides the button at two annexes and reloads. |
| `commons-capital.mjs` | Gives 10 lumen to the shared capital budget, builds a commons canteen entirely from it, and checks the remaining capital and save/reload. |
| `commons-purse.mjs` | Builds two shared works, checks the levy and upkeep, verifies the shared doors close together, then tops up the purse manually and reopens them. |
| `commons-repair.mjs` | Forces the Repair Corps policy, checks the repair price is 1 lumen and that a repair restores the service. |
| `commons-assembly.mjs` | Lights the Beacon, checks the petition, nominates Open Beds, lets residents vote, verifies the policy applies to existing and new services, then calls a second reading and checks capacity does not stack. |
| `festival-surge.mjs` | Starts a campaign day and confirms one extra festival visitor is added to the day's arrivals. |
| `visitor-referral.mjs` | Charms a visitor, checks the one-day referral and confirms one extra visitor arrives before the referral resets. |
| `visitor-return.mjs` | Charmed but unhoused visitors are remembered up to two, return on a later day with the same name/affinity, and are marked returning in the report. |
| `visitor-stay.mjs` | Builds a player canteen and spare bed, opens the visitor card, starts a one-day trial stay, checks the bed is held, the trial survives reload, and the guest resolves into a resident after the trial day. |
| `visitors.mjs` | Verifies 2–3 day visitors arrive with the Contest day, get crowd agents, remain outside the resident population, use services, pay visitor fees into chapter ledgers, appear in the report, and leave when the next day starts unless invited to stay. |
| `commons.mjs` | Verifies the reserved Beacon site, HUD fund card, contribution modal, player gifts, activation, nightly comfort report, and save/reload of the active shared project. |
| `contest-season.mjs` | Plays all 14 medium Contest days with a deterministic player build plan, records the daily economy/population trajectory, crosses the campaign, votes in the Confluence and chooses stewardship. This is the full-season balance/regression probe. |
| `campaign.mjs` | Crosses into the campaign through the real report flow, verifies the three-day festival programme and both rival promises, chooses and locks a promise matching the first event, checks the HUD and bulletin, plays the event day and verifies it in the report, reloads, then convenes the Confluence with that promise selected, votes, and chooses a stewardship promise before the ending. |
| `confluence-defeat.mjs` | Forces a Host-majority electorate, convenes the Confluence, verifies the rival wins the vote, skips player stewardship and ends on the defeat composition. |
| `contest-recovery.mjs` | A rival Garden Dome is closed and affordable; the next day the rival reopens it, then resumes a need-pressure build (housing) the following day. |
| `overlay-stack.mjs` | Nested bulletin + resident modals keep the body lock and HUD `inert` until the stack is empty; focus moves into the top modal. |
| `report-save.mjs` | The report is saved in `REPORT`; reload + Continue reopens the same report and Begin Day advances from it without replaying the day. |
| `departure.mjs` | Removing all beds leaves six residents homeless; one night is a warning, the second removes every resident and agent, empties the population, and records a defeat. |
| `corrupt-save.mjs` | A parseable v2 payload with the wrong service shape is discarded; Continue stays hidden and the key is removed. |
| `abandon-confirm.mjs` | The first Abandon click asks for confirmation and keeps the run alive; cancel returns to play; the second confirm reaches the end screen. |
| `victory.mjs` | A full, real-UI medium charter plans services until it reaches 12 housed residents + flourishing 62, closes the charter, and reports `victory`. |
| `showcase.mjs` | Visual tool: places one of each service, marks them open, and captures the illustrated shard and a day for design review. Not a pass/fail regression. |
| `mobile.mjs` | Captures menu, lobby, HUD and build dialog at a narrow viewport; the build dialog must be visible. Run with `--width 390 --height 844`. |

`mobile.mjs` does not set the viewport itself; pass the dimensions. The old
`affinity.mjs` is deleted with the crystal-affinity economy. `victory.mjs` no
longer raises an Aurora Beacon; it earns the First Light goals.
`engine-regression.mjs` no longer drives 3,600 steering updates or a turn
scheduler; it verifies precomputed resident playback, camera clamp and clean
phase exit. `persistence.mjs` and `determinism.mjs` were rewritten for save v2
and the day report. `demolition.mjs`, `showcase.mjs` and `mobile.mjs` were
adapted to services and the new screens.

Scenario APIs: the harness `page` object exposes `goto`, `reload`, `evaluate`,
`text`, `count`, `visible`, `click`, `press`, `keyDown`, `keyUp`, `type`,
`pause`, `title`, `canvasStats`, `viewport` and `screenshot`. Use `assert.ok`,
`assert.equal` and `log` from the scenario arguments. Return nothing; a thrown
error fails the run.

## 5. Why `canvasSelectors` is `#minimap`

The Pixi canvas is WebGL. The harness's generic canvas scanner calls
`canvas.getContext('2d')`, which returns `null` for a WebGL canvas, so it cannot
measure painted pixels on the game view. Without an override, every smoke run
would fail the automatic "canvas has content" check with `no 2d context`.

The survey chart is a real Canvas2D UI element painted even before a world
exists, so `webgame.config.json` sets:

```json
"canvasSelectors": ["#minimap"]
```

This is a deliberate, documented override. The actual game view is verified by
screenshots and the frame/renderer assertions. If the chart is removed, update
`canvasSelectors` and add another Canvas2D surface or disable the relevant check
knowingly.

## 6. Manual playtest checklist

Run `npm run dev`, open the printed URL, and check:

- [ ] Menu: warm void backdrop, local display/UI fonts, New charter and (after a
      save) Continue charter. No layout overflow at 1280×720.
- [ ] Lobby: seed, Roll, size cards (small/medium/large), survey readout, Sign
      the charter, Back to the drift.
- [ ] Start: 6 residents visible on the home shard, Welcome Post, 10 lumen,
      2 works, Canteen armed, First Light progress 6/12 and flourishing.
- [ ] Morning bulletin appears with an unmet need, a chapter/arrival/complaint
      item and a quote; Begin planning closes it.
- [ ] WASD/arrow keys pan; the camera stops cleanly at the cluster edge.
- [ ] Wheel zooms toward the cursor; zoom respects the camera min/max.
- [ ] Middle-drag pans; releasing outside the window does not leave it stuck.
- [ ] `1`–`4` arm each service; a free plot shows a mint highlight and ghost,
      an occupied/other-island plot shows coral or a toast.
- [ ] Build dialog: name focused, Tab stays inside, Escape cancels, Enter breaks
      ground, whitespace falls back to the program name.
- [ ] A built service is `PENDING`, ghosted and scaffolded; lumen and works
      update; the dock disables what you cannot afford.
- [ ] Clicking the service opens its record; the Welcome Post cannot be
      dismantled; dismantling another refunds half cost and frees the plot.
- [ ] Open the day: the strip shows morning/afternoon/evening/night, `1×`/`2×`/
      `4×` work, and Skip lands on the evening report.
- [ ] Report: visits, hearts, contributions, upkeep, lumen, flourishing, needs,
      doors/visits, quotes, complaints and any closures. Begin Day N returns to
      planning.
- [ ] Completed construction is `ACTIVE` on the next planning day; works are
      back to 2; spare beds and flourishing can produce arrivals.
- [ ] `B` opens the bulletin, `R` opens the resident roster, the card shows
      needs, traits, home, Devotion, wellbeing, last choice and the why line,
      and Previous/Next cycle residents.
- [ ] Clicking a visible resident opens the same card; clicking a service door
      opens the service record.
- [ ] Escape / ☰ opens the charter menu; Return to planning and Abandon charter
      both behave, and the end screen shows the run's people and numbers.
- [ ] Reload during planning and use Continue charter: day, lumen, works,
      services, needs and last choice survive. Reload during playback/report
      returns to the last planning save (expected).
- [ ] Resize the window and check the camera and HUD; use a narrow viewport
      (390×844) and check the menu, lobby, HUD and build dialog.
- [ ] No console errors during any of the above.

Known expected warning in headless Firefox: a Pixi/WebGL "context was lost"
message may appear in `browser.log`; the screenshots and checks still pass. See
[known-issues.md](known-issues.md).

## 7. Extending the smoke test

Steps live in `webgame.config.json` under `steps`. Each step has a `name` (for
reporting) and exactly one action/assertion. Common forms:

```json
{ "name": "open lobby", "click": "[data-testid=menu-start]" },
{ "name": "wait for planning", "waitFor": "window.__falesc.snapshot().state === 'PLAYING'" },
{ "name": "first frame", "assert": "window.__falesc.snapshot().frame > 1" },
{ "name": "screenshot", "screenshot": "playing.png" },
{ "name": "type name", "type": "Test Canteen", "selector": "[data-testid=build-name]" }
```

Useful selectors are exposed as `data-testid` attributes:

| Selector | Element |
| --- | --- |
| `[data-testid=menu-screen]`, `menu-start`, `menu-continue`, `menu-join` | menu |
| `[data-testid=lobby-screen]`, `lobby-seed`, `lobby-size`, `lobby-start`, `lobby-back`, `lobby-random-seed` | lobby |
| `[data-testid=game-hud]`, `hud-menu`, `charter-menu`, `resume-game`, `end-game`, `end-turn`, `turn-display`, `open-bulletin`, `open-residents` | planning HUD and charter menu |
| `[data-testid=program-housing]`, `program-canteen`, `program-tea-house`, `program-garden-dome` | service dock cards |
| `[data-testid=build-modal]`, `build-name`, `build-submit`, `build-cancel`, `build-close` | build dialog |
| `[data-testid=structure-modal]`, `structure-demolish`, `structure-reopen`, `structure-cancel`, `structure-close` | service record |
| `[data-testid=day-screen]`, `day-speed-1`, `day-speed-2`, `day-speed-4`, `day-skip` | day playback |
| `[data-testid=bulletin-modal]`, `bulletin-continue` | morning bulletin |
| `[data-testid=resident-modal]`, `resident-prev`, `resident-next`, `resident-close` | resident card |
| `[data-testid=report-screen]`, `report-continue` | evening report |
| `[data-testid=end-screen]`, `end-menu`, `end-retry` | end screen |
| `[data-testid=minimap]` | survey chart canvas |

Keep assertions tied to `window.__falesc.snapshot()` or visible DOM, not to exact
pixels, resident positions or animation timing. Those are procedural.

For a new user-visible feature, add one happy-path step and one edge-case step
where practical. Avoid sleeping when `waitFor` can express the condition.

### When to use a scenario file

JSON steps cover the main flow. If you need loops, computed coordinates,
reloads, dynamic imports or custom polling, write an `.mjs` scenario and run it
with `--scenario` (or `webgame_smoke`'s `scenario` parameter). See the existing
files for the page API contract.

## 8. Visual regression

Pixel regression is **not enabled**, and no baseline is committed. The map and
cast are seeded, but character animation phase, chatter and ambient timing still
depend on elapsed frame time, so a full-viewport baseline would be flaky. The
survey chart and static HUD are the most stable candidates for a future pass.

To enable it later:

1. Pause or fix the ambient clock (or capture the survey chart only) so the frame
   is repeatable.
2. Add a `visual` block with a stable selector (`#minimap` or `.build-dock`).
3. Capture a baseline with `webgame_visual --update` and commit it under a
   documented baselines directory.
4. Set `visual.createBaseline: false` in CI.
5. Do not raise the pixel threshold until the check is meaningless.

The harness's `webgame_visual` seeds `Math.random`, freezes clocks and settles
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
config, scenarios and steps are engine agnostic. Keep screenshots and reports as
artifacts, not committed files.

## 10. Troubleshooting the test run

| Symptom | Check |
| --- | --- |
| Timeout waiting for readiness | `window.__APP_READY__` is only set after the first completed ticker frame. Look for module/WebGL errors first. |
| `canvas #minimap` not found | The survey chart is created in `FalescGame`; verify `src/ui/Minimap.js` is imported and the mount exists. |
| `no 2d context` | `canvasSelectors` is pointing at the WebGL canvas. Point it at `#minimap`. |
| External request failure | A runtime import, font or CSS asset still points at a CDN. Move it under `assets/` or `vendor/`. |
| Port conflict | The config uses `--strict-port`; another process may be on the harness's chosen port. Stop the other server. |
| Day screen never appears | Check that `window.__falesc.openDay()` returned true: a blocking modal or a non-`PLAYING` phase refuses it. |
| Report shows the previous day | The report reads `charter.lastReport`; a reload during `DAY`/`REPORT` restores the last planning save. |
| Continue button missing | A v2 save only exists while a run is in `PLAYING`; v1 is removed on read. Check `localStorage` for `falesc.save.v2`. |
| Screenshots look stale | Add a short `pause` or a `waitFor` after changing camera/state; screenshots are captured from the next presented frame. |
| WebGL "Unable to auto-detect a suitable renderer" | Environment-level WebGL exhaustion; retry the run. The browser smoke normally gets a software context. |
