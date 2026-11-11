# Competition, rivals and the Confluence

> Related decisions: [D1](decisions.md#d1--single-player-first-solo-vs-ai-is-the-first-competitive-build)
> (solo first; solo vs. AI is the first competitive build),
> [D3](decisions.md#d3--defer-auctions-stewardship-and-petitions) (defer
> auctions/stewardship/petitions),
> [D4](decisions.md#d4--the-confluence-is-the-main-mode) (the Confluence is the
> main mode).
>
> The competition is for **patronage and love**, not profit. Rivals win residents
> by being better hosts. There is no price war, no landlord rent, and no cash
> auction. The final judgment is a vote.

---

## 1. The shared archipelago

The current generator produces a largest home island plus several smaller ones.
A small change to packing/origin can make the largest island the central commons
and the smaller ones the chapters' home isles.

- **Central commons:** a large shared island where all chapters can build.
  Prime plots, transit, the Council Hall, the Commons Beacon.
- **Outer isles:** each chapter starts on one, with housing and a Welcome Post.
  These are the home neighbourhoods.
- **Neutral isles:** drift in over the charter, with new residents and new
  opportunities.
- **Transit tubes:** pressurised transit connections between islands. They are
  the social arteries; residents commute to the commons and to rivals. Without
  transit, competition is invisible.

This gives the spatial puzzle of the old game — the corner, the high street, the
cluster — without a street grid.

### Phase 1 and 2 map scope

- **Phase 1:** one island, one chapter, no rivals. The other islands can exist
  as scenery; they are not playable yet.
- **Phase 2:** one shared central island with two AI chapters. All three can
  build on the commons; home isles can be simple starting platforms or skipped
  for now.
- **Phase 4:** the full archipelago with outer isles, neutral isles and transit.

---

## 2. Chapters

A chapter is a player or AI commune.

```text
Chapter
  id, name, colour, doctrine
  lumen, works, hearts
  buildings[]
  residents (via home assignment)
  promises[] (Phase 4)
```

- Each chapter has a colour and a doctrine. The colour appears on its buildings,
  banners and survey overlay; it does **not** recolour residents (they are free
  people).
- Chapters do not own land. They own the buildings they build and the
  stewardship they are granted (Phase 4).
- A chapter's Devotion is the sum of resident affinity toward it, weighted by
  wellbeing and length of stay.

---

## 3. Rival AI

Three or four rival administrators, each with a doctrine and a blind spot.

| Rival | Doctrine | Strength | Blind spot |
| --- | --- | --- | --- |
| **The Gardener** | Wonder and Rest | Beautiful gardens, quiet housing | Neglects Sustenance and night life |
| **The Mechanic** | Care and efficiency | Clinic, bathhouse, housing | Forgets Wonder and Company |
| **The Host** | Company and entertainment | Tea houses, amphitheatre, night kitchen | Overbuilds; runs short of lumen |
| **The Archivist** | Purpose and culture | Workshop, council hall, observatory | Slow to house new arrivals |

### Rules for rivals

- They play by the same lumen, works and construction rules. No cheating.
- They react to unmet needs and to the player's moves, but with a personality
  bias. The Gardener will not suddenly build a canteen because you did.
- Their moves are visible in the morning bulletin and on the map. Their hearts
  are visible in the standings.
- They make mistakes. The player should be able to find a niche, not solve a
  perfect opponent.
- Their buildings are subject to the same queues, hours and policies. They can
  be loved or neglected.

### AI behaviour loop

At the start of a day, each rival:

1. Reads its residents' unmet needs and its current upkeep.
2. Scores a small set of candidate actions (build, retrofit, policy change).
3. Picks the best action consistent with its doctrine and budget.
4. Commits it; the result is visible in the bulletin.

Keep the AI simple and legible. A utility table with a doctrine bias is enough.
Do not build a deep planner in Phase 2.

---

## 4. Competition by care

There is no price war. The levers are:

- **Quality:** finish and modules.
- **Capacity:** shell size and modules; fewer queues.
- **Inclusion:** policy and finish; who feels welcome.
- **Hours:** when the service is open; who it serves.
- **Location:** proximity and transit; who can reach it.

A rival can steal **patronage** with a shiny new venue. It is harder to steal
**Devotion**, which is built by housing, repeated care and being there when a
need is urgent. This is the strategic tension: do you build crowd-pleasers or
deep relationships?

### What competition is not

- No buying residents.
- No blocking a rival's door.
- No deleting or sabotaging a rival's building.
- No price undercutting.
- No landlord rent.

If a future mechanic adds direct interference, it must pass the design test and
respect the "competition by care" pillar. Prefer festivals, promises and
petitions to sabotage.

---

## 5. Stewardship and petitions (Phase 4, deferred)

*Monopoly Tycoon*'s auctions were its best tension. FALESC should have an
equivalent, but not a cash auction, because land is not for sale in a space
commune. **This entire section is deferred by D3.** Do not build it in Phase 1
or 2.

**Stewardship** is the replacement:

- Plots are held in trust, not owned. The first chapter to build on a neutral
  plot becomes its **steward**.
- Stewardship gives a small "host" bonus (a little extra civic energy, or
  priority in the plot's queue) and a duty: maintain the plot's commons (access,
  power, cleanliness). If the steward neglects it, residents complain.
- **Petitions:** if wellbeing on a stewarded island falls, residents can open a
  petition. Rival chapters pledge improvements; residents choose. The winner
  takes stewardship. This is the auction drama — a contest of promises rather
  than cash.
- **Charter events:** when a new island drifts in, chapters submit a short plan
  (a program and a promise). Residents choose. Bluffing and over-promising are
  possible; breaking a promise costs Devotion.

Until Phase 4, all chapters build on the shared commons and service quality
decides. If Phase 2 feels too soft, the first lever is service differentiation,
not land.

---

## 6. Multiplayer

D1 decides the order: single-player first, AI competition second, human
multiplayer later.

### Phase order

1. **Phase 1:** solo, no rivals.
2. **Phase 2:** solo vs. two AI chapters.
3. **Phase 5:** hot-seat/async human multiplayer, then co-op if it earns its
   place.

### Design for, do not build

- Deterministic day resolution.
- A command log of player actions.
- Chapter state that can be serialised.
- A shared report that reads the same for every player.

### Async/hot-seat first

- All players plan simultaneously; the host resolves the day; everyone reads the
  report.
- No real-time transport, no matchmaking, no presence. D8.
- A hot-seat mode is a good test of the shared-map competition before networking.

### Co-op "Commonwealth"

- All players share the Flourishing target and compete for contribution stars
  rather than residents.
- Thematically strong: the acronym is about a commons, not a cartel.
- Tune the shared Flourishing meter differently; it is not just "compete but
  nice."

---

## 7. The Confluence

At the end of the charter, the archipelago holds the Confluence: a festival and
a vote.

### The vote

- Each resident votes for the chapter they love most, weighted by their
  wellbeing. A miserable resident abstains.
- The chapter with the most votes wins. Ties are broken by shared Flourishing.
- If Flourishing is below the survival threshold, the archipelago is evacuated
  and **nobody wins**. This is the anti-race-to-the-bottom rule.

### Making the vote legible

The vote must not feel arbitrary. Before the result:

- Show each resident's favourite chapter, their hearts and a one-line reason.
- Show the projected tally.
- Show which residents are abstaining and why.
- Let the player read the room, not guess.

### The Commons Beacon

The Aurora Beacon becomes the **Commons Beacon**: a shared wonder built by all
chapters during the final days.

- It raises Flourishing and triggers the Confluence.
- Each chapter can pledge lumen or works during the last three tides.
- Contributions are public and become part of the end report: "the Gardener
  gave the light; the Mechanic kept the doors open."
- The largest contributor gains prestige and a small Devotion bonus, but the
  vote still decides.
- The existing Beacon art and endgame silhouette survive; the win condition does
  not.

This is the one place where the old Beacon earns its keep: a shared ritual, not
a private victory.

---

## 8. The meters

| Meter | Scope | What it measures | UI |
| --- | --- | --- | --- |
| **Flourishing** | Shared | Aggregate need satisfaction and wellbeing | Shared bar; the commons |
| **Devotion** | Per chapter | Accumulated love: resident affinity, weighted by wellbeing and length of stay | Hearts; the score |
| **Patronage** | Per chapter | Visits and repeat use | Smaller "visits" stat; leading indicator |

The HUD shows Devotion prominently, Flourishing as a shared bar, and Patronage
as a smaller stat. Rival standings show Devotion for each chapter. Do not show a
single blended "score"; the three meters tell different stories.

---

## 9. Scenarios

Varied goals keep the game from becoming one solved build order. Start with:

1. **First Light** — tutorial. House 12 Tidelanders and reach Comfortable
   wellbeing. No rivals.
2. **The Contest** — two AI rivals, most Devotion after 15 tides.
3. **No One Left Behind** — you win only if the least-well resident is above a
   threshold. A benevolence constraint, not a leaderboard.
4. **The Long Night** — lumen scarcity; keep services open through a crisis.
5. **A Garden in the Void** — culture and Wonder; Garden Domes and Observatory.
6. **The Open Door** — an arrival surge; housing and care under pressure.
7. **Commonwealth** — co-op; all chapters vs. the drift.

The first vertical slice only needs **First Light**. The rest are Phase 4.

---

## 10. Implementation notes

- **Chapter** model: `id, name, colour, doctrine, lumen, works, hearts,
  buildings, promises`.
- **RivalAI**: utility table + doctrine bias; same rules as the player; visible
  actions.
- **DevotionLedger**: per-resident affinity, weighted tally, vote.
- **DaySimulator**: deterministic; all chapters resolve in a fixed order, then
  the report.
- **Standings/survey UI**: Devotion, Patronage, Flourishing; patronage flow
  overlay.
- **Save v2**: chapters, affinity, promises (Phase 4), Commons Beacon
  contributions.
- **No networking** until the single-player day is deterministic and fun.

---

## 11. Open questions

1. How many AI rivals in Phase 2? (Recommend two: one familiar, one contrasting.)
2. Should AI rivals be visible from the start, or arrive on Day 3? (Recommend
   start, so the competition is legible.)
3. How strong should the "host" bonus be in Phase 4? (Keep it small; duty should
   matter more than bonus.)
4. Is the Commons Beacon a shared requirement or a scenario-specific ritual?
   (Recommend shared in the main mode, optional in scenarios.)
5. Should the Confluence vote be public (shown before the result) or revealed?
   (Recommend public projection, dramatic final tally.)
6. Co-op: separate mode or a scenario variant? (Recommend a scenario variant
   first.)
