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
        id: 'bathhouse',
        name: 'Bathhouse',
        category: 'Care',
        need: 'rest',
        secondaryNeed: 'company',
        capacity: 5,
        duration: 1.4,
        open: ['afternoon', 'evening', 'night'],
        footprint: { w: 2, h: 2 },
        cost: 5,
        upkeep: 2,
        durationText: 'a long soak',
        quality: 1.2,
        finish: 'comfortable',
        vibe: 'cosy',
        constructionDays: 1,
        buildable: true,
        color: 'lavender',
        icon: 'bathhouse',
        testid: 'program-bathhouse',
        blurb: 'Steam, hot water and a quiet bench. Rest first, company second; the door stays open late.'
    },
    {
        id: 'clinic',
        name: 'Clinic',
        category: 'Care',
        need: 'rest',
        secondaryNeed: 'sustenance',
        capacity: 3,
        duration: 1.8,
        open: ['morning', 'afternoon', 'evening'],
        footprint: { w: 2, h: 2 },
        cost: 5,
        upkeep: 2,
        durationText: 'a short recovery',
        quality: 1.15,
        finish: 'comfortable',
        vibe: 'cosy',
        constructionDays: 1,
        buildable: true,
        color: 'mint',
        icon: 'clinic',
        testid: 'program-clinic',
        blurb: 'A quiet room, a clean cot and someone who knows what to do. Rest first, a little nourishment second.'
    },
    {
        id: 'amphitheatre',
        name: 'Amphitheatre',
        category: 'Culture',
        need: 'company',
        secondaryNeed: 'wonder',
        capacity: 5,
        duration: 2.4,
        open: ['afternoon', 'evening'],
        footprint: { w: 2, h: 2 },
        cost: 7,
        upkeep: 3,
        durationText: 'a shared show',
        quality: 1.25,
        finish: 'comfortable',
        vibe: 'curious',
        constructionDays: 1,
        buildable: true,
        color: 'bubblegum',
        icon: 'amphitheatre',
        testid: 'program-amphitheatre',
        blurb: 'Tiered benches around a small stage. Company first, wonder second; the show is whatever the archipelago brought.'
    },
    {
        id: 'creche',
        name: 'Creche',
        category: 'Care',
        need: 'company',
        secondaryNeed: 'rest',
        capacity: 4,
        duration: 2.4,
        open: ['daylight', 'evening'],
        footprint: { w: 2, h: 2 },
        cost: 5,
        upkeep: 2,
        durationText: 'a shared afternoon',
        quality: 1.18,
        finish: 'comfortable',
        vibe: 'lively',
        constructionDays: 1,
        buildable: true,
        color: 'lavender',
        icon: 'creche',
        testid: 'program-creche',
        blurb: 'A bright room, low tables and someone watching the little ones. Grown-ups get company; children get a place to be.'
    },
    {
        id: 'workshop',
        name: 'Workshop',
        category: 'Purpose',
        need: 'purpose',
        capacity: 3,
        duration: 2.6,
        open: ['daylight', 'evening'],
        footprint: { w: 2, h: 2 },
        cost: 5,
        upkeep: 2,
        durationText: 'a good shift',
        quality: 1.2,
        finish: 'comfortable',
        vibe: 'curious',
        constructionDays: 1,
        buildable: true,
        color: 'saffron',
        icon: 'workshop',
        testid: 'program-workshop',
        blurb: 'A bench, a tool wall and something worth making. Residents come here to be useful, not just comfortable.'
    },
    {
        id: 'festival_kitchen',
        name: 'Festival Kitchen',
        category: 'Festival',
        need: 'sustenance',
        capacity: 5,
        duration: 2.4,
        open: ['daylight', 'evening'],
        footprint: { w: 1, h: 1 },
        cost: 0,
        upkeep: 0,
        durationText: 'a festival plate',
        quality: 1.25,
        finish: 'comfortable',
        vibe: 'lively',
        constructionDays: 0,
        buildable: false,
        color: 'saffron',
        icon: 'canteen',
        testid: 'program-festival-kitchen',
        blurb: 'A temporary stall for the festival days. Hot food, no queue, and the whole archipelago invited.'
    },
    {
        id: 'observatory',
        name: 'Observatory',
        category: 'Wonder',
        need: 'wonder',
        secondaryNeed: null,
        capacity: 3,
        duration: 2.6,
        open: ['evening', 'night'],
        footprint: { w: 2, h: 2 },
        cost: 6,
        upkeep: 2,
        durationText: 'the long view',
        quality: 1.3,
        finish: 'comfortable',
        vibe: 'curious',
        constructionDays: 1,
        buildable: true,
        color: 'lavender',
        icon: 'observatory',
        testid: 'program-observatory',
        blurb: 'A dome, a lens and a chair that reclines. Wonder after dark, when the void is at its most legible.'
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
