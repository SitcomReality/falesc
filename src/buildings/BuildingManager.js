import { Building } from './Building.js';
import { projectGridToWorld } from '../map/GridUtils.js';
import { TILE_WIDTH, TILE_HEIGHT } from '../constants.js';

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
    
    createBuilding(sectorId, u, v, name) {
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
        const building = new Building(id, sectorId, iu, iv, name);
        
        // Grid centers
        const pos = projectGridToWorld(iu + 0.5, iv + 0.5, sector.centerX, sector.centerY, sector.gridSize, TILE_WIDTH, TILE_HEIGHT);
        building.setPosition(pos.x, pos.y);
        
        this.buildings.push(building);
        this.parentContainer.addChild(building.container);
        
        return building;
    }
    
    processTurn() {
        let changed = false;
        this.buildings.forEach(b => {
            // Advance one step per interstitial:
            // PENDING -> RESERVED (ghost) -> ACTIVE (solid)
            if (b.state === 'PENDING') {
                b.promote();
                changed = true;
            } else if (b.state === 'RESERVED') {
                b.promote();
                changed = true;
            }
        });
        return changed;
    }

    update(dt) {
        // Per-frame updates for buildings (e.g. pulsing placeholders)
        this.buildings.forEach(b => {
            if (typeof b.update === 'function') {
                b.update(dt);
            }
        });
    }
    
    clear() {
        this.buildings.forEach(b => b.destroy());
        this.buildings = [];
    }
}

