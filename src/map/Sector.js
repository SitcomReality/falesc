import * as PIXI from 'pixi.js';
import { TILE_WIDTH, TILE_HEIGHT } from '../constants.js';
import { buildSectorShape } from './SectorShape.js';
import { drawSectorGraphic } from './SectorDraw.js';
import { projectGridPoint, gridContainsPoint } from './SectorGrid.js';

/**
 * A Sector represents one island region on the map.
 * It has an irregular, organic shape and can contain buildings/minerals.
 */
export class Sector {
    constructor(id, centerX, centerY, gridSize, rng) {
        this.id = id;
        this.centerX = centerX;
        this.centerY = centerY;
        this.gridSize = gridSize;
        this.rng = rng;

        // Calculate size based on grid
        const gridHalfWidth = (gridSize * TILE_WIDTH) / 2;
        const baseRadius = gridHalfWidth * 1.8;
        this.radius = baseRadius;

        this.connections = [];

        // Define Grid Polygon (Diamond) relative to center (kept for reference)
        const gh = (gridSize * TILE_HEIGHT) / 2;
        const gw = (gridSize * TILE_WIDTH) / 2;

        this.gridPoly = [
            { x: 0, y: -gh },
            { x: gw, y: 0 },
            { x: 0, y: gh },
            { x: -gw, y: 0 }
        ];

        // Generate organic outline (delegated to module)
        this.shape = buildSectorShape(this.centerX, this.centerY, this.radius, this.rng);

        // Graphics
        this.graphics = new PIXI.Graphics();
        drawSectorGraphic(this.graphics, this.shape, this.centerX, this.centerY, this.gridSize);

        // Expose helpers from grid module as instance methods
        this._projectGridPoint = (u, v) => projectGridPoint(u, v, this.gridSize, this.centerX, this.centerY);
        this.isPointInGrid = (x, y) => gridContainsPoint(x, y, this.gridSize, this.centerX, this.centerY);
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

        // Fallback: point near edge
        const angle = rng.next() * Math.PI * 2;
        const r = this.radius * 0.9;
        return {
            x: this.centerX + Math.cos(angle) * r,
            y: this.centerY + Math.sin(angle) * r * 0.65
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
        const bounds = this.getBounds();
        let attempts = 0;

        while (attempts < 100) {
            const x = rng.nextRange(bounds.minX, bounds.maxX);
            const y = rng.nextRange(bounds.minY, bounds.maxY);

            if (this.containsPoint(x, y)) {
                return { x, y };
            }
            attempts++;
        }

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