/**
 * Up to two retrofit modules per service. Each choice is a different finish:
 * more seats, a finer room, or a longer shared table.
 */
export const RETROFIT_MODULES = [
    {
        id: 'sunroom',
        name: 'Sunroom',
        kicker: 'More seats',
        blurb: 'A glassed-in extension. Two more seats, a little more quality, one more upkeep.',
        cost: 6,
        capacity: 2,
        quality: 0.05,
        upkeep: 1
    },
    {
        id: 'atelier',
        name: 'Atelier',
        kicker: 'Better visits',
        blurb: 'A finer room rather than a bigger one. No new seats, but much better visits.',
        cost: 6,
        capacity: 0,
        quality: 0.22,
        upkeep: 1
    },
    {
        id: 'caretaker_nook',
        name: "Caretaker's Nook",
        kicker: 'A little more care',
        blurb: 'A small staffed corner. One more seat, a little more quality, one more upkeep.',
        cost: 5,
        capacity: 1,
        quality: 0.03,
        upkeep: 1
    },
    {
        id: 'night_kitchen',
        name: 'Night Kitchen',
        kicker: 'A shared table',
        blurb: 'One more seat and a better room; the kitchen stays open later and costs more to run.',
        cost: 7,
        capacity: 1,
        quality: 0.12,
        upkeep: 2
    }
];

export const RETROFIT_BY_ID = Object.fromEntries(RETROFIT_MODULES.map((module) => [module.id, module]));
export const RETROFIT_MIN_COST = Math.min(...RETROFIT_MODULES.map((module) => module.cost));
