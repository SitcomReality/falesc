/**
 * The shell finish chosen when a service breaks ground. A humble finish saves a
 * lumen and a seat; a grand finish costs more, seats one more and adds upkeep.
 * The resident standard trait already reads `service.finish`.
 */
export const BUILDING_FINISHES = [
    {
        id: 'humble',
        name: 'Humble',
        blurb: 'A plain shell. Saves 1 lumen, seats one fewer, 0.9 quality.',
        costDelta: -1,
        capacityDelta: -1,
        upkeepDelta: 0
    },
    {
        id: 'comfortable',
        name: 'Comfortable',
        blurb: 'The program as drawn. No change to cost, seats or upkeep.',
        costDelta: 0,
        capacityDelta: 0,
        upkeepDelta: 0
    },
    {
        id: 'grand',
        name: 'Grand',
        blurb: 'A generous shell. Costs 2 more, seats one more, +1 upkeep.',
        costDelta: 2,
        capacityDelta: 1,
        upkeepDelta: 1
    }
];

export const BUILDING_FINISH_BY_ID = Object.fromEntries(BUILDING_FINISHES.map((entry) => [entry.id, entry]));

export function finishFor(id) {
    return BUILDING_FINISH_BY_ID[id] || BUILDING_FINISH_BY_ID.comfortable;
}

export function finishCost(program, id) {
    return Math.max(0, (program?.cost || 0) + finishFor(id).costDelta);
}
