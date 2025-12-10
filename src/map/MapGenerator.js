import { Sector } from './Sector.js';
import { SeededRandom } from './SeededRandom.js';

/**
 * Generates the game map with irregular island sectors.
 */
export class MapGenerator {
    constructor(seed, mapSize, screenWidth, screenHeight) {
        this.rng = new SeededRandom(seed);
        this.sectors = [];
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;

        // Map size configuration
        const RADIUS_SCALE = 4.0; // Scale up sectors significantly as requested (approx 4x larger)

        const sizeConfigs = {
            small: { sectorCount: 5, minRadius: 120 * RADIUS_SCALE, maxRadius: 180 * RADIUS_SCALE },
            medium: { sectorCount: 7, minRadius: 100 * RADIUS_SCALE, maxRadius: 160 * RADIUS_SCALE },
            large: { sectorCount: 10, minRadius: 80 * RADIUS_SCALE, maxRadius: 140 * RADIUS_SCALE }
        };

        this.config = sizeConfigs[mapSize] || sizeConfigs.medium;

        this.generate();
    }

    generate() {
        // 1. Generate sector positions using Poisson-like distribution
        this.generateSectorPositions();
    }

    generateSectorPositions() {
        const { sectorCount, minRadius, maxRadius } = this.config;
        const padding = maxRadius * 0.8; // Use relative padding based on new radius

        // Place first sector near center
        const firstSector = new Sector(
            0,
            this.screenWidth / 2 + this.rng.nextRange(-100, 100) * 2.5,
            this.screenHeight / 2 + this.rng.nextRange(-100, 100) * 2.5,
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
    }
}