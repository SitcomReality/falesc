/**
 * A stewardship promise outlives the charter that made it. The legacy is the
 * small, visible beginning of the next run: one extra bed, a warmer table, a
 * seeded commons purse, or a broader garden.
 */
export const LEGACY_KEY = 'falesc.legacy.v1';

export const LEGACY_EFFECTS = {
    universal_care: {
        title: 'Universal Care',
        blurb: 'The next charter remembers care: its Welcome House keeps one more bed.'
    },
    open_table: {
        title: 'The Open Table',
        blurb: 'The next charter remembers the table: its canteens and tea houses keep one more seat.'
    },
    commons_assembly: {
        title: 'The Commons Assembly',
        blurb: 'The next charter remembers the commons: the Beacon fund and purse begin with 5 lumen.'
    },
    garden_charter: {
        title: 'The Garden Charter',
        blurb: 'The next charter remembers the garden: its garden domes keep one more place.'
    }
};

export function readLegacy() {
    try {
        const raw = localStorage.getItem(LEGACY_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !LEGACY_EFFECTS[parsed.policyId]) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function writeLegacy({ policyId, chapterName = 'Home Chapter', day = null }) {
    if (!LEGACY_EFFECTS[policyId]) return null;
    const legacy = {
        policyId,
        chapterName,
        day,
        chosenAt: new Date().toISOString()
    };
    try {
        localStorage.setItem(LEGACY_KEY, JSON.stringify(legacy));
    } catch {
        return null;
    }
    return legacy;
}

export function clearLegacy() {
    try {
        localStorage.removeItem(LEGACY_KEY);
    } catch {
        // Storage can be unavailable; the run simply has no legacy.
    }
}

export function describeLegacy(legacy) {
    return legacy ? LEGACY_EFFECTS[legacy.policyId] || null : null;
}
