/**
 * Milestones earned across charters. This is a small achievement archive, not a
 * save: it never resumes a run and never grants lumen.
 */
export const MILESTONES_KEY = 'falesc.milestones.v1';

export function readMilestones() {
    try {
        const raw = localStorage.getItem(MILESTONES_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
    } catch {
        return [];
    }
}

export function recordMilestones(ids) {
    const merged = [...new Set([...readMilestones(), ...(ids || [])])];
    try {
        localStorage.setItem(MILESTONES_KEY, JSON.stringify(merged));
    } catch {
        return null;
    }
    return merged;
}

export function clearMilestones() {
    try {
        localStorage.removeItem(MILESTONES_KEY);
    } catch {
        // Storage can be unavailable; the archive simply stays empty.
    }
}
