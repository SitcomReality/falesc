import { Building } from './Building.js';
import { projectGridToWorld } from '../map/GridUtils.js';
import { TILE_WIDTH, TILE_HEIGHT } from '../constants.js';
import { BLUEPRINT_BY_ID } from './blueprints.js';

export class BuildingManager {
    constructor(app, map, parentContainer) {
        this.app = app;
        this.map = map;
        this.parentContainer = parentContainer;
        this.buildings = []; // Array of Building
    }
    
    setMap(map) {
        this.map = map;
    }

    isCellOccupied(sectorId, u, v) {
        // Floor coords to integer indices
        const iu = Math.floor(u);
        const iv = Math.floor(v);
        return this.buildings.some(b => b.sectorId === sectorId && b.u === iu && b.v === iv);
    }
    
    createBuilding(sectorId, u, v, name, blueprintId = 'prism_rig') {
        const iu = Math.floor(u);
        const iv = Math.floor(v);

        if (!this.map) {
            console.warn('Cannot create building before a map exists');
            return null;
        }

        const sector = this.map.sectors.find(s => s.id === sectorId);
        if (!sector) {
            console.warn(`Unknown sector: ${sectorId}`);
            return null;
        }
        
        if (this.isCellOccupied(sectorId, iu, iv)) {
            console.warn('Cell occupied');
            return null;
        }
        
        const id = `b_${Date.now()}_${Math.floor(Math.random()*1000)}`;
        const building = new Building(id, sectorId, iu, iv, name, blueprintId);
        
        // Grid centers
        const pos = projectGridToWorld(iu + 0.5, iv + 0.5, sector.centerX, sector.centerY, sector.gridSize, TILE_WIDTH, TILE_HEIGHT);
        building.setPosition(pos.x, pos.y);
        
        this.buildings.push(building);
        this.parentContainer.addChild(building.container);
        
        return building;
    }
    
    /**
     * Close one tide: collect income from structures that were already working,
     * then advance every structure under construction by one phase.
     *
     * Income is collected before promotion so a structure that becomes ACTIVE
     * this tide starts contributing on the next one.
     */
    resolveTide() {
        let income = 0;
        let activeBefore = 0;
        const promoted = [];

        for (const building of this.buildings) {
            if (building.state === 'ACTIVE') {
                activeBefore += 1;
                income += BLUEPRINT_BY_ID[building.blueprintId]?.income || 0;
            }
        }

        for (const building of this.buildings) {
            const before = building.state;
            if (before === 'PENDING' || before === 'RESERVED') {
                const after = building.promote();
                promoted.push({ id: building.id, name: building.name, before, after });
            }
        }

        const activeAfter = this.buildings.filter((building) => building.state === 'ACTIVE').length;
        return { income, active: activeAfter, activeBefore, promoted };
    }

    /** Backwards-compatible alias for callers that only need phase changes. */
    processTurn() {
        this.resolveTide();
        return true;
    }

    /**
     * True when a world point falls inside an occupied grid cell. Used by NPCs
     * so they do not walk through the town.
     */
    isWorldBlocked(x, y) {
        if (!this.map || this.buildings.length === 0) return false;
        for (const sector of this.map.sectors) {
            if (!sector.containsPoint(x, y)) continue;
            const cell = sector.getGridCell(x, y);
            if (cell.u < 0 || cell.v < 0 || cell.u >= sector.gridSize || cell.v >= sector.gridSize) continue;
            if (this.isCellOccupied(sector.id, cell.u, cell.v)) return true;
        }
        return false;
    }

    update(dt) {
        // Per-frame updates for buildings (e.g. pulsing placeholders)
        this.buildings.forEach(b => {
            if (typeof b.update === 'function') {
                b.update(dt);
            }
        });
    }
    
    /**
     * Rebuild persisted structures from model data. Unknown sectors, cells and
     * blueprints are skipped rather than corrupting the map.
     */
    restore(entries = []) {
        if (!this.map || !Array.isArray(entries)) return 0;
        let restored = 0;
        for (const entry of entries) {
            if (!entry || !BLUEPRINT_BY_ID[entry.blueprintId]) continue;
            if (this.isCellOccupied(entry.sectorId, entry.u, entry.v)) continue;
            const building = this.createBuilding(
                entry.sectorId,
                entry.u,
                entry.v,
                entry.name || BLUEPRINT_BY_ID[entry.blueprintId].name,
                entry.blueprintId
            );
            if (!building) continue;
            while (building.state !== entry.state && building.state !== 'ACTIVE') {
                building.promote();
            }
            building.container.alpha = building.state === 'RESERVED' ? 0.72 : 1;
            restored += 1;
        }
        return restored;
    }

    clear() {
        this.buildings.forEach(b => b.destroy());
        this.buildings = [];
    }
}

