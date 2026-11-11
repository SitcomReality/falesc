# Gameplay and controls

FALESC: The Prism Tide is an isometric island city-builder. You have one build
action per tide, a small purse of lumen, and a deadline: raise the Aurora Beacon
before the last tide.

## Controls

| Input | Action |
| --- | --- |
| `W` `A` `S` `D` or arrow keys | Pan the camera |
| Mouse wheel | Zoom toward the cursor |
| Middle-mouse drag | Pan |
| One-finger drag (touch) | Pan |
| Two-finger pinch (touch) | Zoom and pan |
| Click a blueprint card | Arm that structure |
| Primary click/tap on an empty grid cell | Open the build dialog for the armed blueprint |
| `Enter` in the build dialog | Reserve the plot |
| `Escape` in the build dialog | Cancel |
| `Enter` / `Escape` in the charter menu | Resume / close |
| End Turn button | Resolve the tide |
| Charter menu (☰) → Abandon charter | End the run |

The build dialog only opens while the game is `PLAYING`, at least one build
action remains, the selected blueprint is affordable, and the clicked cell is
inside a sector grid and unoccupied. The survey chart at bottom-left shows the
islands, buildings, and camera viewport; it turns red where the camera is
looking.

## The tide loop

1. A new charter starts on **Day 1** with **8 lumen** and one build action.
2. Arm a blueprint and place at most one structure.
3. Click **Let the tide turn**.
4. The interstitial shows the tide, the income due, and the structures at work.
   During resolution:
   - active structures pay their income into the purse;
   - every `PENDING` structure becomes `RESERVED`;
   - every `RESERVED` structure becomes `ACTIVE`;
   - the day advances and one build action returns.
5. If the Aurora Beacon is `ACTIVE`, the charter is won. If the next day would
   pass the tide limit, the charter is lost.

A structure therefore takes two turns to finish: placed on Day 1, it is
`RESERVED` on Day 2 and `ACTIVE` on Day 3. Income is collected from structures
that were already active at the start of resolution, so a structure that becomes
active this tide starts paying next tide.

## Blueprints

| Blueprint | Cost | Income | Role |
| --- | --- | --- | --- |
| **Prism Rig** | 3 lumen | +2 / tide | Cheap, reliable opening economy. |
| **Tide Garden** | 5 lumen | +3 / tide | Stronger economy, slower payback. |
| **Lantern House** | 4 lumen | +1 / tide | Support. Each one reduces the Aurora Beacon's price by 3 (floor 6). |
| **Aurora Beacon** | 12 lumen (dynamic) | — | Unique charter goal. Must become `ACTIVE` to win. |

The Beacon's displayed price is dynamic: `max(6, 12 − 3 × Lantern Houses)`. An
armed blueprint costs nothing until the build dialog is confirmed. If the plot
creation fails, no lumen or action is spent.

The build dock disables blueprints that are unaffordable, already unique, or
blocked because the tide's build action is spent. Hovering a disabled card
explains why in its tooltip.

## Map and difficulty

| Map size | Islands | Minerals | Tide limit |
| --- | --- | --- | --- |
| Small | 4 | 30 | 12 days |
| Medium | 6 | 50 | 14 days |
| Large | 7 | 70 | 16 days |

Every map also spawns 15 Tidelanders. Islands are generated once from the seed,
packed by their actual silhouette bounds, and placed in a world with open water
around them. The seed determines island shapes, character palettes/proportions,
mineral variations, and the starting NPC decisions.

## Victory and defeat

- **Victory:** the Aurora Beacon becomes `ACTIVE`. The end screen reports tides
  weathered, active structures, and lumen remaining.
- **Defeat:** the tide limit passes without an active Beacon.
- **Abandon:** the charter menu closes the run early. The end screen records it
  as a voluntary departure.

The end screen returns to the menu (where a save may still exist for an
in-progress run) or opens the lobby for a new charter.

## Persistence

The game autosaves to `localStorage` under `falesc.save.v1` after each build and
each completed tide, and before the page unloads. The save stores only model data
(seed, map size, day, lumen, actions, selected blueprint, structures, camera).
The world is regenerated from the seed on load.

The menu shows **Continue charter** when a valid save exists. Ending or
abandoning a run clears the save. The save is versioned; unknown versions are
discarded rather than partially loaded.

## Current limitations

- No demolition or upgrades.
- No placement restrictions around minerals, characters, or ownership.
- No audio.
- No multiplayer; the menu labels it “soon”.
- No keyboard build cursor: placement is pointer/touch only.
- Characters avoid buildings and stay on their home island, but use steering, not
  a full navigation graph.
- Some open issues remain; see [known-issues.md](known-issues.md).
