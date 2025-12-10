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

        // Map config: islands defined by grid sizes
        // Small: 4 islands (2x2)
        // Medium: 6 islands (4x 2x2, 2x 3x3)
        // Large: 7 islands (4x 2x2, 2x 3x3, 1x 4x4)
        
        const gridConfigs = {
            small: [2, 2, 2, 2],
            medium: [3, 3, 2, 2, 2, 2],
            large: [4, 3, 3, 2, 2, 2, 2]
        };

        this.gridSizes = gridConfigs[mapSize] || gridConfigs.medium;
        
        // Sort larger grids first for better packing (center heavy)
        this.gridSizes.sort((a, b) => b - a);

        this.generate();
    }

    generate() {
        this.generateSectorsPacked();
    }

    generateSectorsPacked() {
        // Place sectors in a spiral expanding from center
        // We calculate positions relative to (0,0) then center the whole cluster
        
        const tempSectors = [];
        
        // Config
        const minSpacing = 40; // Pixels between island edges
        
        for (let i = 0; i < this.gridSizes.length; i++) {
            const size = this.gridSizes[i];
            
            // Create a temporary sector just to get its radius for collision
            // We'll update x,y later
            const tempSector = new Sector(i, 0, 0, size, this.rng);
            const radius = tempSector.radius;
            
            let placed = false;
            let angle = 0;
            let dist = 0;
            const stepAngle = 0.5; // radians
            const stepDist = 5; // pixels per step outwards
            
            // Limit iterations
            let attempts = 0;
            while (!placed && attempts < 2000) {
                // Archimedean spiral: r = a + b * theta
                // We just increase dist manually to keep it simple / evenly spaced search
                
                const x = Math.cos(angle) * dist;
                const y = Math.sin(angle) * dist * 0.7; // Squash Y slightly for isometric-ish layout feel
                
                // Check collision
                let overlap = false;
                for (const existing of tempSectors) {
                    const dx = x - existing.x;
                    const dy = y - existing.y;
                    const d = Math.hypot(dx, dy);
                    
                    // Simple circle collision
                    // Distance must be > r1 + r2 + spacing
                    if (d < (radius + existing.radius + minSpacing)) {
                        overlap = true;
                        break;
                    }
                }
                
                if (!overlap) {
                    // Valid spot
                    tempSector.centerX = x;
                    tempSector.centerY = y;
                    // Need to regenerate graphics/shape at new pos? 
                    // No, Sector constructor already generated shape at 0,0? 
                    // Actually Sector constructor took x,y. 
                    // Let's just create a NEW sector at the valid spot to be clean
                    // because generateShape uses centerX/Y in the point calculation.
                    
                    const finalSector = new Sector(i, x, y, size, this.rng);
                    // Override the temp radius used for calc with exact one from new obj
                    finalSector.radius = radius; 
                    
                    tempSectors.push({ x, y, radius, sector: finalSector });
                    this.sectors.push(finalSector);
                    placed = true;
                }
                
                angle += stepAngle;
                dist += 10; // increase radius search
                attempts++;
            }
        }
        
        // Center the cluster on screen
        if (this.sectors.length > 0) {
            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;
            
            this.sectors.forEach(s => {
                minX = Math.min(minX, s.centerX - s.radius);
                maxX = Math.max(maxX, s.centerX + s.radius);
                minY = Math.min(minY, s.centerY - s.radius);
                maxY = Math.max(maxY, s.centerY + s.radius);
            });
            
            const clusterCenterX = (minX + maxX) / 2;
            const clusterCenterY = (minY + maxY) / 2;
            
            const screenCX = this.screenWidth / 2;
            const screenCY = this.screenHeight / 2;
            
            const offsetX = screenCX - clusterCenterX;
            const offsetY = screenCY - clusterCenterY;
            
            this.sectors.forEach(s => {
                s.centerX += offsetX;
                s.centerY += offsetY;
            });
            
            // Re-create proper sectors with final positions
            const finalPositions = this.sectors.map(s => ({ 
                x: s.centerX, 
                y: s.centerY, 
                size: s.gridSize 
            }));
            
            // Clear and rebuild
            this.sectors = [];
            finalPositions.forEach((pos, index) => {
                this.sectors.push(new Sector(index, pos.x, pos.y, pos.size, this.rng));
            });
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

    getRandomMineralPoint() {
        const sector = this.getRandomSector();
        return sector.getRandomPointOutsideGrid(this.rng);
    }

    destroy() {
        this.sectors.forEach(s => s.destroy());
    }
}