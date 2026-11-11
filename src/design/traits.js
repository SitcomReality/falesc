/**
 * Three small trait axes. None is strictly better; each changes which places
 * feel right. Trait ids are stored in saves, so keep them stable.
 */
export const TEMPERAMENTS = [
    {
        id: 'cosy',
        name: 'Cosy',
        blurb: 'Likes quiet rooms, warm lamps and a corner seat.',
        prefers: ['cosy']
    },
    {
        id: 'social',
        name: 'Social',
        blurb: 'Likes a full table, a queue with gossip in it, a bit of noise.',
        prefers: ['lively']
    },
    {
        id: 'curious',
        name: 'Curious',
        blurb: 'Likes a view, a new thing, a room that makes them ask questions.',
        prefers: ['curious']
    }
];

export const STANDARDS = [
    {
        id: 'modest',
        name: 'Modest',
        blurb: 'At home in a humble room. Grand places can feel like a rebuke.',
        comfort: { humble: 1.1, comfortable: 1.0, grand: 0.82 }
    },
    {
        id: 'comfortable',
        name: 'Comfortable',
        blurb: 'Wants clean, warm and cared for. The middle is enough.',
        comfort: { humble: 0.92, comfortable: 1.08, grand: 1.0 }
    },
    {
        id: 'exacting',
        name: 'Exacting',
        blurb: 'Notices the finish. A humble room reads as an apology.',
        comfort: { humble: 0.78, comfortable: 0.98, grand: 1.16 }
    }
];

export const RHYTHMS = [
    {
        id: 'early',
        name: 'Early',
        blurb: 'Up with the light. Eats and socialises early, fades by night.',
        rise: { morning: 1.4, afternoon: 1.0, evening: 0.8, night: 0.6 }
    },
    {
        id: 'night',
        name: 'Night',
        blurb: 'Comes alive after dusk. Slow mornings, late tea, small hours.',
        rise: { morning: 0.6, afternoon: 0.9, evening: 1.3, night: 1.4 }
    }
];

export const TEMPERAMENT_BY_ID = Object.fromEntries(TEMPERAMENTS.map((entry) => [entry.id, entry]));
export const STANDARD_BY_ID = Object.fromEntries(STANDARDS.map((entry) => [entry.id, entry]));
export const RHYTHM_BY_ID = Object.fromEntries(RHYTHMS.map((entry) => [entry.id, entry]));

/** How well a resident's temperament matches a program's vibe. */
export function vibeFit(traitId, programVibe) {
    const temperament = TEMPERAMENT_BY_ID[traitId];
    if (!temperament || !programVibe) return 1;
    if (temperament.prefers.includes(programVibe)) return 1.16;
    if (programVibe === 'efficient' && traitId === 'social') return 0.96;
    if (programVibe === 'curious' && traitId === 'cosy') return 0.9;
    if (programVibe === 'lively' && traitId === 'cosy') return 0.9;
    return 1;
}

/** How welcome a finish makes a resident feel. */
export function standardFit(traitId, finish = 'comfortable') {
    const standard = STANDARD_BY_ID[traitId] || STANDARD_BY_ID.comfortable;
    return standard.comfort[finish] ?? 1;
}

/** Per-phase multiplier for a resident's rhythm. */
export function rhythmRise(traitId, phaseId) {
    const rhythm = RHYTHM_BY_ID[traitId] || RHYTHM_BY_ID.early;
    return rhythm.rise[phaseId] ?? 1;
}

export function describeTraits(traits) {
    const temperament = TEMPERAMENT_BY_ID[traits?.temperament];
    const standard = STANDARD_BY_ID[traits?.standards];
    const rhythm = RHYTHM_BY_ID[traits?.rhythm];
    return [temperament?.name, standard?.name, rhythm?.name].filter(Boolean).join(' · ');
}
