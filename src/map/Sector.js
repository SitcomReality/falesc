import * as PIXI from 'pixi.js';
import { TILE_WIDTH, TILE_HEIGHT } from './TileMetrics.js';
import { generateShape } from './ShapeGenerator.js';
import { drawSectorGraphics } from './sector/SectorGraphics.js';
import { projectGridToWorld, isPointInIsoGrid, worldToGrid } from './IsometricProjection.js';

/**
 * A Sector represents one island region on the map.
 * It has an irregular, organic shape and can contain buildings/minerals.
 */
export class Sector {
    constructor(id, centerX, centerY, gridSize, rng, prebuiltShape = null) {
        this.id = id;
        this.centerX = centerX;
        this.centerY = centerY;
        this.gridSize = gridSize;
        this.rng = rng;

        // Calculate size based on grid
        const gridHalfWidth = (gridSize * TILE_WIDTH) / 2;
        const baseRadius = gridHalfWidth * 1.8; // ensure grid fits with ground around it
        this.radius = baseRadius;
        
        this.connections = []; // Array of Sector IDs this connects to

        // Generate the organic outline once. When the generator supplies a
        // local silhouette, translate it rather than consuming more RNG and
        // regenerating a different island.
        if (prebuiltShape) {
            this.shape = prebuiltShape.map((point) => ({
                x: point.x + this.centerX,
                y: point.y + this.centerY
            }));
        } else {
            this.shape = generateShape(this.centerX, this.centerY, this.radius, this.rng);
        }

        // Graphics
        this.graphics = new PIXI.Graphics();
        drawSectorGraphics(this.graphics, this.shape, this.centerX, this.centerY, this.gridSize, TILE_WIDTH, TILE_HEIGHT);

        // Keep lightweight helpers bound for reuse
        this._project = (u, v) => projectGridToWorld(u, v, this.centerX, this.centerY, this.gridSize, TILE_WIDTH, TILE_HEIGHT);
    }

    // Delegates to IsometricProjection for point-in-grid checks
    isPointInGrid(x, y) {
        return isPointInIsoGrid(x, y, this.centerX, this.centerY, this.gridSize, TILE_WIDTH, TILE_HEIGHT);
    }

    getGridCell(x, y) {
        return worldToGrid(x, y, this.centerX, this.centerY, this.gridSize, TILE_WIDTH, TILE_HEIGHT);
    }

    getRandomPointOutsideGrid(rng) {
        // Try to find a point on the island that is NOT in the grid
        let attempts = 0;
        const maxAttempts = 50;
        
        while (attempts < maxAttempts) {
            const pt = this.getRandomPoint(rng);
            if (!this.isPointInGrid(pt.x, pt.y)) {
                return pt;
            }
            attempts++;
        }
        
        // Fallback: point near the edge of the island (preserve isometric aspect)
        const angle = rng.next() * Math.PI * 2;
        const r = this.radius * 0.9;
        return {
            x: this.centerX + Math.cos(angle) * r,
            y: this.centerY + Math.sin(angle) * r * 0.65 // aspect
        };
    }

    containsPoint(x, y) {
        // Simple point-in-polygon check using ray casting
        let inside = false;
        const points = this.shape;

        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const xi = points[i].x, yi = points[i].y;
            const xj = points[j].x, yj = points[j].y;

            const intersect = ((yi > y) !== (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }

        return inside;
    }

    getRandomPoint(rng) {
        // Get a random point inside the sector (rejection sampling)
        const bounds = this.getBounds();
        let attempts = 0;

        while (attempts < 200) {
            const x = rng.nextRange(bounds.minX, bounds.maxX);
            const y = rng.nextRange(bounds.minY, bounds.maxY);

            if (this.containsPoint(x, y)) {
                return { x, y };
            }
            attempts++;
        }

        // Fallback to center
        return { x: this.centerX, y: this.centerY };
    }

    getBounds() {
        const xs = this.shape.map(p => p.x);
        const ys = this.shape.map(p => p.y);

        return {
            minX: Math.min(...xs),
            maxX: Math.max(...xs),
            minY: Math.min(...ys),
            maxY: Math.max(...ys)
        };
    }

    destroy() {
        this.graphics.destroy();
    }
}