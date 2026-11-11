# World and art direction — a warm void, not a sea

> Related decision: [D4](decisions.md#d4--the-confluence-is-the-main-mode) (the
> Confluence is the main mode).
>
> The palette, typography, paper/ink chrome, motion and accessibility rules in
> [design-vision.md](../design-vision.md) remain the guardrail. This document
> corrects the **world**: floating islands in a nebula void, no beach, no
> open-air plants, and buildings that read as places with doors.

---

## 1. From sea to void

The current scene is a beautiful sunset sea. The correction is not "make it
dark"; it is "remove the sea and the beach, and let the same warm light fall
into a void."

- Deep plum at the edges, wine and rose bands, a distant bright star or ringed
  planet, a faint aurora. No waterline, no horizon line, no foam.
- Islands are **floating shards**: a rocky underside with crystal veins, hanging
  cables and debris, a rim light on the top edge, and a cast shadow into the
  void. The top surface is regolith and metal decking, not sand. No beach.
- A slow drift/parallax and a few distant island silhouettes sell the void.
- The "tide" is the slow light tide; the dusk progression is the nebula dimming.
  The existing `--tide-progress` mood can stay.
- The Glass Sea is the luminous void, not water. Explain it once in the fiction;
  do not put a literal sea in the art.

### The backdrop

- DOM/CSS/SVG layers behind the transparent Pixi canvas, as now.
- Stars: a few hundred tiny points, some with a slow twinkle; cheap.
- Nebula: layered radial/linear gradients in plum, wine, rose, peach; a soft
  bright core near the "sun" direction.
- Distant planet: one low-contrast ringed disc; not a second focal point.
- Aurora: a faint mint/lavender band; low opacity, slow drift.
- No external assets or network requests.

---

## 2. Islands

- **Top:** dusty rose/cream regolith, warm paper highlights, etched survey grid.
  Metal decking and path lines where the settlement grows.
- **Edge:** a bright rim light on the north-west edge; a darker lip on the
  south-east.
- **Underside:** jagged rock keel, crystal veins, hanging cables, a few drifting
  pebbles. This is the biggest visual cue that the island floats.
- **Shadow:** a soft, offset shadow cast into the void, not a water shadow.
- **Grid:** keep the warm survey lines; they read as chalk/etching, not graph
  paper. Corner ticks and a compass rose are good.
- **Dressing:** see §3.

### Island sizes

- The current 2×2, 3×3 and 4×4 grids are a good starting range.
- A central commons can be the largest island; home isles can be smaller.
- Do not fill every island edge with props; leave room for future buildings and
  paths.

---

## 3. Plants and vacuum props

Open-air palms, grass and flowers are a **conceptual** mismatch: people in
vacuum helmets cannot stand under a palm tree on a beach. The palms also lack a
shaded side, so they read flat next to the buildings.

### Remove

- `drawPalm`, `drawGrass`, `drawFlower` from island dressing.
- The foam halo, beach line and sand-top language.
- Any open-air plant that implies an atmosphere.

### Replace with vacuum-safe props

- Rocks, craters, pebbles, dust drifts.
- Cables, pipes, antennae, dishes, solar fins, radiators.
- Cargo pods, crates, landing beacons, warning stripes.
- Memorial stones, small shrines, faded banners.
- Crystalline "void coral": faceted, bioluminescent, clearly not leafy; lit face
  and shaded face.
- A few drifting metal scraps and tethered tools.

All props follow one light rule (see §7). If a prop has no shaded side, it is a
bug.

### Plants in the Garden Dome

Plants survive only inside pressurised spaces:

- **Garden Dome** (a service building): glass geodesic dome, condensation, warm
  interior light, airlock. The existing Tide Garden's terraces and leaves move
  inside the glass.
- **Habitat window boxes**: small, contained, visible through a window; never
  open-air.
- The Garden Dome is a place residents enter, not scenery. It provides Wonder
  and Rest.

This solves the conceptual problem and gives the plants a reason to exist.

---

## 4. Buildings

Buildings should read as **places with airlocks**, not equipment.

- Add a visible door/airlock, lit windows, radiators, pipes, antennas, signage,
  and a queue area.
- Add service silhouettes: Canteen (counter, awning, steam), Tea House (warm
  windows, hanging lamps), Bathhouse (steam vents, tiled dome), Clinic (cross,
  clean light), Creche (small door, toys), Amphitheatre (open bowl, stage),
  Observatory (dome, telescope), Workshop (sawtooth roof, crane), Garden Dome
  (glass geodesic dome), Transit Gate (arch, tube), Council Hall (steps, banner).
- Multi-cell buildings need larger, more legible art. A 3×3 Civic building
  should be visible from the map overview.
- Keep the current north-west light and south-east shadow. Add contact shadows
  and a subtle rim light so buildings sit on the island rather than float above
  it.

### Salvage the current four

| Current | Becomes | Notes |
| --- | --- | --- |
| **Prism Rig** | Lumen Pylon / Solar Sail | Power infrastructure, if needed. |
| **Tide Garden** | **Garden Dome** | Glass, airlock, interior greenery. |
| **Lantern House** | Welcome House / Night Kitchen | Warm windows, bunting, housing or food. |
| **Aurora Beacon** | **Commons Beacon** | Shared endgame wonder. |

### Readability

- Every program needs a distinct silhouette and a colour cue.
- At map zoom, the player should distinguish housing, food, care, social and
  wonder at a glance.
- Do not rely on tiny icons alone; the building shape is the icon.
- Under construction: scaffolding and a ghosted silhouette, as now.

---

## 5. Characters

- Keep the chibi proportions and round helmets; they are the emotional core.
- Add a visor glint (a small arc of light on the helmet) and a tiny backpack or
  antenna. Do not over-design.
- When inside a building, hide the character. When using an outdoor service,
  show a simple "using" pose.
- Thought bubbles are tied to needs and state, not random chatter: "I could use
  a hot meal," "That queue is too long," "I love it here."
- Chapter allegiance is not a uniform. Residents are free people. Show their
  favourite chapter on their card, not on their suit.
- Contact shadows and a slight colour grade keep them grounded.

---

## 6. UI

Keep the paper/ink/coral language, but frame it as a **civic bulletin**, not a
travel poster.

- **HUD top:** day/tide, lumen, works, population, Devotion hearts, shared
  Flourishing bar. Rival standings in a small card (Phase 2).
- **Morning bulletin:** a paper card with three items: unmet need, complaint or
  arrival, rival move. This is the player's decision input.
- **Resident card:** name, traits, need bars, home, favourite chapter, last
  choice with a "why" line. A tiny procedural portrait is a nice later touch.
- **Building card:** program, shell, finish, modules, policy, occupants, queue,
  visits, hearts, upkeep. The same card is used for retrofit.
- **Day report:** a broadsheet overlay with visits, hearts, complaints, rival
  moves and one or two quotes. This is the emotional payoff.
- **Survey overlay:** a toggle that shows need heat, patronage flow (dotted
  lines from homes to services, coloured by chapter), and rival influence. The
  minimap can host the layer switch. This is the "watch the customers" magic
  made legible.
- **Build dock:** services, not equipment. Show footprint, cost, upkeep,
  capacity, and the need it serves. The current dock's card language can be
  reused.

The HUD should always answer: **who needs what, who is serving them, and who do
they love?**

---

## 7. The one-light rule

Everything in the world is lit from the **north-west** and casts a shadow to the
**south-east**.

- Buildings: keep the current flat isometric shadow.
- Props: every prop needs a lit face and a shaded face; a flat prop is a bug.
- Characters: contact shadow under the feet.
- Islands: rim light NW, darker lip SE, cast shadow into the void.
- UI is exempt; it is paper, not a physical object.

This rule is the simplest fix for the "flat sticker" look. Make it a review
checklist item.

---

## 8. Relationship to design-vision.md

- **Keep:** palette, typography, paper/ink chrome, hard shadows, motion,
  accessibility, no external assets.
- **Replace:** the sea/sky backdrop, the beach/foam island language, the
  shore-dressing plants, and the "travel poster" framing where it conflicts with
  a civic bulletin.
- **Add:** the void/nebula, floating rock undersides, vacuum props, Garden Domes,
  doors/windows/queues, the one-light rule.
- **Do not** turn the game into a dark neon space dashboard. It is still warm,
  sunlit paper in a plum void.

---

## 9. What to avoid

- Generic dark-blue space with white text and cyan HUD.
- Gold "premium" space luxury; the luxury is public, not metallic.
- A literal ocean with floating islands (the current drift).
- Open-air trees, grass or flowers.
- Props with no shaded side.
- Buildings that read as machines, not places.
- More than one visual focal point per screen (the Beacon is enough at the end).

---

## 10. Implementation notes

- `src/map/SectorGraphics.js`: replace foam/beach/plants with void island and
  vacuum props; add the rocky underside. Keep the grid.
- `index.html`/`styles/main.css`: replace the sea backdrop with a nebula/star
  backdrop; keep the transparent canvas.
- `src/buildings/BuildingRenderer.js`: add doors, windows, airlocks and
  program-specific silhouettes; wrap the current four as the salvage set.
- `src/character/CharacterRenderer.js`: add visor glint/backpack; hide inside
  buildings.
- `src/ui/`: resident card, building card, bulletin, day report, survey overlay.
- Keep local fonts and no runtime network requests.

---

## 11. Open questions

1. How warm can the nebula be before it reads as a sunset sea again? (Test
   screenshots early.)
2. Do we keep the current island silhouettes, or generate more "shard-like"
   shapes with a deeper keel? (Start by deepening the underside; change shapes
   only if needed.)
3. Should the Garden Dome be visible from the map overview as a landmark?
   (Yes, it is a Wonder service.)
4. How much UI chrome can move to a "civic bulletin" without losing the current
   charm? (Keep the paper cards; change the labels, not the material.)
5. Do we need a day/night tint on the world, or is the day phase enough? (Start
   with the phase and the service hours; tint later.)
