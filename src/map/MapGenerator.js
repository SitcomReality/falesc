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
        this.mapSize = mapSize;

        this.generate();
    }

    generate() {
        // Define islands based on map size
        // Grids: 2 means 2x2, 3 means 3x3, etc.
        const configs = {
            small: [2, 2, 2, 2],
            medium: [2, 2, 2, 2, 3, 3],
            large: [2, 2, 2, 2, 3, 3, 4]
        };

        const islandsToGenerate = configs[this.mapSize] || configs.medium;
        
        // Sort larger islands to the front so they are placed first (usually easier to pack)
        islandsToGenerate.sort((a, b) => b - a);

        this.generateSectorPositions(islandsToGenerate);
    }

    generateSectorPositions(gridSizes) {
        const padding = 200; // Edge padding

        // Try to place each requested island
        for (const gridSize of gridSizes) {
            // Calculate required radius for this grid size
            // Grid width is ~120 for size 2. Radius needs to cover it + margin.
            // Base radius approx: (gridSize * 35) + 60
            const baseRadius = (gridSize * 35) + 70;
            const radius = baseRadius * this.rng.nextRange(0.95, 1.1);

            let placed = false;
            let attempts = 0;
            // Higher attempts because packing is denser and harder
            const maxAttempts = 2000; 

            while (!placed && attempts < maxAttempts) {
                attempts++;
                
                // Bias slightly towards center for density
                // Use a gaussian-like distribution (sum of randoms) for better clustering
                let x, y;
                
                if (this.sectors.length === 0) {
                    // First sector dead center
                    x = this.screenWidth / 2;
                    y = this.screenHeight / 2;
                } else {
                    // Pick a random point
                    x = this.rng.nextRange(padding, this.screenWidth - padding);
                    y = this.rng.nextRange(padding, this.screenHeight - padding);
                    
                    // Or bias toward existing sector?
                    // For dense packing, picking a point near an existing sector is often better than random
                    if (this.rng.next() > 0.3) {
                        const target = this.sectors[this.rng.nextInt(0, this.sectors.length - 1)];
                        const angle = this.rng.nextRange(0, Math.PI * 2);
                        const dist = target.radius + radius + this.rng.nextRange(20, 100);
                        x = target.centerX + Math.cos(angle) * dist;
                        y = target.centerY + Math.sin(angle) * dist;
                    }
                }

                // Bounds check
                if (x < padding || x > this.screenWidth - padding || 
                    y < padding || y > this.screenHeight - padding) {
                    continue;
                }

                // Check collisions with existing sectors
                let valid = true;
                for (const sector of this.sectors) {
                    const dist = Math.hypot(x - sector.centerX, y - sector.centerY);
                    const minSeparation = (sector.radius + radius) * 1.05; // 1.05 = very tight packing
                    
                    if (dist < minSeparation) {
                        valid = false;
                        break;
                    }
                }

                if (valid) {
                    const sector = new Sector(
                        this.sectors.length,
                        x,
                        y,
                        radius,
                        this.rng,
                        gridSize
                    );
                    this.sectors.push(sector);
                    placed = true;
                }
            }
            
            if (!placed) {
                console.warn(`Could not place island of grid size ${gridSize} after ${maxAttempts} attempts.`);
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