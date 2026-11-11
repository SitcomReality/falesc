# Buildings — shells, programs, modules, finish and policy

> Related decisions: [D3](decisions.md#d3--defer-auctions-stewardship-and-petitions)
> (no land auctions), [D5](decisions.md#d5--no-per-item-prices-or-stock) (no
> prices or stock).
>
> Buildings are **places people enter**, not income tiles. The goal is nuanced
> and layered customisation without a spreadsheet. Five small layers, each with
> a clear visual and mechanical consequence, plus adjacency and footprint.
>
> **Status note (2026-11-11):** First Light implements the first five programs,
> footprints, a reserved door cell, capacity, queues, enter/exit, visits and
> demolition. Shells, modules, player-chosen finish/policy and retrofit are
> still target. The "current prototype" comparisons below are historical.

---

## 1. The layer cake

| Layer | Options | What it changes |
| --- | --- | --- |
| **Shell** | Kiosk 1×1, Hall 2×2, Civic 3×3; 1–3 floors; 3 visual styles | Footprint, capacity ceiling, construction time, silhouette |
| **Program** | Housing, Canteen, Night Kitchen, Tea House, Bathhouse, Clinic, Creche, Amphitheatre, Observatory, Workshop, Garden Dome, Transit Gate, Council Hall | Which need it serves and what residents do inside |
| **Modules** | 0–2 slots: Open Kitchen, Quiet Wing, Stage, Greenhouse, Night Lamp, Care Bay, Soundproofing, Roof Garden | Capacity, quality, secondary need, adjacency effects, upkeep |
| **Finish** | Humble / Comfortable / Grand | Cost, upkeep, appeal, and which Standards trait feels welcome |
| **Policy** | Access (Open / Residents first / Contribution), hours (Day / Night / Always), vibe (Cosy / Efficient / Grand) | Who is attracted, who is excluded, when it is open |

A building is a small composition, not a single card. The same Hall shell can
become a cosy tea house, an exacting clinic or a grand bathhouse. That is the
customisation depth the design wants.

### Worked example

```text
Shell       Hall, 2×2, two floors, pressed-metal style
Program     Tea House
Modules     Greenhouse + Quiet Wing
Finish      Comfortable
Policy      Open · evening hours · Cosy
Result      A warm, plant-filled evening room for Social and Cosy residents;
            Exacting residents prefer the rival's Grand Tea House.
```

The same shell with a different program is a different building. The same
program with a different finish is a different invitation. That is the layer
cake: combinatorial depth without a longer build menu.

---

## 2. Finish is a trade-off, not an upgrade

Higher finish is not strictly better.

- A **Grand** bathhouse delights Exacting residents and costs more upkeep.
- It makes Modest residents feel unwelcome; they may prefer the Humble
  bathhouse down the road.
- A **Humble** canteen can be crowded and low-quality, but it is affordable and
  inclusive.
- A **Comfortable** middle option is the safe default, not the optimal one.

This is how the game expresses "benevolence is a choice." You cannot serve
everyone with one building. The player's ideology shows up in the mix.

---

## 3. Programs

Programs are the service type. Start with a small set; depth comes from
combinations, not from forty silhouettes.

### Starter catalog

| Program | Need | Footprint | Notes |
| --- | --- | --- | --- |
| **Housing** | Rest | 1×1 / 2×2 | Capacity, quality, privacy; the anchor. |
| **Canteen** | Sustenance | 1×1 / 2×2 | Fast, high capacity, low finish. |
| Night Kitchen | Sustenance | 1×1 | Evening/night food; small, cheap, high upkeep. |
| **Tea House** | Company / Sustenance | 1×1 / 2×2 | Cosy, social, evening trade. |
| **Garden Dome** | Wonder / Rest | 2×2 | Pressurised greenery; the plant home. |
| Bathhouse | Care / Rest | 2×2 | Steam, cleanliness, social ritual. |
| Clinic | Care | 2×2 | Low capacity, high urgency. |
| Creche | Care / Purpose | 1×1 / 2×2 | Frees parents for work/leisure. |
| Amphitheatre | Company / Wonder | 3×3 | Evening crowds, noise. |
| Observatory | Wonder | 2×2 | Night trade, exacting residents. |
| Workshop | Purpose | 2×2 | Production, noise, dignity. |
| Transit Gate | Access | 2×2 | Reduces distance penalty. |
| Council Hall | Purpose / civic | 3×3 | Stewardship, petitions, festivals. |

**Phase 1 in bold-ish:** Housing, Canteen, Tea House, Garden Dome. The others
are Phase 3 and later.

### Program rules

- A program defines the primary need and the interaction duration.
- A program may serve a secondary need at reduced effect (Tea House:
  Sustenance at half; Garden Dome: Rest at half).
- A program has a base capacity; shells and modules modify it.
- A program has an upkeep and a construction time; finish and modules modify
  both.
- A program's visual silhouette must be readable at map zoom. If the player
  cannot tell a clinic from a canteen at a glance, the art has failed.

---

## 4. Modules

Modules are the small combinatorial layer. Two slots per building; some shells
have one, some have three. Each module should have a clear benefit and a clear
cost.

| Module | Effect | Cost / trade-off |
| --- | --- | --- |
| Open Kitchen | +capacity, +Sustenance | +upkeep, +noise |
| Quiet Wing | +Rest quality, +privacy | −capacity |
| Stage | +Company, +Wonder events | +noise, +upkeep |
| Greenhouse | +Wonder, +Sustenance quality | +upkeep, needs light |
| Night Lamp | extends evening/night hours | +upkeep |
| Care Bay | +Care capacity | +upkeep, staff |
| Soundproofing | removes noise penalty to nearby housing | +cost, −capacity |
| Roof Garden | +Wonder, +Rest for residents | +upkeep, exposure |
| Cold Storage | +Sustenance capacity, less spoilage (flavour) | +upkeep |
| Welcome Desk | +arrival rate, +queue tolerance | +upkeep |

Modules should not be straight upgrades. A no-module building is a valid,
cheaper choice.

---

## 5. Adjacency and districts

Placement matters through **resonance**, not a hidden bonus spreadsheet.

Examples:

- Housing with a Quiet Wing: **+Rest**. Housing near a Garden Dome: **+Rest**,
  **+Wonder**.
- Housing near an Amphitheatre or night venue: **−Rest** unless the housing has
  Soundproofing; **+Company** for Social residents.
- Clinic near housing: **+Care**.
- Canteen near a Garden Dome: **+Sustenance quality** (herbs, produce).
- Transit Gate: reduces the distance penalty for a cluster; makes a district
  viable.
- Workshop near housing: **+Purpose**, but **−Rest** if noisy.

Show these as small icons in placement and in the building card. The player
should be able to plan a district on purpose, not discover a hidden multiplier.

### District identity

A cluster of compatible services should acquire a loose identity — "the quiet
terraces," "the night market," "the garden quarter." This is emergent, not a
formal district type. The survey overlay can name it if the cluster is strong
enough. Do not add a separate district-management layer.

---

## 6. Footprints, entrances and queues

- Multi-cell buildings create a real spatial puzzle: frontage, entrance
  orientation, queue space, and the walk from housing.
- A building's entrance is a cell. Pathfinding targets the door. A building
  placed with its door facing a dead end is a bad building, and the player can
  see why.
- A 3×3 Civic building is a landmark; a 1×1 Kiosk is a quick response. The
  footprint is a strategic choice, not just a size.
- Queue slots are outside the door. The player can see a queue form; it is a
  signal, not a hidden number.
- A multi-cell building must still fit the island shape. The placement policy
  checks every occupied cell, not just the anchor.

---

## 7. Rabbit holes: interiors, entering and using

Buildings are destinations first and obstacles second.

- Every service has an entrance, a queue area and an abstract interior with
  capacity and a use duration.
- A resident paths to the door, waits if full, disappears inside, and emerges
  with a mood/need icon.
- The building shows occupancy through lit windows, a queue, a door animation,
  or a small activity pip. No 3D interior is needed.
- **Outdoor services** (bench, kiosk, court, telescope) are used in place: the
  resident stands at the counter or sits.
- The building record card shows occupants, queue, visits, hearts, modules and
  policy. A 2D cutaway illustration is enough.

The prototype did the opposite: buildings were walls. The refinement inverts
that relationship.

---

## 8. Retrofitting and demolition

- Change program, add/remove a module, change finish or policy without
  demolishing.
- Costs lumen and one work; takes one tide.
- This is how the town evolves as the population changes. It fixes the current
  "no upgrade path" limitation (`docs/known-issues.md` #1) and makes the layered
  system usable.
- Demolition remains available but is a last resort; the refund is partial, as
  now.
- A retrofit under construction is visible as scaffolding, like a new build.

---

## 9. Salvaging the current four silhouettes

The current art is charming but belongs to the extraction loop. See
[world.md](world.md#4-buildings) for the full salvage table and art notes. Short
version: Prism Rig → Lumen Pylon / Solar Sail, Tide Garden → **Garden Dome**,
Lantern House → Welcome House / Night Kitchen, Aurora Beacon → **Commons
Beacon**. The current north-west light and south-east shadow rule stays.

---

## 10. What not to do

- **No per-item stock and prices.** Use capacity, policy, finish and hours.
- **No 40 building types at launch.** Six to eight programs, three shells and a
  handful of modules is enough.
- **No income per tile.** A building's output is a service, not lumen.
- **No 3D interiors.** The isometric map is the game.
- **No building as a pure blocker.** Buildings are destinations first.
- **No straight-upgrade modules.** Every module should have a trade-off.
- **No hidden adjacency multipliers.** Show the resonance.

---

## 11. Implementation notes

- **Building** model: `shell, program, modules[], finish, policy, footprint,
  entrance, capacity, queue[], occupants[], visits, hearts, construction`.
- **ServiceManager** replaces `BuildingManager`; keep build/remove/restore, add
  queues, occupancy and visits.
- **PlacementPolicy** returns `{ ok, reason }` for footprint, terrain, entrance,
  adjacency and cost. Fixes `docs/known-issues.md` #1.
- **BuildingRenderer** needs a shell pass plus program/module details; keep the
  current light rule. The current `drawTideGarden` becomes the Garden Dome.
- **Navigation** must target doors and queue slots. See
  [implementation.md](implementation.md#5-prerequisites).
- **Save v2** stores layers, policy, occupancy and construction state.

---

## 12. Open questions

1. How many modules per shell? (Recommend 2 for Hall, 1 for Kiosk, 3 for Civic.)
2. Should a building's program be changeable at any time, or only during a
   retrofit? (Recommend retrofit, with a one-tide cost.)
3. Should the player name buildings? (Yes, lightweight; it helps stories and
   saves.)
4. Do we need a separate "outdoor service" footprint, or can a Kiosk program be
   used outdoors? (Recommend a small outdoor flag on the program.)
5. How much of the current renderer can be reused before a shell system is
   needed? (Start by wrapping the four silhouettes; add shells in Phase 3.)
