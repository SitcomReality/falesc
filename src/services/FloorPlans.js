/**
 * The room added above a service. A floor is always one volume; the plan says
 * whether it sleeps, hosts or opens to the sky.
 */
export const FLOOR_PLANS = [
    {
        id: 'dormer',
        name: 'Dormer',
        kicker: 'More room',
        blurb: 'Bunk space under the roof. Two more beds in housing, one more seat elsewhere.',
        cost: 4,
        housingCapacity: 2,
        serviceCapacity: 1,
        quality: 0,
        upkeep: 1
    },
    {
        id: 'common_room',
        name: 'Common Room',
        kicker: 'Better visits',
        blurb: 'A shared room with a long window. One more seat and a finer visit.',
        cost: 4,
        housingCapacity: 1,
        serviceCapacity: 1,
        quality: 0.04,
        upkeep: 1
    },
    {
        id: 'roof_garden',
        name: 'Roof Garden',
        kicker: 'Air and green',
        blurb: 'A planted roof rather than a room. No new seats, but visits are much warmer.',
        cost: 4,
        housingCapacity: 0,
        serviceCapacity: 0,
        quality: 0.08,
        upkeep: 1
    }
];

export const FLOOR_PLAN_BY_ID = Object.fromEntries(FLOOR_PLANS.map((plan) => [plan.id, plan]));
