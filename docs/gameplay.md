# Gameplay and controls

FALESC is an isometric island construction sandbox. You have one build action
per turn and can watch a small population and scattered minerals while you
place buildings. There is no economy, objective, or victory condition yet.

## Controls

| Input | Action |
| --- | --- |
| `W` `A` `S` `D` or arrow keys | Pan the camera |
| Mouse wheel | Zoom toward the cursor (0.2×–4×) |
| Middle-mouse drag | Pan |
| One-finger drag (touch) | Pan |
| Two-finger pinch (touch) | Zoom and pan |
| Primary click/tap on an empty grid cell | Open the build prompt |
| `Enter` in the build prompt | Reserve the building |
| `Escape` in the build prompt | Cancel |
| End Turn button | Finish the current turn |
| End Game button | Go to the Game Over screen |

The build prompt only opens while the game is in `PLAYING`, at least one build
action remains, and the clicked cell is inside a sector grid and unoccupied.
The minimap at bottom-left shows the islands, existing buildings, and the
current camera viewport.

## Turn loop

1. A new game starts on turn 1 with one build action.
2. Place at most one building during the turn.
3. Click **End Turn**. The game shows the “Turn N Complete” interstitial for
   two seconds and returns to play on the next turn with one action again.
4. Buildings advance one lifecycle phase per interstitial.

There is no turn timer and no automatic end turn. The `turnDuration` setting
exists in `GameStateManager` but is not used by the UI.

## Building lifecycle

Buildings use three phases:

| Phase | When | Appearance |
| --- | --- | --- |
| `PENDING` | Immediately after reserving | Translucent blue, pulsing |
| `RESERVED` | After the first end-turn interstitial | Blue ghost, partially transparent |
| `ACTIVE` | After the second end-turn interstitial | Solid grey block |

So a building placed on turn 1 is a ghost during turn 2 and solid from turn 3
onward. The promotion is driven by a one-second timer inside the turn
transition; see [known-issues.md](known-issues.md#4-turn-and-building-timing-is-not-state-driven).

Placement is one building per grid cell. There is no cost, resource, ownership,
terrain, or demolition rule, and minerals/characters do not block a cell.

## Map

The world is generated from a numeric seed and a map size:

| Map size | Islands | Minerals |
| --- | --- | --- |
| Small | 4 | 30 |
| Medium | 6 | 50 |
| Large | 7 | 70 |

Every map also spawns 15 characters. Islands are irregular isometric shapes with
a buildable grid in the middle and scenery minerals around the edges. The map
is nominally five times the viewport in each direction; use the minimap and zoom
to navigate it.

Characters are ambient NPCs. They idle, bend to inspect the ground, and wander
at walk or run speed. They do not interact with buildings, minerals, or each
other, and they are not constrained to the islands.

## Current limitations

- No save/load or persistence: reloading starts over.
- No win/lose condition; **End Game** is a manual exit.
- No resources, costs, income, or building effects.
- Multiplayer is a placeholder alert.
- No building demolition or upgrades.
- No collision between characters and buildings/minerals.
- The camera has no world-bound clamp, so it can be panned into empty space.
- The world keeps animating behind the menu and end screens.

See [known-issues.md](known-issues.md) for the technical details and suggested
directions.
