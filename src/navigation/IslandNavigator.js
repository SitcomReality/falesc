import { cellKey } from '../services/PlacementPolicy.js';

const NEIGHBORS = [
    { u: 0, v: 1 },
    { u: 1, v: 0 },
    { u: 0, v: -1 },
    { u: -1, v: 0 }
];

/**
 * Coarse per-island navigation. A* on the build grid, with service footprints
 * as walls and doors as free destination cells. Small grids keep this cheap;
 * paths are only computed when a resident chooses a destination.
 */
export class IslandNavigator {
    constructor(sector, services = []) {
        this.sector = sector;
        this.size = sector.gridSize;
        this.blocked = new Set();
        for (const service of services) {
            for (const cell of service.cells) {
                this.blocked.add(cellKey(sector.id, cell.u, cell.v));
            }
        }
    }

    key(u, v) {
        return cellKey(this.sector.id, u, v);
    }

    isInside(u, v) {
        return u >= 0 && v >= 0 && u < this.size && v < this.size;
    }

    isWalkable(u, v) {
        return this.isInside(u, v) && !this.blocked.has(this.key(Math.floor(u), Math.floor(v)));
    }

    cellCenter(u, v) {
        return this.sector._project(u + 0.5, v + 0.5);
    }

    worldPath(cells) {
        return (cells || []).map((cell) => this.cellCenter(cell.u, cell.v));
    }

    pathLength(cells) {
        let total = 0;
        for (let index = 1; index < (cells || []).length; index++) {
            const a = this.cellCenter(cells[index - 1].u, cells[index - 1].v);
            const b = this.cellCenter(cells[index].u, cells[index].v);
            total += Math.hypot(b.x - a.x, b.y - a.y);
        }
        return total;
    }

    /** Nearest walkable cell, including the start cell if it is already free. */
    nearestWalkable(u, v) {
        const start = { u: Math.floor(u), v: Math.floor(v) };
        if (this.isWalkable(start.u, start.v)) return start;
        for (let radius = 1; radius <= this.size * 2; radius++) {
            for (let du = -radius; du <= radius; du++) {
                for (let dv = -radius; dv <= radius; dv++) {
                    if (Math.max(Math.abs(du), Math.abs(dv)) !== radius) continue;
                    const candidate = { u: start.u + du, v: start.v + dv };
                    if (this.isWalkable(candidate.u, candidate.v)) return candidate;
                }
            }
        }
        return null;
    }

    /** A* returning grid cells from start to goal (inclusive), or null. */
    path(start, goal) {
        const from = this.nearestWalkable(start.u, start.v);
        const to = this.nearestWalkable(goal.u, goal.v);
        if (!from || !to) return null;
        if (from.u === to.u && from.v === to.v) return [from];

        const startKey = this.key(from.u, from.v);
        const goalKey = this.key(to.u, to.v);
        const open = [startKey];
        const openSet = new Set(open);
        const cameFrom = new Map();
        const gScore = new Map([[startKey, 0]]);
        const fScore = new Map([[startKey, heuristic(from, to)]]);
        const nodes = new Map([[startKey, from]]);

        while (open.length > 0) {
            open.sort((a, b) => (fScore.get(a) ?? Infinity) - (fScore.get(b) ?? Infinity));
            const currentKey = open.shift();
            openSet.delete(currentKey);
            if (currentKey === goalKey) {
                const cells = [];
                let cursor = currentKey;
                while (cursor) {
                    cells.push(nodes.get(cursor));
                    cursor = cameFrom.get(cursor);
                }
                return cells.reverse();
            }

            const current = nodes.get(currentKey);
            for (const offset of NEIGHBORS) {
                const next = { u: current.u + offset.u, v: current.v + offset.v };
                if (!this.isWalkable(next.u, next.v)) continue;
                const nextKey = this.key(next.u, next.v);
                nodes.set(nextKey, next);
                const tentative = (gScore.get(currentKey) ?? Infinity) + 1;
                if (tentative < (gScore.get(nextKey) ?? Infinity)) {
                    cameFrom.set(nextKey, currentKey);
                    gScore.set(nextKey, tentative);
                    fScore.set(nextKey, tentative + heuristic(next, to));
                    if (!openSet.has(nextKey)) {
                        open.push(nextKey);
                        openSet.add(nextKey);
                    }
                }
            }
        }
        return null;
    }

    randomWalkable(rng) {
        const free = [];
        for (let v = 0; v < this.size; v++) {
            for (let u = 0; u < this.size; u++) {
                if (this.isWalkable(u, v)) free.push({ u, v });
            }
        }
        if (free.length === 0) return null;
        return free[rng.nextInt(0, free.length - 1)];
    }
}

function heuristic(a, b) {
    return Math.abs(a.u - b.u) + Math.abs(a.v - b.v);
}
