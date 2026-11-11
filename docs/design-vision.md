# FALESC — Design vision

> **Status note (2026-11-11):** the visual identity in this document is still
> the guardrail. The **First Light vertical slice** now implements most of the
> refined Phase 0 and Phase 1: warm nebula void, floating shards, service
> buildings with doors, residents with needs, planning → playback → report, and
> a civic-energy economy. A Contest preview and Confluence pledge/vote are in
> the build, including a three-day festival campaign, a stewardship promise and legacy and
> a shared Commons Beacon, a first Commons Assembly petition/ballot, day visitors and a
> two-module retrofit; the full multi-round festival, a fully shared
> commons archipelago, deeper legacy effects and true stacked floors are still absent. The
> sea/island/plant imagery in §7 and the building silhouettes
> there are prototype-era and superseded by the void world in
> [design/world.md](design/world.md); the economy and loop in §8 and the
> milestones in §11 are retained as prototype history. The Prism Tide tagline,
> the Lampwright/Aurora Beacon pitch in §1 and the prototype structure list are
> historical framing, not the current First Light loop. Palette, typography,
> shape, motion and UX rules still apply.
>
> The refined direction — residents, service buildings, care-based competition
> and the Confluence — is in [design-refinement.md](design-refinement.md); the
> current build is documented in [gameplay.md](gameplay.md).

> **FALESC: The Prism Tide.** Raise a town at the edge of the Glass Sea before
> the last light goes out.

This document is the north star for the visual and UX overhaul. It exists to
keep the game from drifting back to the generic “dark blue panel, white text,
gold accent” look that prototypes default to. It is deliberately opinionated;
update it when the direction genuinely changes, not to justify a shortcut.

## 1. The one-line pitch

A tiny isometric island city-builder with the warmth of a 1970s travel poster,
the geometry of art deco, and the electric colour of a bubblegum arcade.

You are a **Lampwright**. A rare **Prism Tide** has lifted a chain of islands out
of the Glass Sea, along with living **lumen** crystals. Build a settlement,
harvest the light, and raise the **Aurora Beacon** before the tide turns dark.

The existing procedural people are **Tidelanders** — small, curious, stubbornly
optimistic. The crystals are the reason anyone is here. The islands are the
only ground left. Those three things are worth protecting; everything around
them is up for redesign.

## 2. Design pillars

1. **Warm apocalypse, not grim apocalypse.** The world is ending, but the light
   is extraordinary. People are having a nice time about it. Coral, mint and
   cream carry the mood; ink and aubergine give it weight.
2. **A place, not a container.** The sea, weather, palms, little paths and
   half-finished structures should make the map feel inhabited before the
   player does anything. Empty screens are the enemy.
3. **Readable at a glance.** One clear objective, one currency, one build action
   per day. The player should always know what to do next without reading a
   manual.
4. **Tactile objects.** Panels are paper, buttons are letterpress blocks,
   headings are stamped ink. Slight rotations, offset shadows and imperfect
   edges beat glassmorphism and hairline gradients.
5. **Cute, but composed.** The chibi Tidelanders and chunky crystals are the
   emotional core. Never scale them down into noise or surround them with six
   competing accents.

## 3. Anti-default guardrails

These are hard “no” rules for this project:

- No navy-blue background with white text and gold accents.
- No gold gradients, “premium” bevels, or luxury-hotel styling.
- No default system sans for display type; no unmodified UI-kit look.
- No full-screen flat colour with a centred stack of white buttons.
- No generic rounded glass cards over a dark canvas.
- No more than **one** warm metal in the palette, and it is coral, not gold.
- No external network requests. Fonts and assets are bundled locally.
- No drop shadows that look like CSS defaults; use hard, printed offset shadows.

If a screen starts to look like a dashboard, add paper, ink, a hand-made shape,
or a piece of the world.

## 4. Palette — “Sunset Riso”

The palette is a sun setting over dark water: hot coral and bubblegum above,
cream sand in the middle, aubergine and plum below, with mint and lavender as
the prismatic relief.

| Token | Hex | Use |
| --- | --- | --- |
| `--ink` | `#211225` | Text, outlines, hard shadows |
| `--ink-soft` | `#4B2A48` | Secondary text on paper, dividers |
| `--plum` | `#3A163C` | Deep water / backdrops |
| `--plum-deep` | `#1C0D24` | Vignette, deepest water |
| `--wine` | `#7D2148` | Mid water, pressure |
| `--rose` | `#C73D61` | Sea highlights |
| `--coral` | `#FF6B5E` | Primary action, roofs, key accent |
| `--bubblegum` | `#FF4F9A` | Magic, highlights, secondary accent |
| `--peach` | `#FFA07A` | Warm midtone, gradients |
| `--sun` | `#FFD36E` | Sun, lumen glow, choose with restraint |
| `--paper` | `#FFF2D8` | Panels, cards, island sand |
| `--paper-warm` | `#F3D9AE` | Paper shading, beach edge |
| `--cream` | `#FFF8EA` | Text on dark; highlight fill |
| `--mint` | `#59E3C2` | Lumen, success, cool accent |
| `--mint-soft` | `#A8F5DC` | Glows, selection |
| `--cyan` | `#36C6D9` | Water detail, links |
| `--lavender` | `#C9B6FF` | Iridescent detail, rarity |

**Distribution rule:** roughly 55% warm paper/sand, 25% plum/ink, 12% coral/rose,
8% mint/lavender. The screen should feel sunlit, not like a dark theme.

Gradients are allowed in the sky and sea only. UI panels are flat ink-and-paper
with hard shadows and small printed textures.

## 5. Typography

All families are OFL-licensed and bundled under `assets/fonts/`. No CDN.

- **Display: Fraunces Variable.** Warm, wonky, high-contrast serif. Use at large
  sizes with `font-variation-settings: "SOFT" 60, "WONK" 1, "opsz" 100`.
  Headings, wordmark, building names, victory copy.
- **UI/body: Jost Variable.** Geometric, art-deco-adjacent sans with friendly
  proportions. Body copy, buttons, labels at small sizes.
- **Data/labels: Space Mono.** Day counters, costs, yields, coordinates, tiny
  kickers. Never use it for paragraphs.

Rules:

- Uppercase Space Mono micro-labels at 10–11px with 0.14em tracking.
- Display headings use tight leading (0.9–1.0) and generous optical size.
- Body line height 1.45–1.6; max width 60ch.
- No more than two families visible in the same card (the third appears only
  for numerals).

## 6. Shape, texture and motion

- **Hard printed shadow:** `4px 4px 0 var(--ink)` on cards and primary buttons.
  Hover lifts by 2px and grows the shadow; active presses into it.
- **Ink outline:** 1.5–2px solid `--ink` around interactive surfaces.
- **Paper grain:** a very subtle SVG turbulence overlay at 3–5% opacity.
- **Deco geometry:** stepped corners, fan/sunburst motifs, rounded arches,
  diamond dividers, compass roses. Used as frames and separators, never as busy
  wallpaper.
- **Riso misregistration:** occasional second-colour offset on badges, not on
  body text.
- **Motion:** slow, warm, physical. Ease-out 240ms for UI; 6–18s ambient loops
  for sea shimmer, cloud drift, palm sway. Never bounce a panel.
- **Focus:** 3px mint ring with 2px ink offset, always visible for keyboard.

## 7. World art direction

> **Status:** the sea, beach, palms and open-air planting below describe the
> Prism Tide prototype and are no longer the world. First Light uses the warm
> nebula void, floating shards, vacuum props and enclosed Garden Dome in
> [design/world.md](design/world.md). Keep the palette, one-light and shadow
> reasoning from this section.

### Sea and sky

The world sits in an endless sunset sea rather than a void. The fixed backdrop
behind the Pixi canvas uses layered gradients: deep plum at the top, wine and
rose at the horizon, peach and sun near the waterline. A large low sun disc,
soft cloud bands, a few distant bird marks, and a slow shimmer line give the
scene life. The Pixi canvas is transparent so the backdrop stays visible beyond
the islands.

### Islands

- Sun-bleached sand top (`--paper`), warm edge (`--paper-warm`), coral beach
  line, deep plum cliff face.
- A mint/cyan foam halo and two offset shadow shapes sell the island as a
  floating place, not a flat polygon.
- The build grid is a warm brown ink at low opacity; corner ticks and a compass
  rose replace the current graph-paper overlay.
- Procedural shore dressing: palms, grass tufts, flowers, tide pools, shells,
  driftwood, tiny lanterns, ruined columns. Dense enough to feel alive, sparse
  enough to keep the build grid readable.
- Occasional hand-written speech bubbles above Tidelanders (“The crystals are
  humming again.”). Ambient, rare, and never blocking the HUD.
- The Glass Sea slowly moves toward dusk as the tide limit approaches. The last
  few days should feel warmer and heavier, not just numerically closer.
- Paths connect placed buildings to the island edge, growing as the settlement
  grows (later milestone).

### Characters and crystals

Keep the procedural chibi characters and faceted crystals. Give them better
grounding (contact shadow, slight colour grade) and let them be seen: the camera
starts closer to the home island, not at a zoom level where a person is four
pixels tall.

### Buildings

Buildings are little illustrated objects with recognisable silhouettes, not
grey boxes:

- **Prism Rig** — a coral-and-teal crystal derrick, guy wires, a glowing shard.
- **Tide Garden** — stepped planter terraces, mint water, giant leaves.
- **Lantern House** — cream walls, arched coral roof, warm windows, bunting.
- **Aurora Beacon** — a tall art-deco lighthouse of prism glass; the endgame
  silhouette visible from anywhere on the map.

Each blueprint has a distinct roofline, colour identity, and animated detail
(spinning crystal, swaying leaves, lantern glow).

## 8. Game loop and economy

> **Status:** this was the Prism Tide prototype loop and has been replaced by
> First Light: planning, deterministic day playback, evening report, lumen from
> resident wellbeing, upkeep and closures. This section is retained as design
> history; see [gameplay.md](gameplay.md) for the current rules.

The smallest loop that makes the sandbox a game:

- **Currency:** Lumen, harvested from crystals and generated by structures.
- **Turn:** one day. One build action per day.
- **Construction:** a placed blueprint is `PENDING` (day 1), `UNDERWAY` on the
  next day (current `RESERVED`), and `ACTIVE` the day after. Only `ACTIVE`
  buildings generate income.
- **Starting purse:** enough for one Prism Rig plus a little change.
- **Blueprints:**
  - **Prism Rig** — cheap, reliable Lumen income. The opening move. Crystals
    within reach add +1 Lumen/tide, so plot choice matters.
  - **Tide Garden** — stronger income, higher cost, adds a little local colour;
    also rewards crystal-adjacent plots.
  - **Lantern House** — support structure; increases the settlement's glow and
    grants a small passive bonus (population/morale in a later pass).
  - **Aurora Beacon** — the charter goal. Expensive, unique, unlocks victory
    when it becomes active.
- **Objective:** raise the Aurora Beacon before the final tide (a fixed day
  limit shown in the HUD).
- **Failure:** the day limit passes without an active Beacon.
- **End Turn** shows a short “the tide turns” interstitial with income and
  construction progress, then the next day begins. No invisible timers.
- **End Game / Abandon** is still available, but it is a quiet menu action, not
  a second primary button competing with the loop.

The first playable version of this loop lives in the HUD: resource chip,
objective progress, three blueprint cards, and one obvious End Turn action.

## 9. Screen-by-screen UX

### Menu

A living sunset scene with layered sea bands, distant island silhouettes, palm
fronds and a huge Fraunces wordmark. Asymmetric layout: title and tagline on the
left, a small paper “charter card” with New Charter / Continue below. A footer
line carries the controls and the “no signal, all local” note. No flat black
screen.

### Lobby

A paper charter form over the sunset: seed field with a dice button, map-size
cards (Small / Medium / Large) with tiny island glyphs, and a “Sign the charter”
primary action. A right-hand diagram panel shows the chosen size as an abstract
chart with a compass rose. Back is a quiet text action.

### HUD / playing

- **Top left:** FALESC wordmark, charter day and tide deadline.
- **Top right:** Lumen balance, income preview, and a menu/settings button.
- **Objective rail:** “Raise the Aurora Beacon — 0/1” with a thin prism progress
  line, always present but not shouty.
- **Bottom left:** rebuilt minimap as a framed chart with a compass and ink
  coastlines.
- **Bottom right:** build dock with three blueprint cards and End Turn. Cards
  show cost, yield, and whether they are affordable. Selecting a card arms
  placement; clicking a free grid cell opens the build dialog for that
  blueprint.
- **First day:** a single onboarding hint, dismissable, pointing at the build
  dock. No modal tutorial.
- **Build dialog:** cream paper card, blueprint icon and name, cost/yield,
  editable structure name, Reserve / Cancel. Escape cancels, Enter reserves,
  focus is trapped, and the HUD behind is inert.
- **Structure record:** clicking a finished or half-built structure opens a
  matching card with its income, affinity, and a Dismantle action. Dismantling
  returns half cost and frees the plot; it is a correction, not a strategy.
- **Placement:** hovering a grid cell shows a mint (valid) or coral (blocked)
  diamond and a ghost of the armed blueprint. Number keys arm blueprints; `E`
  ends the tide; Escape opens the charter menu.
- **Interstitial:** “The tide turns” with day number, income, and construction
  progress over a wave motif. Short, skippable after the first read.

### End

Victory and defeat are distinct compositions on the same sunset backdrop.
Victory: “The light holds.” with the Beacon silhouette and settlement stats.
Defeat: “The tide took the light.” with what was built and a Retry / New
Charter action. Never a bare “Game Over” and a white button.

## 10. Accessibility, input and performance

- All interactive elements are real buttons with visible focus rings, labels
  and keyboard paths.
- The build dialog traps focus, restores focus on close, and marks the HUD
  inert while open.
- Prefers-reduced-motion disables ambient drift and panel transitions.
- Touch targets at least 44×44 CSS px; HUD reflows to a compact mode below
  720px width.
- All fonts local, no external requests; font-display: swap with a system
  fallback.
- Pause simulation behind menu/end/interstitial and when `document.hidden`.
- Target 60fps at 1280×720 on integrated graphics; keep ambient particles
  cheap and capped.

## 11. Milestones and acceptance

> The milestones below are the prototype's visual/engine milestones. First Light
> has landed most of 1–3 (identity, the civic loop, the engine underneath) and
> much of 4 (living island), though no visual baseline is committed. The refined
> build order is in [design/roadmap.md](design/roadmap.md).

1. **Identity foundation** — this document, local fonts, CSS tokens/components,
   rebuilt menu/lobby/HUD/build/end, atmospheric backdrop. Acceptance: screens
   are recognisably one game; no default-blue/gold; smoke test and font loading
   pass.
2. **The loop** — Lumen, blueprint costs/yields, build dock, objective and
   victory/defeat, themed building art. Acceptance: a full 8–12 day run can be
   won and lost; HUD always communicates state.
3. **The engine underneath** — actual-shape map packing, world bounds and camera
   clamp, NPC terrain awareness, state-driven turn scheduler, save/load, overlay
   lifecycle. Acceptance: regression tests for non-overlapping islands, NPCs on
   land, save/reload, cancelled turns.
4. **The living island** — shore dressing, paths, ambient props, character
   detail, minimap chart, onboarding and juice. Acceptance: screenshots look
   like a place, not a prototype; visual baseline committed.

## 12. Copy and naming

- World: **the Glass Sea** (the luminous void, not water), **the Prism Tide**
  (the cosmic event and first scenario), **FALESC** (the archipelago).
- Main mode: **the Confluence** — the end-of-charter festival and vote.
- Player role: **Administrator** / **Steward** (the prototype's “Lampwright” is
  prototype-era).
- Inhabitants: **Tidelanders**.
- Currency: **lumen** (lowercase, like a material; “12 lumen”). It is civic
  energy, not money.
- Turns: **days** / **tides**. “Day 3” on screen; “Open the day” as the end-turn
  verb in the refined loop (“Let the tide turn” is prototype-era).
- Services: **Housing**, **Canteen**, **Night Kitchen**, **Tea House**,
  **Bathhouse**, **Clinic**, **Creche**, **Amphitheatre**, **Observatory**,
  **Workshop**, **Garden Dome**, **Transit Gate**, **Council Hall**.
- Endgame: **Commons Beacon** (shared wonder), **Devotion**, **Flourishing**,
  **Patronage**.
- Prototype structures (salvageable): **Prism Rig** → Lumen Pylon, **Tide
  Garden** → Garden Dome, **Lantern House** → Welcome House / Night Kitchen,
  **Aurora Beacon** → Commons Beacon.
- Tone: warm, wry, concise. Never fantasy-generic (“A realm awaits!”) and never
  enterprise (“Resource management dashboard”).
