/**
 * The five needs of the First Light slice. Purpose is a slower civic need: it
 * drives the Workshop and daily requests, but flourishing is measured on the
 * four core needs so early balance stays legible.
 *
 * Urgency runs from 0 (satisfied) to 100 (urgent). Needs rise across the four
 * day phases and are reduced by a service visit or a night at home. The numbers
 * here are tuning data, not simulation logic; the day simulator owns the order
 * in which they are applied.
 */
export const NEEDS = [
    {
        id: 'sustenance',
        name: 'Sustenance',
        short: 'Food',
        glyph: '◒',
        color: '#FF6B5E',
        blurb: 'A hot meal, a full plate, something warm at the right hour.',
        reason: 'I was hungry',
        baseRise: { morning: 5, afternoon: 4, evening: 5, night: 3 }
    },
    {
        id: 'rest',
        name: 'Rest',
        short: 'Rest',
        glyph: '☾',
        color: '#C9B6FF',
        blurb: 'A bed, a quiet room, and enough of the night to use it.',
        reason: 'I needed somewhere quiet to sleep',
        baseRise: { morning: 2, afternoon: 3, evening: 4, night: 3 }
    },
    {
        id: 'company',
        name: 'Company',
        short: 'Company',
        glyph: '♡',
        color: '#FF4F9A',
        blurb: 'A table to share, a familiar face, a reason to linger.',
        reason: 'I wanted company',
        baseRise: { morning: 2, afternoon: 4, evening: 5, night: 2 }
    },
    {
        id: 'wonder',
        name: 'Wonder',
        short: 'Wonder',
        glyph: '✦',
        color: '#59E3C2',
        blurb: 'Something green behind glass, a view, a thing worth pointing at.',
        reason: 'I wanted to see something wonderful',
        baseRise: { morning: 1, afternoon: 3, evening: 3, night: 1 }
    },
    {
        id: 'purpose',
        name: 'Purpose',
        short: 'Purpose',
        glyph: '✶',
        color: '#FFD36E',
        blurb: 'Work worth doing, a craft to tend, a reason to be useful.',
        reason: 'I wanted work that mattered',
        baseRise: { morning: 1, afternoon: 1, evening: 2, night: 1 }
    }
];

export const NEED_BY_ID = Object.fromEntries(NEEDS.map((need) => [need.id, need]));

export const NEED_IDS = NEEDS.map((need) => need.id);
export const CORE_NEED_IDS = NEED_IDS.filter((id) => id !== 'purpose');

export function clampNeed(value) {
    return Math.max(0, Math.min(100, Math.round(value * 10) / 10));
}

export function mostUrgentNeed(needs) {
    let best = null;
    for (const need of NEEDS) {
        const value = Number(needs?.[need.id] ?? 0);
        if (!best || value > best.value) best = { ...need, value };
    }
    return best;
}

export function averageUrgency(needs) {
    if (!needs) return 0;
    const total = CORE_NEED_IDS.reduce((sum, id) => sum + Number(needs[id] ?? 0), 0);
    return total / CORE_NEED_IDS.length;
}

/** 0–100 wellbeing derived only from need satisfaction. */
export function wellbeingFromNeeds(needs) {
    return Math.max(0, Math.min(100, 100 - averageUrgency(needs)));
}

export function urgentNeedIds(needs, threshold = 65) {
    return NEEDS.filter((need) => Number(needs?.[need.id] ?? 0) >= threshold).map((need) => need.id);
}
