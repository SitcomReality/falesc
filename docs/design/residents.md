# Residents — needs, traits, choice and love

> Related decisions: [D1](decisions.md#d1--single-player-first-solo-vs-ai-is-the-first-competitive-build)
> (solo first), [D2](decisions.md#d2--planning-plus-playback) (playback),
> [D7](decisions.md#d7--named-residents-with-lightweight-cards) (named
> residents).
>
> This is the heart of the redesign. Everything else exists to make the
> Tidelanders' choices visible. If the resident loop is not fun, no amount of
> buildings, rivals or art will save the game.
>
> **Status note (2026-11-11):** First Light implements four needs, three trait
> axes, deterministic choice with a "why", queues, enter/exit, the resident card
> and Devotion. Care/Purpose, relationships, portraits and the fuller schedule
> remain target. The "current prototype" comparisons below are historical.

---

## 1. Needs

Six needs, each with an urgency value that decays over the day. A need is
satisfied by a service; the amount depends on the service's quality, capacity
and the resident's traits.

| Need | Satisfied by | Notes |
| --- | --- | --- |
| **Sustenance** | Canteen, Night Kitchen, Tea House | The most frequent need. |
| **Rest** | Housing, Garden Dome, Housing with Quiet Wing | Housing is the anchor; without a bed, nothing else works. |
| **Company** | Tea House, Amphitheatre, Canteen | Social residents need more of it. |
| **Wonder** | Observatory, Garden Dome, Amphitheatre | The "something to live for" need; low urgency, high mood. |
| **Care** | Clinic, Bathhouse, Creche | For residents with high needs or low mood. |
| **Purpose** | Workshop, Council Hall | Long-term belonging; contributes to Devotion. |

For the first vertical slice, use four: **Sustenance, Rest, Company, Wonder**.
Add Care and Purpose once the loop is proven.

Needs are visible as icons in thought bubbles, a resident card, and an optional
district heat map. The player should never have to guess what people want.

### Urgency

- Each need has a value from 0 (satisfied) to 100 (urgent).
- Values rise at a baseline rate, modified by trait and time of day.
- A resident chooses the most urgent unmet need, weighted by what is available
  and appealing. They do not optimise a global utility function; they are people
  with a mood.
- If a need stays above 70 for too long, the resident complains, then considers
  leaving. Housing loss is immediate and severe.

---

## 2. Traits

Every resident has three small axes. No axis is "better"; they change which
places feel right.

| Axis | Values | What it changes |
| --- | --- | --- |
| **Temperament** | Cosy / Social / Curious | The atmosphere they seek. Cosy likes quiet, warm, small; Social likes company and buzz; Curious likes novelty and wonder. |
| **Standards** | Modest / Comfortable / Exacting | The finish they expect. Modest residents can feel unwelcome in a Grand venue; Exacting residents are disappointed by Humble. |
| **Rhythm** | Early / Night | When their needs peak. Early residents eat and socialise earlier; Night residents keep the tea house open. |

Three axes are enough to make a crowd feel varied without a character sheet.
Traits are visible on the resident card and in the choice explanation.

### Optional fourth axis (later)

A **Story** trait — "new arrival," "old timer," "caregiver," "maker" — can seed
small narrative moments and scenario goals. Do not add it until the base traits
are proven.

---

## 3. Choice

A resident chooses a destination by a small, legible utility score:

```text
need match × quality × vibe fit × proximity/transit
× availability (capacity, queue) × familiarity/novelty
```

The player sees a one-line explanation:

> "The Tea House — close, cosy, and open late."

or

> "The rival's Canteen — the queue was shorter and I was hungry."

No hidden AI. If the player cannot understand a choice, the system has failed,
not the player.

### The "why" string

Every choice should produce a short reason string at the moment of decision.
This is not a debug log; it is a first-class UI surface. The resident card shows
the last choice and the reason. The day report can quote one or two.

### Tie-breakers

When two services are close, use:

1. The more urgent need.
2. The shorter queue.
3. The closer door (or better transit).
4. A seeded small preference, so the crowd is not deterministic in a boring way.

---

## 4. Memory, familiarity and love

There are two time scales, and the game needs both.

### Patronage — short-term

- Visits, repeat use, queues tolerated, "I came back."
- A shiny new venue can steal patronage quickly.
- Patronage is the leading indicator: it tells the player what is working today.
- It is tracked per chapter and shown as a smaller "visits" stat.

### Devotion — long-term

- Repeated good experiences, a home, being cared for when in need, a sense of
  belonging.
- A resident can appreciate more than one chapter; they have a favourite.
- Devotion is sticky. A single bad day does not erase it.
- At the Confluence, the favourite gets the vote.

### Affinity model

Each resident has an affinity score per chapter, roughly 0–5 hearts. It rises
when:

- a visit satisfies a need well;
- the resident is housed by that chapter;
- the chapter serves them when their need is urgent;
- a policy or module specifically fits their traits.

It falls when:

- a queue is too long and they give up;
- a service is closed when they need it;
- the finish or vibe makes them feel unwelcome;
- they are homeless or ignored for several days.

Affinity decays very slowly toward neutral; it does not reset daily.

### Defection

A resident does not defect because of one bad day. Defection happens at
intervals (every few days, or at the Confluence) when another chapter is clearly
better for them. This makes love meaningful and prevents chaos.

---

## 5. Housing and population

Housing is the first service and the anchor of the loop.

- A resident needs a bed. No bed, no home, no vote.
- New residents arrive when there is housing capacity and Flourishing is
  healthy. They leave when homeless, chronically unmet or ignored.
- Housing quality and space determine who arrives: modest capsules attract
  modest residents; family halls attract Creche demand; grand atriums attract
  exacting residents.
- Population is the engine: more residents means more civic energy, but also
  more needs and more upkeep. Growth is a choice, not an automatic good.

### Arrivals

- New arrivals appear at the Welcome Post or a Transit Gate.
- The number per day is a tuning lever; start with 1–2 when there is spare
  housing and Flourishing is above the comfort line.
- Arrivals bring a trait mix and one urgent need, so the player has something to
  respond to immediately.

### Departures

- A resident leaves if homeless for more than a day, or if several needs stay
  high for several days, or if another chapter is much better for them at a
  defection window.
- Departures are announced in the day report and hurt the chapter's Devotion
  slightly (the story is "they left," not "they were subtracted").

---

## 6. Entering and leaving buildings

This is the "rabbit hole" behaviour, and it is non-negotiable.

- Every service has an **entrance cell**, a **queue area** and an abstract
  interior with capacity and a use duration.
- A resident paths to the door, waits in a queue if full, disappears inside for
  the duration, and emerges with a mood/need icon and a change in state.
- A small occupancy indicator (lit windows, a queue, a door animation) shows the
  building is in use. The player does not need a rendered interior.
- **Outdoor services** (bench, kiosk, court, telescope) are used in place: the
  resident stands at the counter or sits, and the interaction is visible.
- Selected buildings open a **record card** with occupants, queue, visits,
  hearts, modules and policy. A 2D cutaway illustration is enough; do not build
  3D interiors.

The prototype did the opposite: buildings were walls
(`NPCController.isWalkable()` → `BuildingManager.isWorldBlocked()`, both since
removed). The refinement makes them destinations.

### Queue rules

- Queue slots are outside the door, visible.
- If the queue is full, the resident re-evaluates and may choose another
  service. This is a real decision, not a failure.
- A long queue is a signal to the player: build capacity, add hours, or accept
  the overflow.
- A resident who gives up on a queue loses a little affinity and remembers it
  for the day.

---

## 7. Schedule

The day has four phases. Service opening hours matter. Needs peak at different
times.

| Phase | What happens |
| --- | --- |
| **Morning** | Residents wake, leave home, seek Sustenance and Purpose. |
| **Afternoon** | Company, Care and Wonder; errands; the quiet trade. |
| **Evening** | Company, Sustenance and Wonder; the social peak. |
| **Night** | Rest; Night Kitchen and night venues; the small hours. |

This creates the *Monopoly Tycoon* rhythm — the rush before opening, the quiet
afternoon, the night trade — without real-time stress. The player can set hours
as policy and see the consequences in the day report.

---

## 8. Word of mouth

Keep this simple in the first version.

- A district has a **buzz** value, driven by recent satisfied and unsatisfied
  residents.
- Positive buzz attracts a small number of extra arrivals or visits; negative
  buzz suppresses them.
- The day report can quote a resident: "I heard the tea house is lovely."
- A full social graph (friends, recommendations, feuds) is a later layer. Do not
  build it before the individual choice is fun.

---

## 9. Resident card

The card is the player's window into a person. It should fit on one small panel.

- Name, procedural portrait (later), helmet colour.
- Traits: Temperament / Standards / Rhythm.
- Needs: four to six small bars, with the urgent one highlighted.
- Home: chapter, building, "homeless" if none.
- Favourite chapter and hearts.
- Last choice: service, chapter, and the "why" line.
- A short recent history: "visited the Canteen 3 times this week; complained
  about the queue on Day 4."

The card is also the place to teach the player what a trait means, in one line,
not a tooltip essay.

---

## 10. First vertical slice

- 12–15 named residents.
- Four needs: Sustenance, Rest, Company, Wonder.
- Three traits, one value each.
- One island, four services: Housing, Canteen, Tea House, Garden Dome.
- Patronage and Devotion tracked, but no rivals yet.
- Resident card with needs, traits, last choice and why.
- Enter/exit and queues working for at least the Canteen and Tea House.

**Acceptance:** the player can watch a resident choose a service, enter it,
emerge happier, and explain why. The resident's card shows the reason.

---

## 11. Implementation notes

- **Resident** model: `id, name, traits, needs, home, affinity{}, memory, state,
  position, schedule`.
- **ResidentBrain**: need decay, schedule, destination utility, why string.
- **ResidentAgent**: path to door, queue slot, enter, timer, exit.
- **Navigation**: per-island grid, A* to doors, queue slots, local avoidance.
  This is a prerequisite, not polish. See
  [implementation.md](implementation.md#5-prerequisites).
- **Determinism**: seeded traits and names; the day simulation is deterministic
  given seed, actions and day number. See
  [D2](decisions.md#d2--planning-plus-playback).
- **Performance**: 30–40 residents, 25–40 buildings, 60 fps; throttle
  pathfinding and cache paths.
- **Save**: residents' traits, needs, affinity and home are part of save v2.

---

## 12. Open questions

1. Should residents have a fourth "Story" trait in the first version, or later?
2. How much affinity should a single great visit create? (Start small; tune.)
3. Do residents choose a *building* or a *service type* first? (Recommend
   service type, then building, to keep the "why" legible.)
4. How visible should the affinity numbers be? (Recommend hearts, not decimals.)
5. Should a resident be able to work in a service as well as use it? (Later;
   Purpose and staffing are a possible layer, but not in Phase 1.)
