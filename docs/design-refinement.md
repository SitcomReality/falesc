# FALESC — Refined design overview

> **Status: working design, partially built (2026-11-11).** The four key forks
> are decided; see [decisions.md](design/decisions.md). The **First Light
> vertical slice** now implements most of **Phase 0 and Phase 1**: the warm
> nebula void, floating shards, four needs, four buildable service programs,
> planning, deterministic day playback, the evening report, wellbeing-driven
> lumen, Devotion/Flourishing, resident cards with a "why", and save v2. A
> **Contest preview** adds two AI rivals, shared residents/services, rival
> housing and a per-chapter economy, recovery/need-pressure builds, Devotion
> standings, a patronage-flow overlay, a three-day festival campaign, a
> pledge/vote Confluence, a stewardship epilogue and a fundable shared Commons
> Beacon, a first Commons Assembly ballot, transient day visitors and a one-step
> service retrofit. The full multi-round festival, a separate shared-commons island,
> auctions, systemic stewardship, building layers and multiplayer are **not**
> implemented. This document and the component docs in `docs/design/`
> describe the direction; where they conflict with the source, the source wins.
> The visual identity (palette, typography, paper/ink chrome) remains the
> guardrail; the sea, beach and open-air plants do not.
>
> **Where to start:** [roadmap.md](design/roadmap.md) for what is built and what
> remains; [gameplay.md](gameplay.md) for the current slice.
>
> **Short version:** FALESC is a warm, competitive city-builder about becoming
> the most beloved administrator on a chain of floating islands. The Tidelanders
> are citizens who choose where to sleep, eat, unwind and fall in love — and
> their choices decide who wins.

---

## How to use these docs

This file is the ten-minute read and the canonical map. It is deliberately
short (under 300 lines). The detail lives in focused component docs so that
changing the economy does not mean editing a novel.

**You do not need to read all of these at once.** For most reviews, read this
file plus the one component doc that changed. The component docs are reference,
not a required sequence.

- Start here for the pitch, pillars, decisions and scope.
- Open a component doc when you are working on that system.
- Check [decisions.md](design/decisions.md) before reopening a settled fork.
- Use [roadmap.md](design/roadmap.md) for build order and acceptance.
- If a component doc conflicts with this overview, this overview wins; fix the
  component doc.

| Doc | Answers |
| --- | --- |
| [residents.md](design/residents.md) | Who are the Tidelanders, what do they need, and how do they choose? |
| [buildings.md](design/buildings.md) | How do buildings layer, what do they do, and how do people enter them? |
| [economy.md](design/economy.md) | Where does lumen come from, where does it go, and how does a chapter fail? |
| [competition.md](design/competition.md) | How do chapters compete, how do rivals behave, and how does the Confluence work? |
| [world.md](design/world.md) | What does the void look like, and how do plants, buildings and characters read? |
| [implementation.md](design/implementation.md) | How do we build this on the current engine? |
| [roadmap.md](design/roadmap.md) | What do we build first, and how do we know it works? |
| [decisions.md](design/decisions.md) | What is settled, what is open, and what is out of scope? |

---

## Decisions at a glance

These four forks are settled as of **2026-11-11**. The rationale and
consequences are in [decisions.md](design/decisions.md); do not reopen them
without a concrete playtest reason.

| # | Decision | What it means |
| --- | --- | --- |
| **D1** | **Single-player first; solo vs. AI is the first competitive build.** | Phase 1 is solo with no rivals, to prove the resident loop. Phase 2 adds two AI chapters. Human multiplayer is a later phase. No real-time networking in the first version. |
| **D2** | **Planning plus playback.** | Planning is paused. The day is a deterministic playback at 1×/2×/4× with a skip. No real-time mode. Revisit only if playtests show the day needs pressure. |
| **D3** | **Defer auctions.** | No auctions, stewardship or petitions in the first competitive version. The central commons is open to all chapters; service quality decides. Stewardship and petitions are Phase 4. Do not build auction UI early. |
| **D4** | **The Confluence is the main mode.** | Product framing: **FALESC: The Confluence.** "The Prism Tide" is the cosmic event and the first scenario. The Aurora Beacon is the shared Commons Beacon, not the win condition. |

The two-step in D1 is deliberate: **prove the people, then add the competition.**
If the resident loop is not fun alone, AI rivals will only hide the problem. The
first *competitive* build is still solo vs. AI — just not the first internal
slice.

---

## The fantasy

You are one of several administrators of a fragile archipelago. The Tidelanders
are small, helmeted, stubbornly optimistic people with habits, friends and
opinions. They can stay in your chapter, visit a rival's, move house, or give
their heart to someone else.

Your job is not to maximise profit. It is to make a place worth belonging to:
somewhere with a bed, a hot meal, a friend, a bath, a laugh and something to
wonder at. The competition is to out-care the other administrators, not to
out-price them.

The acronym is the joke and the thesis. "Fully Automated Luxury Egalitarian
Space Communism" is an impossible promise, and the game is about the impossible
job of keeping it. Benevolence has a budget. Attention is finite. It is not
possible to make everyone happy at once, and that is the interesting part.

Read the acronym as design constraints:

- **Fully automated** — the machines keep the air, the heat and the lights on,
  and basic rations exist. The Tidelanders still need a reason to get up: a hot
  meal someone cared about, a bath, a friend, a view.
- **Luxury** — public luxury, not private wealth: a beautiful bathhouse, a
  garden dome, a hall with good acoustics. Not a gold yacht.
- **Egalitarian** — no prices, no landlords, no rent. A shared Flourishing meter
  and a vote, not a ledger of profit.
- **Space communism** — land is held in stewardship, the commons is shared, and
  a race to the bottom loses for everyone.

---

## Pillars

1. **The little people are the game.** Every system must be legible through a
   Tidelander's behaviour. If a mechanic cannot be seen in a person's choice, it
   is probably the wrong mechanic.
2. **Competition by care, not by blocking.** Rivals win residents by being
   better hosts. You cannot buy a resident, wall them off, or delete a rival's
   building. You can only give them somewhere better to go.
3. **Layered places, not more sliders.** Depth comes from the combination of
   shell, program, modules, finish and policy, plus adjacency and footprint —
   not from per-building price and stock spreadsheets.
4. **A shared commons.** The archipelago can fail for everyone. Flourishing is
   a shared meter; a race to the bottom is a loss for all.
5. **Warm vacuum.** The void is beautiful and a little lonely; the islands are
   havens. No grimdark, no generic dark dashboard, no neon cyberpunk.
6. **Readable cause and effect.** If a resident chooses a rival, the player can
   see why. No opaque customer AI. The "why" is the game's best feedback.

---

## The design test

Before adding any feature, ask:

1. Does it make a Tidelander's choice more visible?
2. Does it create a care trade-off — who gets served, and at what cost?
3. Does it deepen the competition for love?
4. Can the player explain the result without opening a spreadsheet?

If the answer to all four is no, cut it. This is the guardrail against the next
eager feature.

---

## The core loop

1. **Morning bulletin** — paused. Three items: an unmet need, a complaint or
   arrival, and one rival move. Example: "Six Tidelanders wanted a hot meal
   after dark. The Canteen closes at dusk."
2. **Plan** — place or retrofit buildings, set policy, queue works, spend lumen.
   Inspect any resident or building to see the "why."
3. **Open the day** — playback at 1×/2×/4×. Residents wake, choose, walk, queue,
   enter, use and emerge. Rival services compete in the same playback.
4. **Evening report** — visits, hearts gained and lost, complaints, upkeep,
   arrivals and departures, and one or two human quotes.
5. **Reinvest** — spend the next day's lumen and works. Repeat.

> **Read needs → shape places → watch people choose → earn love → reinvest.**

The full time model, including why playback beats real-time, is in
[decisions.md](design/decisions.md) (D2) and [roadmap.md](design/roadmap.md).
Phase durations and the day report belong to [residents.md](design/residents.md)
and [world.md](design/world.md).

---

## The five shifts

| From (prototype) | To (refined design) |
| --- | --- |
| Income tiles | Services with doors, queues and opening hours |
| Crystals as the economy | Residents as the economy: wellbeing generates civic energy |
| Private sandbox | Shared archipelago with rival chapters (Phase 2 onward) |
| Beacon finish line | The Confluence vote; shared Flourishing can fail everyone |
| Sunset sea, beach, palms | Warm nebula void; vacuum props; plants only in Garden Domes |

---

## The cast

| Term | Meaning |
| --- | --- |
| **Administrator / Steward** | The player. Civic designer, not tycoon. |
| **Chapter** | The player's commune / faction / team. |
| **Tidelanders** | The residents. Keep the name; the Glass Sea is the luminous void, and they are people of the tide. |
| **Lumen** | Civic energy, not money. Stored light, held in common. |
| **The Confluence** | The end-of-charter festival and vote. The main mode. |
| **The Prism Tide** | The cosmic event that stranded the archipelago. A scenario and a mood, not the whole game. |
| **Flourishing** | The shared wellbeing of the archipelago. |
| **Devotion** | A chapter's accumulated love. The score. |
| **Patronage** | Visits and repeat use. The leading indicator. |

---

## What the player actually does

The player is a public servant with a budget, not a tycoon. A typical tide is:
read three pieces of news, choose one or two works, adjust a policy, open the
day, watch where people go, read the report, and decide who to serve next. The
interesting decisions are spatial (where to put the canteen), combinatorial
(which program and modules in this shell), social (who the policy welcomes), and
moral (which need gets the last of the lumen).

The full resident model is in [residents.md](design/residents.md); the building
model in [buildings.md](design/buildings.md); the economy in
[economy.md](design/economy.md); the competition in
[competition.md](design/competition.md).

---

## Scope: the first vertical slice

**Phase 1 is solo, with no rivals.** This is the proof of the resident loop, not
the full game.

- One island, 12–15 named residents.
- Four needs: Sustenance, Rest, Company, Wonder.
- Four services: Housing, Canteen, Tea House, Garden Dome.
- Plan → playback → report; Devotion and Flourishing.
- Lumen from resident wellbeing; upkeep; construction.
- No rivals, no scenarios, no auctions, no multiplayer.

**Acceptance test:**

> The player can watch a resident choose a service, enter it, emerge happier,
> and explain why.

If that moment works, the design is validated. Phase 2 adds two AI rivals and
the first competitive layer. The detailed phase plan is in
[roadmap.md](design/roadmap.md).

---

## What to keep, rework and cut

| Keep | Rework | Cut / defer |
| --- | --- | --- |
| Pixi isometric renderer | NPC brain: needs, schedule, pathing, entering | Crystal affinity as the core economy |
| Seeded map and packing | Buildings: shells, programs, doors, queues | Prism Rig / Tide Garden income |
| Camera, input, zoom | Economy: resident civic energy, upkeep | Lantern House Beacon discount |
| Character rig and animation | HUD: Devotion, Flourishing, bulletin, cards | Aurora Beacon as the win condition |
| Screen/state machine | Map dressing: void, vacuum props, Garden Dome | One build per tide |
| Save/load, tests, palette, fonts | Turn loop: planning + playback + report | Per-item prices and stock |
| Zero-build architecture | Docs: this folder supersedes the old loop | Open-air plants |

The full keep/rework/cut table, model changes and test plan are in
[implementation.md](design/implementation.md).

---

## Open questions

These are not settled; they are safe to explore inside the current direction.

1. **Tone.** Warm, wry and sincere is the current proposal. How much satire is
   too much? The acronym is a joke; the care should be real.
2. **Named residents.** The proposal uses 12–15 named residents with lightweight
   cards. If 30+ residents become necessary, do we keep names or move to a
   crowd with representative individuals?
3. **Land competition.** D3 defers auctions, stewardship and petitions to Phase
   4. If playtests show competition is too soft, pull a simple stewardship rule
   forward; do not pull in cash auctions.
4. **Subtitle.** "FALESC: The Confluence" is the proposed main mode. Does "The
   Prism Tide" stay as the first scenario, the cosmic event, or both?
5. **Co-op priority.** "Commonwealth" is designed as a co-op mode. Is it a
   stretch goal or a first-class mode? It changes how the shared Flourishing
   meter is tuned.

---

## The one-paragraph pitch

FALESC is a warm, competitive city-builder about being the most beloved
administrator on a chain of floating islands. The Tidelanders are small,
helmeted, and opinionated. They need dinner, a bed, a friend, and something to
wonder at. You and your rivals build the canteens, bathhouses, gardens and
theatres they choose between — and every visit, every queue, every closed door
changes who they love. Win the Confluence. Keep the commons alive. Try not to
become the villain of someone else's cosy space opera.

---

## Document map

- **Canonical overview:** this file.
- **People:** [residents.md](design/residents.md)
- **Places:** [buildings.md](design/buildings.md)
- **Economy:** [economy.md](design/economy.md)
- **Competition and victory:** [competition.md](design/competition.md)
- **Look and feel:** [world.md](design/world.md)
- **Engineering:** [implementation.md](design/implementation.md)
- **Build order:** [roadmap.md](design/roadmap.md)
- **Decisions and scope guard:** [decisions.md](design/decisions.md)

[gameplay.md](gameplay.md) now documents the First Light slice as built. The
visual identity remains in [design-vision.md](design-vision.md), with the
world-art correction in [world.md](design/world.md). For the implemented engine
and tests, see [architecture.md](architecture.md) and
[testing.md](testing.md).
