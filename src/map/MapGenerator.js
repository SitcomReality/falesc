import { Sector } from './Sector.js';
import { Bridge } from './Bridge.js';
import { SeededRandom } from './SeededRandom.js';

/**
 * Generates the game map with irregular island sectors connected by bridges.
 */
export class MapGenerator {
    constructor(seed, mapSize, screenWidth, screenHeight) {
        this.rng = new SeededRandom(seed);
        this.sectors = [];
        this.bridges = [];
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;

        // Map size configuration
        const RADIUS_SCALE = 4.0; // Scale up sectors significantly as requested (approx 4x larger)

        // Configs reflect 1 Central Hub + N Perimeter Islands
        const sizeConfigs = {
            small: { sectorCount: 5, minRadius: 120 * RADIUS_SCALE, maxRadius: 180 * RADIUS_SCALE }, // 1 Hub + 4 Perim
            medium: { sectorCount: 7, minRadius: 100 * RADIUS_SCALE, maxRadius: 160 * RADIUS_SCALE }, // 1 Hub + 6 Perim
            large: { sectorCount: 9, minRadius: 80 * RADIUS_SCALE, maxRadius: 140 * RADIUS_SCALE } // 1 Hub + 8 Perim
        };

        this.config = sizeConfigs[mapSize] || sizeConfigs.medium;

        this.generate();
    }

    generate() {
        // 1. Generate sector positions using Poisson-like distribution
        this.generateSectorPositions();

        // 2. Create minimum spanning tree for connectivity
        this.createConnections();

        // 3. Add extra connections for interesting loops
        this.addExtraConnections();
    }

    generateSectorPositions() {
        const { sectorCount, minRadius, maxRadius } = this.config;
        
        // Determine the number of perimeter sectors
        const perimeterCount = sectorCount - 1;
        
        // --- 1. Central Hub ---
        
        // Make the central island significantly larger (1.7x to 2.2x the max perimeter radius)
        const hubRadius = maxRadius * this.rng.nextRange(1.7, 2.2);
        
        const hub = new Sector(
            0,
            this.screenWidth / 2,
            this.screenHeight / 2,
            hubRadius,
            this.rng
        );
        this.sectors.push(hub);
        
        // --- 2. Perimeter Islands (Equidistant placement) ---
        
        const center = { x: this.screenWidth / 2, y: this.screenHeight / 2 };
        // Place islands on a circle around the center, sized relative to the smaller screen dimension
        const placementRadius = Math.min(this.screenWidth, this.screenHeight) * 0.4;
        
        for (let i = 0; i < perimeterCount; i++) {
            // Calculate angle for equidistant placement
            const angle = (i / perimeterCount) * Math.PI * 2 + this.rng.nextRange(-0.1, 0.1); // slight rotation offset
            
            const r = this.rng.nextRange(minRadius, maxRadius);
            
            // Apply isometric squash (0.65) to Y placement to match sector geometry
            const x = center.x + Math.cos(angle) * placementRadius;
            const y = center.y + Math.sin(angle) * placementRadius * 0.65;
            
            const sector = new Sector(
                this.sectors.length,
                x,
                y,
                r,
                this.rng
            );
            this.sectors.push(sector);
        }
    }

    createConnections() {
        // Enforce hub-and-spoke topology: Sector 0 (Hub) connects to all others.
        if (this.sectors.length < 2) return;

        const hubId = 0;
        
        // Sectors 1 through N are perimeter islands.
        for (let i = 1; i < this.sectors.length; i++) {
            this.connectSectors(hubId, i);
        }
    }

    addExtraConnections() {
        // No extra connections needed for the defined hub-and-spoke topology.
    }

    connectSectors(idA, idB) {
        const sectorA = this.sectors[idA];
        const sectorB = this.sectors[idB];

        // Before connecting, ensure the straight bridge line doesn't pass over any other sector.
        // Sample points along the proposed bridge line and test for containment in other sectors.
        const wouldIntersectOther = (a, b) => {
            const samples = 30; // resolution of the test
            const dx = (b.centerX - a.centerX) / (samples - 1);
            const dy = (b.centerY - a.centerY) / (samples - 1);

            for (let i = 1; i < samples - 1; i++) { // skip exact endpoints (they're on A/B)
                const sx = a.centerX + dx * i;
                const sy = a.centerY + dy * i;
                for (const s of this.sectors) {
                    if (s.id === a.id || s.id === b.id) continue;
                    if (s.containsPoint(sx, sy)) return true;
                }
            }
            return false;
        };

        // If the bridge would cross any other sector, do not create it.
        if (wouldIntersectOther(sectorA, sectorB)) {
            return;
        }

        if (!sectorA.connections.includes(idB)) {
            sectorA.connections.push(idB);
            sectorB.connections.push(idA);

            const bridge = new Bridge(sectorA, sectorB);
            this.bridges.push(bridge);
        }
    }

    isPointOnMap(x, y) {
        // Check if point is inside any sector
        if (this.sectors.some(sector => sector.containsPoint(x, y))) {
            return true;
        }
        // Check if point is on any bridge
        if (this.bridges.some(bridge => bridge.containsPoint(x, y))) {
            return true;
        }
        return false;
    }

    getRandomSector() {
        return this.sectors[this.rng.nextInt(0, this.sectors.length - 1)];
    }

    getRandomPointOnMap() {
        const sector = this.getRandomSector();
        return sector.getRandomPoint(this.rng);
    }

    destroy() {
        this.sectors.forEach(s => s.destroy());
        this.bridges.forEach(b => b.destroy());
    }
}