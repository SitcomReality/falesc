/**
 * Charter blueprints.
 *
 * Costs and yields are intentionally small integers so the whole economy can be
 * read from the HUD without opening a spreadsheet. `beaconDiscount` is how much
 * each completed Lantern House shaves off the Aurora Beacon's price.
 */
export const BLUEPRINTS = [
    {
        id: 'prism_rig',
        name: 'Prism Rig',
        category: 'Harvest',
        cost: 3,
        income: 2,
        blurb: 'A nimble derrick for coaxing lumen out of the reef. Cheap, quick, and the sensible first move.',
        accent: 'mint',
        testid: 'blueprint-prism-rig'
    },
    {
        id: 'tide_garden',
        name: 'Tide Garden',
        category: 'Harvest',
        cost: 5,
        income: 3,
        blurb: 'Terraced pools that let the tide do the work. A bigger investment with a steadier return.',
        accent: 'cyan',
        testid: 'blueprint-tide-garden'
    },
    {
        id: 'lantern_house',
        name: 'Lantern House',
        category: 'Support',
        cost: 4,
        income: 1,
        beaconDiscount: 3,
        blurb: 'Warm windows and a stubborn little lamp. Each Lantern House makes the Aurora Beacon cheaper to raise.',
        accent: 'coral',
        testid: 'blueprint-lantern-house'
    },
    {
        id: 'aurora_beacon',
        name: 'Aurora Beacon',
        category: 'Charter',
        cost: 12,
        income: 0,
        unique: true,
        goal: true,
        blurb: 'A tower of prism glass. Raise it and keep the light burning to complete your charter.',
        accent: 'lavender',
        testid: 'blueprint-aurora-beacon'
    }
];

export const BLUEPRINT_BY_ID = Object.fromEntries(BLUEPRINTS.map((blueprint) => [blueprint.id, blueprint]));

export const BEACON_ID = 'aurora_beacon';
export const DEFAULT_BLUEPRINT_ID = 'prism_rig';

/** Dynamic Beacon price after Lantern House discounts (never below 6). */
export function beaconCost(buildings) {
    const lanterns = buildings.filter((building) => building.blueprintId === 'lantern_house').length;
    return Math.max(6, BLUEPRINT_BY_ID[BEACON_ID].cost - lanterns * BLUEPRINT_BY_ID.lantern_house.beaconDiscount);
}

/** The effective cost of a blueprint given the current buildings. */
export function effectiveCost(blueprint, buildings) {
    if (blueprint.id === BEACON_ID) return beaconCost(buildings);
    return blueprint.cost;
}
