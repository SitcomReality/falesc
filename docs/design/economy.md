# Economy — lumen as civic energy

> Related decisions: [D2](decisions.md#d2--planning-plus-playback) (day
> playback), [D5](decisions.md#d5--no-per-item-prices-or-stock) (no prices or
> stock).
>
> Lumen is stored light, held in common. It is not money and it is not profit.
> It is the budget a chapter has to care for people. The economy is people:
> residents generate civic energy when they are well, and services consume it to
> keep being good places.

---

## 1. Sources and sinks

### Sources

- **Residents.** Each resident contributes civic energy per day based on their
  wellbeing. A flourishing resident contributes more; a miserable resident
  contributes little or nothing.
- **Starting grant.** A charter begins with a small lumen reserve.
- **Events.** A bloom, a festival, a mutual-aid gift, or a scenario grant can
  add a one-time sum. These are readable events, not random windfalls.

### Sinks

- **Upkeep.** Every active building costs lumen per day. Grand finishes and
  modules cost more.
- **Construction and retrofit.** One-time lumen cost, plus works and time.
- **Festivals and civic projects.** Optional lumen sinks that create a temporary
  boost, a story moment, or the Commons Beacon contribution.
- **Recovery.** Emergency repairs or reopening a closed service can cost lumen.

There is no stock, no price, no spoilage, and no per-item transaction. A
building's output is a service, not a revenue stream.

---

## 2. Starting state

A charter starts with:

- A **Welcome Post**: housing for six.
- **Six residents** with a mix of traits and one urgent need each.
- **10 lumen**.
- **2 works**.
- The central commons (or the home isle) open for building.

The first decision is what to build next to keep those six: a canteen, a quiet
wing, or a garden. The opening is about care, not about a harvest engine.

The numbers are a starting point, not a balance pass; see
[tuning levers](#5-tuning-levers).

---

## 3. The balancing loop

```text
Housing → residents → civic energy → services → wellbeing
   ↑                                                │
   └──────────── more residents and more energy ←────┘
```

If wellbeing falls:

```text
Wellbeing ↓ → contributions ↓ → upkeep shortfall → services close
   → wellbeing ↓ → residents leave → contributions ↓
```

This is a real failure mode, and it is thematically honest: the economy is
people. The player's job is to maximise wellbeing per lumen, not income per
tile.

### Why residents contribute

The contribution is not rent. It is the civic energy of a person who has the
bandwidth to participate. A hungry, exhausted or lonely resident cannot
contribute much; a housed, fed and cared-for resident can. This makes care the
economic engine without turning it into a transaction.

---

## 4. Upkeep, closure and recovery

### Upkeep

- Each active building has a daily upkeep: 1–4 lumen depending on program,
  finish and modules.
- Upkeep is paid at the end of the day, before the report.
- The HUD shows the next day's upkeep and the projected balance. The player
  should never be surprised by a closure.

### Shortfall

If lumen cannot cover upkeep:

1. Non-essential services close first, worst-first. Suggested order: Wonder and
   Purpose, then Company, then Sustenance, then Care. Housing is never closed;
   instead, unpaid housing causes a wellbeing penalty.
2. A closed service is visible: dark windows, a "closed" sign, no queue.
3. Residents whose need is unmet by the closure complain and may visit a rival.
4. The player can reopen a service by paying a small reopening cost once lumen
   is positive.

Closure is a setback, not a deletion. The building stays; the player can recover.

### Recovery tools

- An emergency civic grant (once per charter, or scenario-limited).
- A rival's mutual-aid offer (costs Devotion or a promise).
- A scenario event.
- Downsizing to Humble finishes, removing modules, or closing a non-essential
  service deliberately.

Defeat should be a story, not a sudden game over.

---

## 5. Tuning levers

These are illustrative starting points for the vertical slice, not final
balance. Put them in one data file and tune from playtests.

| Lever | Starting point | Notes |
| --- | --- | --- |
| Starting lumen | 10 | Enough for one service plus a buffer. |
| Works per day | 2 | Scales to 3 with population; see [roadmap.md](roadmap.md). |
| Resident contribution | 0–2 lumen/day | 0 at low wellbeing, 1 at neutral, 2 at high. |
| Housing upkeep | 1 | Per housing building, not per resident. |
| Canteen upkeep | 2 | High capacity, low finish. |
| Tea House upkeep | 2 | Evening trade. |
| Garden Dome upkeep | 3 | Wonder and Rest; a luxury of space. |
| Construction cost | 4–6 | Housing 4, Canteen 4, Tea House 5, Garden Dome 6. |
| Retrofit cost | 2–4 + 1 work | Program/module/finish changes. |
| Defeat threshold | Population < 4, or Flourishing < 25 for 3 days | Provisional; tune with the vertical slice. |

### Balance principles

- A neutral chapter should be able to afford housing + one service, not all four.
- Wellbeing should be the difference between "surviving" and "flourishing," not
  a bonus on top of a comfortable base.
- The player should feel a shortage before it becomes a spiral. Show the
  projected balance and the upkeep of each building.
- Do not let a single day's mistake end a run. Give one recovery beat.

---

## 6. Defeat and the shared failure state

A chapter is dissolved if:

- its population falls below the minimum (provisional: 4), or
- Flourishing stays below the survival threshold for several consecutive days,
  or
- the charter ends and the chapter has no residents who will vote for it.

At the archipelago level, if shared Flourishing is below the survival threshold
at the Confluence, the archipelago is evacuated and **nobody wins**. This is the
anti-race-to-the-bottom rule. A chapter cannot win by being the least-bad in a
collapsing colony.

The exact thresholds are scenario levers. The first vertical slice only needs
the chapter-level version; the shared failure arrives with competition.

---

## 7. What happens to crystals and the Prism Rig

Crystals stay as **scenery, geology and story**, not as the main economy.

- A crystal is a beautiful object, a landmark, a place for a Wonder service, or
  the site of a one-time "bloom" event.
- If a power infrastructure building is needed, reframe the Prism Rig as a
  **Lumen Pylon / Solar Sail** that increases a district's capacity or reduces
  upkeep — not one that prints currency.
- Crystal affinity as a placement bonus is retired. Replace it with adjacency
  resonance, which is about people and services, not extraction.

This is a deliberate demotion. The current Prism Rig / Tide Garden income loop
is the clearest symbol of the drift; do not let it back into the core.

---

## 8. Why no prices

The old game's price wars were fun in multiplayer, but its pricing and stock UI
was the most common complaint. In FALESC, the competition is about **care**, not
price. The player's levers are:

- where to build,
- what program/modules/finish,
- who the policy welcomes,
- when it is open,
- how much capacity they can afford.

That is enough tension without a spreadsheet. If a price-like lever is wanted
later, use a single "contribution" policy per building, not per-item pricing.

---

## 9. Implementation notes

- **Chapter** model: `id, name, colour, doctrine, lumen, works, hearts,
  buildings`.
- **Economy tick**: at day resolution, sum resident contributions, subtract
  upkeep, apply closures, then produce the report.
- **Projection**: the HUD needs a cheap "next day" projection; do not simulate a
  second day to get it.
- **Determinism**: contributions depend on the deterministic resident state, not
  wall-clock time.
- **Save v2**: lumen, works, upkeep state, closed services and the recovery
  grant flag.
- **Telemetry for tuning**: log contributions, upkeep, closures and population
  per day in development builds.

---

## 10. Open questions

1. Is a resident contribution of 0–2 lumen/day too coarse? (Start coarse; tune.)
2. Should housing upkeep scale with residents or with buildings? (Recommend per
   building for legibility.)
3. Should the player set a closure priority, or is the essential/non-essential
   order enough? (Recommend the default order first.)
4. How harsh should the shared Flourishing failure be? (It should be a real
   threat, but not a gotcha.)
5. Should the emergency grant be once per charter or scenario-specific? (Start
   once per charter.)
