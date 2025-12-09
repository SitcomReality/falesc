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
        const sizeConfigs = {
            small: { sectorCount: 5, minRadius: 120, maxRadius: 180 },
            medium: { sectorCount: 7, minRadius: 100, maxRadius: 160 },
            large: { sectorCount: 10, minRadius: 80, maxRadius: 140 }
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
        const padding = 150;

        // Place first sector near center
        const firstSector = new Sector(
            0,
            this.screenWidth / 2 + this.rng.nextRange(-100, 100),
            this.screenHeight / 2 + this.rng.nextRange(-100, 100),
            this.rng.nextRange(minRadius, maxRadius),
            this.rng
        );
        this.sectors.push(firstSector);

        // Place remaining sectors with minimum distance constraint
        const minDist = (minRadius + maxRadius) * 1.3;
        let attempts = 0;
        const maxAttempts = 1000;

        while (this.sectors.length < sectorCount && attempts < maxAttempts) {
            attempts++;

            const x = this.rng.nextRange(padding, this.screenWidth - padding);
            const y = this.rng.nextRange(padding, this.screenHeight - padding);

            // Check if far enough from existing sectors
            let valid = true;
            for (const sector of this.sectors) {
                const dist = Math.hypot(x - sector.centerX, y - sector.centerY);
                if (dist < minDist) {
                    valid = false;
                    break;
                }
            }

            if (valid) {
                const sector = new Sector(
                    this.sectors.length,
                    x,
                    y,
                    this.rng.nextRange(minRadius, maxRadius),
                    this.rng
                );
                this.sectors.push(sector);
            }
        }
    }

    createConnections() {
        // Create minimum spanning tree using Prim's algorithm
        if (this.sectors.length === 0) return;

        const connected = new Set([this.sectors[0].id]);
        const unconnected = new Set(this.sectors.slice(1).map(s => s.id));

        while (unconnected.size > 0) {
            let bestDist = Infinity;
            let bestPair = null;

            // Find closest unconnected sector to any connected sector
            for (const connId of connected) {
                const connSector = this.sectors[connId];

                for (const unconId of unconnected) {
                    const unconSector = this.sectors[unconId];
                    const dist = Math.hypot(
                        connSector.centerX - unconSector.centerX,
                        connSector.centerY - unconSector.centerY
                    );

                    if (dist < bestDist) {
                        bestDist = dist;
                        bestPair = [connId, unconId];
                    }
                }
            }

            if (bestPair) {
                // Create bridge
                this.connectSectors(bestPair[0], bestPair[1]);
                connected.add(bestPair[1]);
                unconnected.delete(bestPair[1]);
            } else {
                break;
            }
        }
    }

    addExtraConnections() {
        // Add a few extra bridges for redundancy (creates loops)
        const extraCount = Math.floor(this.sectors.length * 0.3);

        for (let i = 0; i < extraCount; i++) {
            const sectorA = this.sectors[this.rng.nextInt(0, this.sectors.length - 1)];

            // Find a nearby sector not already connected
            const candidates = this.sectors.filter(s =>
                s.id !== sectorA.id && !sectorA.connections.includes(s.id)
            );

            if (candidates.length > 0) {
                // Sort by distance
                candidates.sort((a, b) => {
                    const distA = Math.hypot(a.centerX - sectorA.centerX, a.centerY - sectorA.centerY);
                    const distB = Math.hypot(b.centerX - sectorA.centerX, b.centerY - sectorA.centerY);
                    return distA - distB;
                });

                // Pick one of the 3 closest
                const pickFrom = candidates.slice(0, Math.min(3, candidates.length));
                const sectorB = pickFrom[this.rng.nextInt(0, pickFrom.length - 1)];

                this.connectSectors(sectorA.id, sectorB.id);
            }
        }
    }

    connectSectors(idA, idB) {
        const sectorA = this.sectors[idA];
        const sectorB = this.sectors[idB];

        if (!sectorA.connections.includes(idB)) {
            sectorA.connections.push(idB);
            sectorB.connections.push(idA);

            const bridge = new Bridge(sectorA, sectorB);
            this.bridges.push(bridge);
        }
    }

    isPointOnMap(x, y) {
        // Check if point is inside any sector
        return this.sectors.some(sector => sector.containsPoint(x, y));
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