# Decisions and scope guard

> **Status:** living decision log. `Decided` means the fork is closed unless a
> concrete playtest gives a new argument. `Proposed` means the current design
> assumes it, but it is still open.

Record the date, the reasoning, and what would change your mind. Run new
features through the [design test](#design-test) and the
[scope guard](#scope-guard).

---

## Decision log

### D1 — Single-player first; solo vs. AI is the first competitive build

**Status:** Decided — 2026-11-11

**Decision.** The first release is single-player. Phase 1 is solo with **no
rivals**, to prove the resident loop. Phase 2 is **solo vs. two AI chapters**.
Human multiplayer is later. No real-time networking in the first version.

**Why.** If the resident loop is not fun alone, AI rivals will only hide the
problem. Building the AI before the resident brain also makes it hard to tell
which system is failing.

**Consequences.** Phase 1 has no standings or rival bulletin item. Phase 2 adds
two AI chapters, the rival move and the standings card. Deterministic day
resolution and a command log are the multiplayer hooks; nothing else is built.

**Revisit if.** Phase 1 playtests show the loop is fun but pointless without a
rival. Then pull one AI chapter forward. Never pull in human multiplayer.

---

### D2 — Planning plus playback

**Status:** Decided — 2026-11-11

**Decision.** Turn-based with a **watched day**. Planning is paused. Opening the
day plays a deterministic simulation at 1×/2×/4×, with a skip. No real-time
mode.

**Why.** Playback keeps the "living city" magic without the real-time pressure
and micromanagement that made the old game grating. It is readable, testable,
accessible, fair for async multiplayer, and fits the current state machine:
`PLAYING` = planning, `INTERSTITIAL` becomes the day, then the report.

**Consequences.** The day is deterministic given seed, actions and day number.
The player cannot issue build orders during playback. The day report is the
primary feedback surface. A real-time mode is out of scope.

**Revisit if.** Players skip every day and still enjoy the game. That argues for
a shorter playback, not for real-time.

---

### D3 — Defer auctions, stewardship and petitions

**Status:** Decided — 2026-11-11

**Decision.** No auctions, stewardship claims or petitions in the first
competitive version. All chapters build on the shared central commons; service
quality, capacity, hours and care decide. Stewardship and petitions are Phase 4.
Cash auctions are not in the design.

**Why.** The old auctions were great tension but the easiest way to turn FALESC
back into a property game. Care competition must be fun before land drama is
layered on.

**Consequences.** No auction UI, bid timer, landlord rent or plot ownership in
Phase 2. A building is a contribution, not territory. The Phase 4 design is a
contest of promises, not cash.

**Revisit if.** Phase 2 feels too soft spatially. Pull forward a minimal
stewardship rule, never a cash auction.

---

### D4 — The Confluence is the main mode

**Status:** Decided — 2026-11-11

**Decision.** Product framing: **FALESC: The Confluence.** The main mode ends in
a festival and a vote. "The Prism Tide" is the cosmic event and the first
scenario. The Aurora Beacon becomes the **Commons Beacon**, a shared endgame
wonder that raises Flourishing and triggers the Confluence; it is not the win
condition.

**Why.** The dream is a competition for residents' love, not a race to raise a
monument. As a win button, the Beacon makes the people irrelevant.

**Consequences.** The HUD's primary objective is Devotion and Flourishing. The
Beacon is built collaboratively in the last three tides; contributions are
public. The finale is a vote with a shared failure state.

**Revisit if.** The vote feels arbitrary. Fix the legibility of the vote (show
favourites and reasons), not the Beacon.

---

### D5 — No per-item prices or stock

**Status:** Decided — 2026-11-11 (guardrail)

**Decision.** Services do not buy, stock, price or spoil goods. Levers are
placement, program, modules, finish, policy, capacity and hours.

**Why.** Per-store pricing and restocking was the old game's most common
complaint. It turns a social game into a spreadsheet.

**Consequences.** No stock UI, price sliders or spoilage timers. Competition is
quality, capacity, inclusion, hours and care. A future price-like lever would be
one "contribution" policy per building, not per-item pricing.

---

### D6 — Keep the mythic names

**Status:** Proposed

**Decision.** Keep **Tidelanders**, **the Glass Sea**, **tide**, **lumen** and
**Lampwright** as mythic language, even though the world is a void. Explain once
that the Glass Sea is the luminous void, not water.

**Why.** They are already in the code, saves and visual identity, and they give
the game a voice.

**Revisit if.** Playtests show consistent confusion, or a stronger naming set is
worth the churn. Do not rename casually; it touches copy, saves and tests.

---

### D7 — Named residents with lightweight cards

**Status:** Proposed

**Decision.** The first slice uses 12–15 named residents with traits, needs and
a small resident card. Names and a "last choice" line make the vote legible.

**Why.** The emotional core is a person choosing a place. A crowd of anonymous
agents makes the Confluence abstract.

**Revisit if.** Population grows beyond what a card can carry. Then use
representative individuals and a crowd statistic, not 60 named cards.

---

### D8 — No real-time networking in the first version

**Status:** Decided — consequence of D1/D2

**Decision.** Multiplayer is hot-seat/async at the earliest. No real-time
transport, authoritative server or lockstep networking.

**Why.** The zero-build prototype should not carry a networking stack before the
day simulation is deterministic and fun. Async suits a planning game.

**Consequences.** Design for a command log and deterministic resolution. Do not
add websockets, matchmaking or presence to the prototype.

---

## Design test

Before adding any feature, ask:

1. Does it make a Tidelander's choice more visible?
2. Does it create a care trade-off — who gets served, and at what cost?
3. Does it deepen the competition for love?
4. Can the player explain the result without opening a spreadsheet?

If the answer to all four is no, cut it or defer it.

---

## Scope guard

### In scope for the first version

One island, 12–15 named residents, four needs, four services, one player. Plan →
playback → report. Devotion, Flourishing, Patronage. Lumen from resident
wellbeing, upkeep, construction. Save/load, tests, accessibility basics.

### Out of scope for now

Auctions, landlords, rent, stock, prices. Human multiplayer, real-time
networking. 40 building types, a tech tree, a stock market. 3D interiors or a
second map view. Combat, raids, destructive disasters. Procedural quests or a
dialogue tree per resident. More crystal/Beacon mechanics.

### Before adding a system

- Write the player-facing sentence it enables.
- Write the acceptance test.
- Check it against the design test.
- If it needs a new resource, stop and ask whether an existing meter can carry
  it.

---

## Open questions

1. **Tone.** Warm, wry and sincere is the proposal. How much satire is too much?
2. **Named residents.** Keep names at 30+ residents, or move to representative
   individuals?
3. **Land competition.** If Phase 2 feels too soft, which minimal stewardship
   rule comes forward?
4. **Subtitle.** Is "The Prism Tide" the first scenario, the cosmic event, or
   both?
5. **Co-op priority.** Is "Commonwealth" a stretch goal or a first-class mode?

---

## Change log

| Date | Change |
| --- | --- |
| 2026-11-11 | Initial decision log. D1–D4 accepted; D5 recorded as a guardrail; D6–D7 proposed. Split the design into an overview and component docs. |
