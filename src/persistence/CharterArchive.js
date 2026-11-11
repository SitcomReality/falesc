/**
 * The last few charters, kept for the menu archive. This is a display record
 * only; the live save and the stewardship legacy remain separate.
 */
export const ARCHIVE_KEY = 'falesc.charters.v1';
export const ARCHIVE_LIMIT = 8;

export function readArchive() {
    try {
        const raw = localStorage.getItem(ARCHIVE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, ARCHIVE_LIMIT) : [];
    } catch {
        return [];
    }
}

export function recordFromCharter(charter, ending = {}) {
    const stats = charter?.stats?.() || {};
    return {
        chapterName: charter?.player?.name || 'Home Chapter',
        motto: charter?.motto || null,
        mode: charter?.mode || 'first-light',
        day: ending.day ?? charter?.day ?? 1,
        outcome: ending.outcome || 'abandon',
        population: stats.population ?? charter?.population ?? 0,
        flourishing: Math.round(stats.flourishing ?? charter?.flourishing ?? 0),
        visits: stats.visits ?? 0,
        devotion: Math.round((stats.devotion ?? charter?.devotion ?? 0) * 10) / 10,
        stewardship: ending.stewardship?.name || null,
        commons: charter?.commons?.active ? 'lit' : 'unlit',
        chosenAt: new Date().toISOString()
    };
}

export function recordCharter(record) {
    const archive = [record, ...readArchive()].slice(0, ARCHIVE_LIMIT);
    try {
        localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive));
    } catch {
        return null;
    }
    return record;
}

export function clearArchive(mode = null) {
    try {
        if (mode) {
            const remaining = readArchive().filter((record) => (record.mode || 'first-light') !== mode);
            localStorage.setItem(ARCHIVE_KEY, JSON.stringify(remaining));
        } else {
            localStorage.removeItem(ARCHIVE_KEY);
        }
    } catch {
        // Storage can be unavailable; the menu simply has no archive.
    }
}
