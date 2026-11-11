/**
 * Neighbouring services make a district. A shared edge grants a small quality
 * bonus; mixing chapters or the commons makes the street more than the sum of
 * its doors. The bonus is recomputed whenever the shared occupancy changes.
 */
export const ADJACENCY = {
    perNeighbour: 0.02,
    differentChapter: 0.02,
    max: 0.1
};

export function computeAdjacency(service, occupancy) {
    if (!service || !occupancy) return { bonus: 0, neighbours: 0, chapters: [] };
    const seen = new Set();
    const chapters = new Set();
    for (const cell of service.cells || []) {
        for (const [du, dv] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const other = occupancy.get(`${service.sectorId}:${cell.u + du}:${cell.v + dv}`);
            if (!other || other.id === service.id || seen.has(other.id)) continue;
            seen.add(other.id);
            if (other.chapterId !== service.chapterId) chapters.add(other.chapterId);
        }
    }
    const neighbours = seen.size;
    const bonus = Math.min(ADJACENCY.max,
        neighbours * ADJACENCY.perNeighbour + chapters.size * ADJACENCY.differentChapter);
    return { bonus: Math.round(bonus * 100) / 100, neighbours, chapters: [...chapters], neighbourIds: [...seen] };
}
