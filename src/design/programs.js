/**
 * Service programs — the data table behind every building.
 *
 * A program defines the need it serves, when it is open, how many people it can
 * hold, what it costs to raise and keep, and the silhouette the renderer draws.
 * The First Light slice only exposes the four `buildable` programs below;
 * the Commons Beacon is kept as endgame data for the Confluence layer.
 */
export const PROGRAMS = [
    {
        id: 'housing',
        name: 'Welcome House',
        category: 'Housing',
        need: 'rest',
        secondaryNeed: null,
        capacity: 4,
        duration: 0,
        open: ['night'],
        passive: true,
        footprint: { w: 1, h: 1 },
        cost: 4,
        upkeep: 1,
        durationText: 'sleeps 4',
        quality: 1,
        finish: 'comfortable',
        vibe: 'cosy',
        constructionDays: 1,
        buildable: true,
        color: 'coral',
        icon: 'housing',
        testid: 'program-housing',
        blurb: 'Beds, a warm window and an airlock that knows your name. Housing is the anchor: without a bed, nothing else works.'
    },
    {
        id: 'canteen',
        name: 'Canteen',
        category: 'Sustenance',
        need: 'sustenance',
        secondaryNeed: null,
        capacity: 4,
        duration: 1.6,
        open: ['morning', 'afternoon'],
        footprint: { w: 1, h: 1 },
        cost: 4,
        upkeep: 2,
        durationText: 'fast, filling',
        quality: 1,
        finish: 'comfortable',
        vibe: 'efficient',
        constructionDays: 1,
        buildable: true,
        color: 'sun',
        icon: 'canteen',
        testid: 'program-canteen',
        blurb: 'A counter, an awning and a pot that is always nearly ready. The busiest door in the chapter at breakfast and noon.'
    },
    {
        id: 'tea_house',
        name: 'Tea House',
        category: 'Company',
        need: 'company',
        secondaryNeed: 'sustenance',
        capacity: 3,
        duration: 2.1,
        open: ['afternoon', 'evening'],
        footprint: { w: 1, h: 1 },
        cost: 5,
        upkeep: 2,
        durationText: 'slow, warm',
        quality: 1.08,
        finish: 'comfortable',
        vibe: 'cosy',
        constructionDays: 1,
        buildable: true,
        color: 'bubblegum',
        icon: 'tea_house',
        testid: 'program-tea-house',
        blurb: 'Hanging lamps, a long table and a pot that never quite empties. Company first, a little supper second.'
    },
    {
        id: 'garden_dome',
        name: 'Garden Dome',
        category: 'Wonder',
        need: 'wonder',
        secondaryNeed: 'rest',
        capacity: 2,
        duration: 2.5,
        open: ['afternoon', 'evening'],
        footprint: { w: 2, h: 2 },
        cost: 6,
        upkeep: 3,
        durationText: 'the long view',
        quality: 1.18,
        finish: 'comfortable',
        vibe: 'curious',
        constructionDays: 1,
        buildable: true,
        color: 'mint',
        icon: 'garden_dome',
        testid: 'program-garden-dome',
        blurb: 'A pressurised garden under glass: condensation, green leaves, and the only weather on the island. Wonder first, rest second.'
    },
    {
        id: 'commons_beacon',
        name: 'Commons Beacon',
        category: 'Civic',
        need: null,
        secondaryNeed: null,
        capacity: 6,
        duration: 1,
        open: ['morning', 'afternoon', 'evening', 'night'],
        footprint: { w: 2, h: 2 },
        cost: 12,
        upkeep: 0,
        durationText: 'the shared wonder',
        quality: 1.1,
        finish: 'grand',
        vibe: 'curious',
        constructionDays: 2,
        buildable: false,
        color: 'lavender',
        icon: 'commons_beacon',
        testid: 'program-commons-beacon',
        blurb: 'A tower of prism glass raised by every chapter together. It belongs to the Confluence, not to the build dock.'
    }
];

export const PROGRAM_BY_ID = Object.fromEntries(PROGRAMS.map((program) => [program.id, program]));

export const BUILDABLE_PROGRAMS = PROGRAMS.filter((program) => program.buildable);

export const STARTING_HOUSING_PROGRAM = 'housing';
export const STARTING_HOUSING_CAPACITY = 6;

/** Canonical need served by a program, or null for civic structures. */
export function programNeed(program) {
    return program?.need || null;
}

/** Does this program serve the given need (primary or secondary)? */
export function servesNeed(program, needId) {
    if (!program) return false;
    if (program.id === 'commons_beacon') return true;
    return program.need === needId || program.secondaryNeed === needId;
}

/** Is the program open during this phase? */
export function isOpenAt(program, phaseId) {
    return Boolean(program?.open?.includes(phaseId));
}

export function footprintCells(program, u, v) {
    const width = program?.footprint?.w || 1;
    const height = program?.footprint?.h || 1;
    const cells = [];
    for (let dv = 0; dv < height; dv++) {
        for (let du = 0; du < width; du++) cells.push({ u: u + du, v: v + dv });
    }
    return cells;
}
