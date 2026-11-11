import { footprintCells } from '../design/programs.js';

export const PLACEMENT_REASONS = {
    NO_MAP: 'The survey has not been drawn yet.',
    NOT_HOME: 'The chapter can only build on its home island for now.',
    OUTSIDE: 'That footprint runs off the island grid.',
    OCCUPIED: 'Something already stands there.',
    NO_DOOR: 'There is no free cell left for a door and queue.'
};

/**
 * Pure placement rules. Returns `{ ok, reason, cells, entrance }` so the UI and
 * tests share one explanation for why a plot is red.
 */
export function evaluatePlacement({ map, program, sectorId, u, v, occupiedCells }) {
    if (!map) return { ok: false, reason: PLACEMENT_REASONS.NO_MAP };
    if (!program) return { ok: false, reason: 'Unknown service.' };
    const sector = map.sectors.find((entry) => entry.id === sectorId);
    if (!sector) return { ok: false, reason: PLACEMENT_REASONS.NOT_HOME };
    const buildable = sector.id === map.homeSector?.id || (map.commonsEnabled && sector.commons);
    if (!buildable) {
        return { ok: false, reason: PLACEMENT_REASONS.NOT_HOME };
    }

    const anchorU = Math.floor(u);
    const anchorV = Math.floor(v);
    const cells = footprintCells(program, anchorU, anchorV);
    for (const cell of cells) {
        if (cell.u < 0 || cell.v < 0 || cell.u >= sector.gridSize || cell.v >= sector.gridSize) {
            return { ok: false, reason: PLACEMENT_REASONS.OUTSIDE };
        }
        if (occupiedCells.has(cellKey(sector.id, cell.u, cell.v))) {
            return { ok: false, reason: PLACEMENT_REASONS.OCCUPIED };
        }
    }

    const entrance = findEntrance(sector, program, anchorU, anchorV, occupiedCells);
    if (!entrance) return { ok: false, reason: PLACEMENT_REASONS.NO_DOOR };

    return { ok: true, cells, entrance, sector };
}

export function findEntrance(sector, program, u, v, occupiedCells) {
    const width = program?.footprint?.w || 1;
    const height = program?.footprint?.h || 1;
    const candidates = [];
    // Prefer a door on the south-facing edge (the camera-facing side).
    for (let du = 0; du < width; du++) candidates.push({ u: u + du, v: v + height });
    for (let dv = 0; dv < height; dv++) candidates.push({ u: u - 1, v: v + dv });
    for (let dv = 0; dv < height; dv++) candidates.push({ u: u + width, v: v + dv });
    for (let du = 0; du < width; du++) candidates.push({ u: u + du, v: v - 1 });

    for (const cell of candidates) {
        if (cell.u < 0 || cell.v < 0 || cell.u >= sector.gridSize || cell.v >= sector.gridSize) continue;
        if (occupiedCells.has(cellKey(sector.id, cell.u, cell.v))) continue;
        return { u: cell.u, v: cell.v };
    }
    return null;
}

export function cellKey(sectorId, u, v) {
    return `${sectorId}:${u}:${v}`;
}
