import { PROGRAM_BY_ID } from '../design/programs.js';
import { serviceUpkeepModifier } from './ServicePolicies.js';
import { computeAdjacency } from './ServiceAdjacency.js';
import { evaluatePlacement, cellKey } from './PlacementPolicy.js';
import { ServiceBuilding } from './ServiceBuilding.js';
import { FLOOR_PLAN_BY_ID } from './FloorPlans.js';

/**
 * Owns every service in the chapter: placement, footprints, doors, opening
 * state, visits and the model side of queues. The day simulator reads and
 * updates it; the Pixi container is kept beside the model for a cheap render.
 */
export class ServiceManager {
    constructor({ map = null, parentContainer = null, chapter = null, occupancy = null, idPrefix = 's' } = {}) {
        this.map = map;
        this.parentContainer = parentContainer;
        this.chapter = chapter;
        this.occupancy = occupancy || new Map();
        this.idPrefix = idPrefix;
        this.services = [];
        this._nextNumber = 1;
    }

    setMap(map) {
        this.map = map;
    }

    setParentContainer(container) {
        this.parentContainer = container;
    }

    get activeServices() {
        return this.services.filter((service) => service.state === 'ACTIVE' && !service.closed);
    }

    get buildableServices() {
        return this.services.filter((service) => service.state === 'PENDING');
    }

    get housingServices() {
        return this.activeServices.filter((service) => service.programId === 'housing');
    }

    serviceAt(sectorId, u, v) {
        return this.occupancy.get(cellKey(sectorId, Math.floor(u), Math.floor(v))) || null;
    }

    isCellOccupied(sectorId, u, v) {
        return this.occupancy.has(cellKey(sectorId, Math.floor(u), Math.floor(v)));
    }

    refreshAdjacency() {
        for (const service of this.services) {
            const adjacency = computeAdjacency(service, this.occupancy);
            service.adjacencyBonus = adjacency.bonus;
            service.adjacencyNeighbours = adjacency.neighbours;
            service.adjacencyChapters = adjacency.chapters;
        }
    }

    countProgram(programId) {
        return this.services.filter((service) => service.programId === programId).length;
    }

    canPlace(programId, sectorId, u, v) {
        const program = PROGRAM_BY_ID[programId];
        return evaluatePlacement({
            map: this.map,
            program,
            sectorId,
            u,
            v,
            occupiedCells: this.occupancy
        });
    }

    place({ programId, sectorId, u, v, name, state = 'PENDING', capacityOverride = null, fixed = false, finish = null }) {
        const program = PROGRAM_BY_ID[programId];
        const check = this.canPlace(programId, sectorId, u, v);
        if (!check.ok) return check;

        const service = new ServiceBuilding({
            id: `${this.idPrefix}-s${this._nextNumber++}`,
            chapter: this.chapter,
            programId,
            program,
            sectorId,
            u: Math.floor(u),
            v: Math.floor(v),
            name: name || program.name,
            state,
            entrance: check.entrance,
            capacityOverride,
            fixed,
            finish
        });
        service.setSector(check.sector);
        this.register(service);
        return { ok: true, service, entrance: check.entrance };
    }

    register(service) {
        const idMatch = /-s(\d+)$/.exec(service.id);
        if (idMatch) {
            this._nextNumber = Math.max(this._nextNumber, Number(idMatch[1]) + 1);
        }
        this.services.push(service);
        for (const cell of service.cells) {
            this.occupancy.set(cellKey(service.sectorId, cell.u, cell.v), service);
        }
        // The door cell is reserved too: nothing may build on a doorway, and a
        // click on it opens the service record.
        if (service.entrance) {
            this.occupancy.set(cellKey(service.sectorId, service.entrance.u, service.entrance.v), service);
        }
        const sector = this.map?.sectors.find((entry) => entry.id === service.sectorId);
        service.setPosition(sector);
        if (this.parentContainer) this.parentContainer.addChild(service.container);
        return service;
    }

    remove(service) {
        const index = this.services.indexOf(service);
        if (index === -1) return false;
        this.services.splice(index, 1);
        for (const cell of service.cells) {
            const key = cellKey(service.sectorId, cell.u, cell.v);
            if (this.occupancy.get(key) === service) this.occupancy.delete(key);
        }
        if (service.entrance) {
            const key = cellKey(service.sectorId, service.entrance.u, service.entrance.v);
            if (this.occupancy.get(key) === service) this.occupancy.delete(key);
        }
        if (service.container?.parent) service.container.parent.removeChild(service.container);
        service.destroy();
        return true;
    }

    housingCapacity() {
        return this.housingServices.reduce((sum, service) => sum + service.capacity, 0);
    }

    housingFor(resident) {
        if (!resident.homeServiceId) return null;
        const service = this.services.find((entry) => entry.id === resident.homeServiceId);
        return service && service.state === 'ACTIVE' && !service.closed ? service : null;
    }

    spareHousing(residents) {
        const used = residents.filter((resident) => resident.active && resident.homeServiceId).length;
        return Math.max(0, this.housingCapacity() - used);
    }

    /**
     * Assign a bed. Houses are filled in build order so the result is stable and
     * legible in the report.
     */
    assignHome(resident, residents) {
        const usedByService = new Map();
        for (const other of residents) {
            if (!other.active || !other.homeServiceId) continue;
            usedByService.set(other.homeServiceId, (usedByService.get(other.homeServiceId) || 0) + 1);
        }
        for (const service of this.housingServices) {
            const used = usedByService.get(service.id) || 0;
            if (used < service.capacity) {
                resident.homeServiceId = service.id;
                resident.homeFloor = homeFloorFor(service, used);
                return service;
            }
        }
        resident.homeServiceId = null;
        return null;
    }

    promoteUnderConstruction() {
        const promoted = [];
        for (const service of this.services) {
            if (service.state === 'PENDING') {
                const before = service.state;
                service.promote();
                if (service.state !== before) promoted.push(service);
            }
        }
        return promoted;
    }

    upkeepFor(service) {
        return service.closed || service.state !== 'ACTIVE'
            ? 0
            : (service.program?.upkeep || 0) + (service.upkeepBonus || 0) + serviceUpkeepModifier(service);
    }

    totalUpkeep() {
        return this.services.reduce((sum, service) => sum + this.upkeepFor(service), 0);
    }

    reopenCost(service) {
        return Math.max(1, Math.ceil((service.program?.upkeep || 1) / 2));
    }

    findById(id) {
        return this.services.find((service) => service.id === id) || null;
    }

    update(dt) {
        this.services.forEach((service) => service.update(dt));
    }

    clear() {
        for (const service of this.services) {
            for (const cell of service.cells) {
                const key = cellKey(service.sectorId, cell.u, cell.v);
                if (this.occupancy.get(key) === service) this.occupancy.delete(key);
            }
            if (service.entrance) {
                const key = cellKey(service.sectorId, service.entrance.u, service.entrance.v);
                if (this.occupancy.get(key) === service) this.occupancy.delete(key);
            }
            if (service.container?.parent) service.container.parent.removeChild(service.container);
            service.destroy();
        }
        this.services = [];
        this._nextNumber = 1;
    }

    restore(entries = []) {
        let restored = 0;
        for (const entry of entries) {
            const program = PROGRAM_BY_ID[entry.programId];
            if (!program) continue;
            if (this.isCellOccupied(entry.sectorId, entry.u, entry.v)) continue;
            const service = new ServiceBuilding({
                id: entry.id,
                chapter: this.chapter,
                programId: entry.programId,
                program,
                sectorId: entry.sectorId,
                u: entry.u,
                v: entry.v,
                name: entry.name,
                state: entry.state || 'ACTIVE',
                entrance: entry.entrance,
                capacityOverride: entry.capacity,
                level: entry.level,
                retrofitId: entry.retrofitId,
                builderChapterId: entry.builderChapterId,
                qualityBonus: entry.qualityBonus,
                upkeepBonus: entry.upkeepBonus,
                floors: entry.floors,
                floorPlans: entry.floorPlans || [],
                condition: entry.condition ?? 100,
                needOverride: entry.needOverride || null,
                fixed: entry.fixed,
                finish: entry.finish,
                modules: entry.modules,
                policy: entry.policy,
                visits: entry.visits,
                hearts: entry.hearts,
                closed: entry.closed,
                constructionDays: entry.constructionDays
            });
            service.daysRemaining = entry.daysRemaining ?? 0;
            this.register(service);
            restored += 1;
        }
        return restored;
    }

    serialize() {
        return this.services.map((service) => service.toJSON());
    }
}

export function homeFloorFor(service, used) {
    const upper = (service.floorPlans || []).reduce((sum, id) => sum + (FLOOR_PLAN_BY_ID[id]?.housingCapacity || 0), 0);
    const seats = [Math.max(0, service.capacity - upper), ...(service.floorPlans || []).map((id) => FLOOR_PLAN_BY_ID[id]?.housingCapacity || 0)];
    let remaining = used;
    for (let index = 0; index < seats.length; index++) {
        if (remaining < seats[index]) return index;
        remaining -= seats[index];
    }
    return 0;
}
