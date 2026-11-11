# Gameplay and controls

> **Status note:** this describes the **First Light vertical slice** as built
> today. It is no longer the Prism Tide prototype. The wider design — rivals,
> standings, the Confluence vote, building layers — is in
> [design-refinement.md](design-refinement.md) and [design/](design/).
> Gameplay facts here are the current build; the design target is elsewhere.

FALESC: The Confluence is an isometric city-builder about caring for a small
chapter of Tidelanders on a floating shard. You have a day limit, a shared lumen
budget, two works per day, and a cast of people with needs. The First Light
charter is won by reaching **12 housed residents and a flourishing of 62** by the day
limit.

## Controls

| Input | Action |
| --- | --- |
| `W` `A` `S` `D` or arrow keys | Pan the camera |
| Mouse wheel | Zoom toward the cursor |
| Middle-mouse drag | Pan |
| One-finger drag (touch) | Pan |
| Two-finger pinch (touch) | Zoom and pan |
| `1` `2` `3` `4` | Arm Housing / Canteen / Tea House / Garden Dome |
| Click/tap a dock card | Arm that service |
| Primary click/tap a free plot | Open the build dialog for the armed service |
| Primary click/tap a service | Open its service record |
| Primary click/tap a resident | Open their resident card |
| `E` | Open the day (end planning) |
| `B` | Open the morning bulletin |
| `R` | Open the resident roster |
| `Escape` while planning | Open/close the charter menu |
| `Enter` in the build dialog | Break ground |
| `←` `→` in the resident card | Previous / next resident |
| `Escape` in a dialog or menu | Cancel / close / return to planning |
| Day controls | `1×` `2×` `4×` speed and **Skip** |
| Report | **Begin Day N** (or **Read the charter record** when the run ends) |
| Charter menu (☰) → Abandon charter | End the run voluntarily |

Clicking a resident takes precedence over clicking the plot beneath them when
the pointer is within about 60 px of a visible resident. Residents who are
inside a service cannot be clicked. The survey chart at bottom-left shows the
islands, services, residents and camera viewport; click it to move the camera.

## The charter

A new charter starts on **Day 1** with:

- **6 active Tidelanders** from a seeded roster of **15**;
- a fixed **Welcome Post** with six beds (already `ACTIVE`, cannot be
  dismantled);
- **10 lumen**;
- **2 works**;
- the **Canteen** armed in the service dock.

The rest of the roster waits for spare beds and a flourishing of at least 20.
The day limit is set by map size: **12** days on small, **14** on medium, **16**
on large.

## Planning

Planning is paused. Each day gives **two works**. Building a service spends one
work and the program's lumen cost immediately, and places the service as
`PENDING`. At the start of the next planning day it becomes `ACTIVE` and starts
accepting visits and drawing upkeep.

You can only build on the **home shard** — the largest, topmost island. The
other islands are scenery for now. Placement checks the footprint, occupancy,
and that a free door cell exists on the service edge. The door cell is reserved:
you cannot build on it, and clicking it opens the service record.

Hovering the grid shows a mint diamond and a ghost of the armed service when the
plot is legal, coral when it is not. Clicking a legal plot opens the build
dialog, where you can name the place and **Break ground**. The dialog traps
focus, restores it on close, and marks the HUD behind it inert.

The dock disables a service when you have no works left or cannot afford it;
its tooltip explains which. Clicking an existing service opens a record with its
program, status, capacity, upkeep, visits, hearts, door cell and the last "why"
line from a resident. From there:

- **Dismantle** removes the service, refunds `max(1, floor(cost / 2))` lumen,
  frees the plot immediately, and spends no work. The Welcome Post cannot be
  dismantled.
- **Reopen** appears when a service has been closed by an upkeep shortfall. It
  costs `max(1, ceil(upkeep / 2))` lumen.

## Services

All four buildable services cost one work and finish overnight. The Commons
Beacon is endgame art and data, not a buildable program.

| Program | Serves | Cost | Upkeep/day | Capacity | Hours | Footprint |
| --- | --- | --- | --- | --- | --- | --- |
| **Housing** (Welcome House) | Rest | 4 | 1 | 4 beds | night, passive | 1×1 |
| **Canteen** | Sustenance | 4 | 2 | 4 | morning, afternoon | 1×1 |
| **Tea House** | Company, a little Sustenance | 5 | 2 | 3 | afternoon, evening | 1×1 |
| **Garden Dome** | Wonder | 6 | 3 | 2 | afternoon, evening | 2×2 |
| **Commons Beacon** | — | 12 | 0 | — | — | 2×2, not buildable |

The starting Welcome Post is housing with a capacity override of **6** and a
fixed flag. A normal Welcome House adds four beds. The Garden Dome is the only
place with plants, and they are inside pressurised glass; the world outside has
no open-air planting.

Housing is the anchor. At night, a resident with a bed recovers a large amount
of Rest and gains a little Devotion; a resident without one takes a Rest penalty
and complains. Rest is not a daytime destination in this slice — residents do
not visit a housing queue in the morning, and the Garden Dome's listed Rest
secondary does not replace a bed.

## Needs and choices

There are four needs, each tracked from **0 (satisfied)** to **100 (urgent)**:

| Need | Satisfied by | Flavour |
| --- | --- | --- |
| **Sustenance** | Canteen (strong), Tea House (secondary) | A hot meal at the right hour. |
| **Rest** | A bed at night | A quiet room and enough night to use it. |
| **Company** | Tea House | A shared table and a reason to linger. |
| **Wonder** | Garden Dome | Something green behind glass. |

Needs rise through the four day phases — morning, afternoon, evening, night —
at rates modified by the resident's **rhythm**. A visit to a service reduces the
chosen need: a primary match gives a large reduction, a secondary match a
smaller one. Need satisfaction determines **wellbeing**
(`100 − average urgency`). The chapter's **Flourishing** is the average resident
wellbeing; **Devotion** is the sum of each resident's affinity with the chapter.

Each resident has three small trait axes, all seeded and visible on their card:

- **Temperament** — Cosy, Social or Curious. Changes how much they like a
  service's vibe.
- **Standards** — Modest, Comfortable or Exacting. Changes how welcome a finish
  feels.
- **Rhythm** — Early or Night. Changes how quickly needs rise in each phase.

When a resident chooses where to go, the day simulator scores open services for
the most urgent needs using urgency, primary/secondary match, quality, vibe fit,
standards, distance from home, current load/queue, familiarity and a small
seeded novelty term. The highest positive score wins. This is deliberately
legible: the resident records a one-line **why**, such as
`Canteen — I was hungry, there was no queue, I come here often.`

A service holds `capacity` people at once and up to three more in its queue.
If a service is full, the resident re-evaluates the next candidate; if every
option is full, they give up with a visible reason, a complaint and a small loss
of affinity. A resident with no open service for a need of 62 or more complains;
complaints feed the bulletin and the evening report. A need of 92 or more is
tracked as an unmet day. After three consecutive unmet days, or two nights
without a bed, the resident leaves. Departures are
announced in the next bulletin and the evening report, remove the agent from the
shard, and reduce the chapter's population and Devotion. If fewer than four
residents remain, the charter is defeated.

## The day loop

1. **Morning bulletin** — planning is paused. Three items: the most pressing
   need, an arrival/departure or the latest complaint, and a line of word of mouth.
2. **Plan** — read the room, arm a service, place one or two works, inspect
   residents and services, decide who gets the last lumen.
3. **Open the day** — `DaySimulator` resolves the entire day immediately:
   needs drift, residents choose, queue, visit, recover, complain, contribute
   lumen, and the report is written. Then the `DAY` screen replays those
   precomputed events as a deterministic view.
4. **Watch** — playback is four phases of five seconds each at 1× (20 seconds
   total). `2×` and `4×` shorten it; **Skip** jumps to the end. Residents walk
   along A* paths, wait outside the door, disappear inside while using the
   place, and emerge with a need glyph. You cannot build or change policy during
   playback. This is a replay, not a real-time simulation.
5. **Evening report** — the broadsheet described below. **Begin Day N** advances
   the day, restores two works, opens completed construction, assigns beds,
   adds any arrivals, and shows the next bulletin.
6. **End** — once both First Light goals are met the charter closes; if the day
   limit arrives first it is judged. Abandon is always available in the menu.

A service built during Day 1 planning is `PENDING` through Day 1's playback and
opens during Day 2 planning. You still have both Day 2 works available.

## Economy

Lumen is **civic energy**, held in common. It is not profit and there is no
price per visit.

Each active resident contributes according to their wellbeing at the end of the
day:

| Resident wellbeing | Contribution |
| --- | --- |
| 65 or more | 2 lumen |
| 35 to 64 | 1 lumen |
| below 35 | 0 lumen |

Every active, open service draws its **upkeep** each day. The report shows
contributions, upkeep, net, and the lumen left in hand. A comfortable chapter is
usually net-positive, especially once it has housed more people; the current
numbers are generous and not yet tuned.

If contributions cannot cover upkeep, the chapter does not go into debt:
services are closed at dusk, in the order **Wonder → Company → Sustenance**
(housing is exempt), highest upkeep first, until the shortfall is covered. A
closed service stops accepting visits and stops drawing upkeep. It can be
reopened from its service record for lumen. The report names what closed.

## The evening report

The report is the day's story as a broadsheet:

- **Visits** and **Hearts gained** (with a small loss note when affinity falls),
  **Contributions**, **Upkeep**, **Lumen**, **Flourishing**.
- **Needs at dusk** for all four needs.
- **Doors and visits** — every service, including those with zero visits.
- **Word of mouth** — up to three resident quotes, or a quiet fallback.
- **Complaints** — up to five, with the resident's own words.
- Any closures caused by the upkeep shortfall.
- A one-line summary of the day's rhythm.
- If the run ended, the report becomes the charter record and its button reads
  **Read the charter record** before the end screen.

## Victory and defeat

- **Victory:** at the end of any day, the chapter has at least **12 housed
  residents** and a **Flourishing of 62 or more**. The charter closes
  successfully immediately; the day limit is the deadline, not a survival timer.
- **Defeat:** the population falls below **4** at the end of a day, or the day
  limit arrives without both goals.
- **Abandon:** the charter menu asks for confirmation, then ends the run early as
  a voluntary departure and clears the save.

The end screen shows days weathered, residents, Devotion, Flourishing and lumen,
plus the outcome and a quote. It offers **Return to the drift** (menu) or **New
charter** (lobby). Ending a run clears the save.

Departures make the population-below-four defeat reachable: demolish or fail to build housing and the chapter can empty. The goal-at-the-limit defeat remains the other path.

## Map sizes

| Size | Islands | Grids | Shards (minerals) | Day limit |
| --- | --- | --- | --- | --- |
| Small | 4 | four 2×2 | 46 | 12 |
| Medium | 6 | two 3×3 + four 2×2 | 64 | 14 |
| Large | 7 | one 5×5 + two 3×3 + four 2×2 | 82 | 16 |

Only the **home shard** (largest, topmost) is playable; the rest are generated
scenery. The seed determines island shapes and packing, the fifteen-person
roster and their traits, character palettes and proportions, mineral variations,
and the day's small novelty terms. The same seed and the same actions produce
the same day.

The lobby chart's "Shards" readout is the mineral count. The survey chart and
camera fit the whole generated cluster; the camera starts on the home shard.

## Save v2

The game autosaves to `localStorage` under **`falesc.save.v2`** while planning
— after starting a charter, after a build, dismantle or reopen, after beginning
the next day, and on `beforeunload` while `PLAYING` — and again when the evening
report opens. Reloading on the report restores that report (there is no replay
of the day). It does not save during `DAY` or `END`.

The payload is model data only:

```json
{
  "version": 2,
  "savedAt": 0,
  "settings": { "mapSeed": 12345, "mapSize": "medium" },
  "charter": {
    "seed": 12345,
    "mapSize": "medium",
    "day": 3,
    "dayLimit": 14,
    "lumen": 12,
    "works": 2,
    "flourishing": 63.5,
    "devotion": 8.3,
    "ending": null,
    "pendingArrivals": [],
    "lastReport": null,
    "residents": [],
    "services": []
  },
  "camera": { "x": 0, "y": 0, "zoom": 0.5 }
}
```

`residents` store identity, traits, needs, active/departed state, home service,
affinity and memory (including the last choice and homeless nights); `services`
store program, footprint, state, door, capacity, finish/policy defaults, visits,
hearts and closure state. `lastReport` is the save-safe summary used by the
report screen, bulletin and end quote.
The world is regenerated from the seed on continue, and the camera is restored
and clamped.

The menu shows **Continue charter** when a valid save exists. Save v1 is
intentionally removed and discarded; an unknown save version is cleared, and a
structurally invalid v2 payload is cleared rather than half-loaded. There is no export/import
yet.

## Current limitations

- **Balance is generous and untuned.** A careful run can bank a large lumen
  surplus; the interesting pressure is not yet there.
- **Population pressure is real but sparse.** Departures only trigger after two
  homeless nights or three days at 92+ need; there is no broader wellbeing or
  word-of-mouth departure yet.
- **Only the home shard is playable.** Other islands are scenery; there is no
  transit, archipelago layer or rival chapter.
- **No building layers, modules, finishes, policies or retrofit.** The model
  carries default finish/policy values for future use; the player cannot choose
  them.
- **No rivals, standings, patronage or Confluence vote.** The bulletin has no
  rival move.
- **No auctions, stewardship, petitions or multiplayer.** The Multiplayer button
  is a disabled placeholder.
- **No audio.**
- **No keyboard build cursor.** The dock and dialogs are keyboard-friendly, but
  choosing a plot requires a pointer or touch.
- **The resident card stops at the last choice.** It has needs, traits, home,
  Devotion, wellbeing and the latest "why"; it has no portrait and no full
  recent-history list, even though the model keeps recent visits.
- **Save v1 is intentionally discarded.** There is no migration, export or
  import.
- **No visual baseline is committed.** Animation and ambient timing are not yet
  stable enough for pixel regression.
- **Day playback is a view over an already-resolved day,** not a live
  simulation. There is no mid-day intervention.
- **Crowd movement has no local avoidance.** Agents follow precomputed paths and
  can overlap visually.
- Some open issues remain; see [known-issues.md](known-issues.md).
