# Gameplay and controls

> **Status note:** this describes the **First Light vertical slice** and the
> **Contest preview** as built today. It is no longer the Prism Tide prototype.
> The wider design — full festival campaign, shared commons, auctions and
> stewardship, building layers — is in [design-refinement.md](design-refinement.md) and
> [design/](design/). Gameplay facts here are the current build; the design
> target is elsewhere.

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
| `P` | Toggle the patronage flow overlay (homes → last choices) |
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

A new charter starts on **Day 1**. In **First Light**:

- **6 active Tidelanders** from a seeded roster of **15**;
- a fixed **Welcome Post** with six beds (already `ACTIVE`, cannot be
  dismantled);
- **10 lumen**;
- **2 works**;
- the **Canteen** armed in the service dock.

In **The Contest**, all three chapters start with **3 active Tidelanders**
(9 total), a fixed four-bed **Welcome House**, **15 lumen** and a doctrine;
the player has 2 works and rivals have 1. The rest of the roster waits for spare
beds and a flourishing of at least 20.
The day limit is set by map size: **12** days on small, **14** on medium, **16**
on large.

## Charter modes

The lobby offers two modes:

| Mode | What it is |
| --- | --- |
| **First Light** | The solo tutorial slice: one chapter, one shard, the 12-resident / flourishing-62 goal. |
| **The Contest** | A two-rival preview on the same shard. **The Gardener** and **The Host** each start with three residents, a four-bed Welcome House, 15 lumen and a doctrine. They build, pay upkeep and receive contributions under the same rules as the player. Residents choose between all chapters' doors. In the last three days the **campaign** opens: rivals publish promises and the player chooses one. At the day limit the **Confluence** convenes and every resident votes. |

In Contest mode the First Light objective card is replaced by a live **Devotion**
standings card. Each chapter begins with a fixed Welcome House (four beds) and
the player's home grid grows to 7×7 on small, 8×8 on medium and 9×9 on large
to fit three chapters. Rival
services carry a chapter-coloured pennant, appear in the bulletin's rival move,
and cannot be dismantled by the player. Rivals build one service or house per
day from their doctrine, pay upkeep and can go short; their residents contribute
lumen exactly like the player's. Residents are assigned to the chapter with a
spare bed. Arrivals go to the least-crowded chapter with room, then the
most-beloved. A rival can
win residents into its own housing, reopens a service lost to a shortfall when
it can afford to, and chooses its next build by shared need pressure plus its
doctrine. The Contest also pays a **civic dividend** of **1 lumen per resident
per day** on top of wellbeing contributions, so a small chapter can keep
building; solo First Light does not use the dividend. The **patronage flow overlay** (Show flows in the standings card, or
`P`) traces each resident's last choice from their home door to the service
door, coloured by chapter.

## Campaign

On the **last three days** of a Contest the campaign begins. A promise dialog
opens (and a **Campaign** card appears above the standings); the morning
bulletin also carries the campaign item. Each rival publishes one promise from
the same four options, and the player chooses one:

- **A night kitchen** — sustenance.
- **A room of one's own** — rest.
- **The long table** — company.
- **A garden in the void** — wonder.

The player's promise is locked once chosen. Each campaign day has a **festival
event** — *The Empty Larder*, *The Long Night*, *The Homecoming* or *Lanterns
in the Void*. Services belonging to a chapter whose promise matches that day's
need are more magnetic, and the promise adds weight to that chapter's final
vote with residents whose urgent need matches. Rival promises add a smaller
weight to their chapters. The programme is shown in the campaign dialog, the
HUD campaign card and the bulletin. The promise is carried into the Confluence
screen and cannot be changed there.

## Day visitors

On every Contest day, **2–3 day-trippers** arrive from the outer isles. They
are not residents: they have no bed, no vote and no place in the roster, and
they leave when the next day begins. They do use the archipelago's services and
pay **1 lumen per visit** to the chapter whose door they use. Their fees appear
in the evening report and the chapter ledgers; their visits count in the
event's totals and can crowd queues. The Commons Beacon charges no fee. A visitor who has spent time with one of
your services (player affinity at least **0.15**) and a **spare bed** can be
invited to stay from the evening report; they join the resident roster, keep
their name and memory, and can vote in the Confluence. Visitors are a Contest
feature for now; First Light remains resident-only.

## Retrofit

An open player service can be retrofitted once from its service record. Choose
one module:

- **Sunroom** — 6 lumen: **+2 capacity**, **+0.05 quality**, **+1 upkeep**.
- **Atelier** — 6 lumen: **+0.22 quality**, **+1 upkeep**, no extra seats.
- **Night Kitchen** — 7 lumen: **+1 capacity**, **+0.12 quality**, **+2 upkeep**.

All three give a **grand** finish. The module is permanent and saved with the
charter; rivals do not retrofit. Policy capacity and retrofit capacity stack.

## The Commons Beacon

Every Contest starts with a reserved **Commons Beacon** site and a shared fund
of **20 lumen**. The player can give 5 or 10 lumen from the **Commons** card
in the HUD; each rival gives 1 lumen per day when it has at least 6 in hand.
Every chapter's contribution is recorded. When the fund fills, the Beacon
becomes active, every resident's needs ease by **3 each night**, and the Beacon
opens as a six-seat shared service that can answer any need. It is a shared
institution, not a private service, and it cannot be bought or dismantled by one
chapter alone. The planned shared-island institution is still future work;
this Beacon sits on the home shard.

## The first Commons Assembly

When the Beacon is lit, the Commons HUD changes to **nominations**. Opening it
calls the first **Commons Assembly**. Each chapter nominates one shared policy, and residents sign a petition for one
policy of their own:

- The player picks the Home Chapter's nomination from four policies.
- The Gardener nominates **Commons Garden**; the Host nominates **Shared Table**.
- The top petition policy joins the finalists even if no chapter nominated it.
- Every resident then votes among the finalists; the policy with the most votes
  becomes the Assembly policy. The player does not cast a resident vote, only
the chapter's nomination.

The four policies are:

- **Shared Table** — every Canteen and Tea House gains 2 seats.
- **Open Beds** — every Welcome House gains 2 beds.
- **Commons Garden** — every Garden Dome gains 2 seats.
- **Night Watch** — the Beacon eases one more point of every need at night, and
  beds restore one more Rest.

The winning policy applies to existing services and to every service built
afterwards by the player or a rival. It is saved with the charter. The ballot is
one-time and there is no petition phase or second reading.

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

- **First Light victory:** at the end of any day, the chapter has at least **12
  housed residents** and a **Flourishing of 62 or more**. The charter closes
  successfully immediately; the day limit is the deadline, not a survival timer.
- **First Light defeat:** the population falls below **4** at the end of a day,
  or the day limit arrives without both goals.
- **Contest:** at the day limit the report hands over to the **Confluence**.
  The campaign promise is locked in; call the vote. Each active resident votes
  for the chapter they trust most. The player's campaign pledge adds weight when
  it matches that resident's most urgent need; rival pledges do the same for
  their chapters. The most votes wins, with Devotion as the
  tie-break. If shared flourishing is below the survival line, nobody wins.
  This is a first-pass festival and vote, not the full campaign/auction design.
- **Abandon:** the charter menu asks for confirmation, then ends the run early as
  a voluntary departure and clears the save.

## Stewardship

If the player wins the Confluence, the result screen leads to a **stewardship**
choice. The winning chapter chooses one governing promise:

- **Universal Care** — care by right, not by luck.
- **The Open Table** — the next arrival is expected.
- **Commons Assembly** — residents choose the works.
- **Garden Charter** — beauty is infrastructure.

The stewardship changes the epilogue and the charter record, not the resolved
day. A rival winner takes stewardship without a player choice and the run ends
on the defeat record.


The end screen shows days weathered, residents, Devotion, Flourishing and lumen,
plus the outcome and a quote. It offers **Return to the drift** (menu) or **New
charter** (lobby). Ending a run clears the save.

Departures make the population-below-four defeat reachable: demolish or fail to build housing and the chapter can empty. The goal-at-the-limit defeat remains the other path.

## Map sizes

| Size | Islands | Grids | Shards (minerals) | Day limit |
| --- | --- | --- | --- | --- |
| Small | 4 | one 7×7 + three 2×2 | 46 | 12 |
| Medium | 6 | one 8×8 + two 3×3 + three 2×2 | 64 | 14 |
| Large | 7 | one 9×9 + two 3×3 + four 2×2 | 82 | 16 |

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

- **Balance is generous and untuned.** Early victory removes the long surplus
  tail, but the opening four days still do not force a hard care choice; the
  Contest rival economy is still being tuned.
- **Population pressure is real but sparse.** Departures only trigger after two
  homeless nights or three days at 92+ need; there is no broader wellbeing or
  word-of-mouth departure yet.
- **Only the home shard is playable.** Other islands are scenery; there is no
  transit or archipelago layer.
- **No building layers, modules, finishes, policies or retrofit.** The model
  carries default finish/policy values for future use; the player cannot choose
  them.
- **The Contest is a preview.** Rivals build services and housing, pay upkeep,
  receive contributions, reopen lost services and react to need pressure, but
  their planning is still one move per day. The campaign now has three festival
  events, but it is still one promise each and a resident vote, not a larger
  multi-round festival, auctions or stewardship.
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
