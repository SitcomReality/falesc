import * as PIXI from 'pixi.js';
import { TILE_WIDTH, TILE_HEIGHT } from '../constants.js';

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
        // Grid diagonal width = gridSize * TILE_WIDTH
        // We want radius to be comfortably larger than half the grid diagonal
        const gridHalfWidth = (gridSize * TILE_WIDTH) / 2;
        const baseRadius = gridHalfWidth * 1.8; // 1.8x to ensure grid fits with ground around it
        this.radius = baseRadius;
        
        this.connections = []; // Array of Sector IDs this connects to

        // Define Grid Polygon (Diamond) relative to center
        // Top, Right, Bottom, Left
        const gh = (gridSize * TILE_HEIGHT) / 2;
        const gw = (gridSize * TILE_WIDTH) / 2;
        
        this.gridPoly = [
            { x: 0, y: -gh },
            { x: gw, y: 0 },
            { x: 0, y: gh },
            { x: -gw, y: 0 }
        ];

        // Generate organic outline
        this.shape = this.generateShape(rng);

        // Graphics
        this.graphics = new PIXI.Graphics();
        this.draw();
    }

    generateShape(rng) {
        // Create a smoother, less spiky island outline.
        // Steps:
        //  - generate fewer base points with low-frequency wobble
        //  - clamp extreme radius deviations
        //  - apply 2 passes of Chaikin smoothing to remove sharp corners / deep concaves

        const basePoints = 20 + rng.nextInt(0, 8); // slightly fewer points for simpler shapes
        const points = [];
        const aspect = 0.65; // isometric squash

        // Parameters to control wobble: low frequency, low amplitude
        const wobbleFreq = 1.2;
        const wobbleAmpFactor = 0.08; // fraction of radius
        const minRadiusFactor = 0.8; // Increased from 0.7 to ensure coverage
        const maxRadiusFactor = 1.2;

        for (let i = 0; i < basePoints; i++) {
            const angle = (i / basePoints) * Math.PI * 2;
            // Base radius with small random variation
            let r = this.radius * (minRadiusFactor + rng.next() * (maxRadiusFactor - minRadiusFactor));
            // Low-frequency wobble
            const wobble = Math.sin(angle * wobbleFreq + rng.next() * Math.PI * 2) * this.radius * wobbleAmpFactor;
            r += wobble;

            // Clamp to prevent very deep concave or extreme spike
            const minR = this.radius * 0.7;
            const maxR = this.radius * 1.3;
            r = Math.max(minR, Math.min(maxR, r));

            points.push({ x: this.centerX + Math.cos(angle) * r, y: this.centerY + Math.sin(angle) * r * aspect });
        }

        // Chaikin smoothing function (subdivision) - preserves overall silhouette while softening corners
        const chaikin = (pts, iterations = 1) => {
            for (let iter = 0; iter < iterations; iter++) {
                const newPts = [];
                const n = pts.length;
                for (let i = 0; i < n; i++) {
                    const p0 = pts[i];
                    const p1 = pts[(i + 1) % n];
                    // Q = 0.75*P0 + 0.25*P1, R = 0.25*P0 + 0.75*P1 (keeps shape tighter than equal split)
                    const qx = p0.x * 0.75 + p1.x * 0.25;
                    const qy = p0.y * 0.75 + p1.y * 0.25;
                    const rx = p0.x * 0.25 + p1.x * 0.75;
                    const ry = p0.y * 0.25 + p1.y * 0.75;
                    newPts.push({ x: qx, y: qy });
                    newPts.push({ x: rx, y: ry });
                }
                pts = newPts;
            }
            return pts;
        };

        // Apply two light smoothing passes
        let smooth = chaikin(points, 2);

        // Optionally reduce residual tiny spikes by clamping local curvature:
        // For each point, if it lies far outside the local average, pull it inward.
        const clampFactor = 0.18; // how strongly to clamp outliers (0=no clamp, 1=full clamp to avg)
        for (let i = 0; i < smooth.length; i++) {
            const prev = smooth[(i - 1 + smooth.length) % smooth.length];
            const next = smooth[(i + 1) % smooth.length];
            const avgX = (prev.x + next.x) / 2;
            const avgY = (prev.y + next.y) / 2;
            // Move the point slightly toward the local average to soften sharp protrusions
            smooth[i].x = smooth[i].x * (1 - clampFactor) + avgX * clampFactor;
            smooth[i].y = smooth[i].y * (1 - clampFactor) + avgY * clampFactor;
        }

        return smooth;
    }

    draw() {
        this.graphics.clear();
        
        const depth = 35; // Height of the cliff/side
        const topColor = 0xE8DCC0; // Sand/Light Dirt
        const sideColor = 0x655540; // Dark Rock/Earth
        const strokeColor = 0x9B8B6F;

        if (this.shape.length === 0) return;

        // 1. Draw the "Sides" (Underground Projection)
        this.graphics.beginFill(sideColor);
        
        // Draw the bottom lid (offset by depth)
        this.graphics.moveTo(this.shape[0].x, this.shape[0].y + depth);
        for (let i = 1; i < this.shape.length; i++) {
            this.graphics.lineTo(this.shape[i].x, this.shape[i].y + depth);
        }
        this.graphics.closePath();
        
        // Draw the walls connecting Top to Bottom
        for (let i = 0; i < this.shape.length; i++) {
            const curr = this.shape[i];
            const next = this.shape[(i + 1) % this.shape.length];
            
            this.graphics.moveTo(curr.x, curr.y);
            this.graphics.lineTo(next.x, next.y);
            this.graphics.lineTo(next.x, next.y + depth);
            this.graphics.lineTo(curr.x, curr.y + depth);
        }
        this.graphics.endFill();

        // 2. Draw Top Surface
        this.graphics.beginFill(topColor);
        this.graphics.lineStyle(3, strokeColor, 1, 0.5);

        this.graphics.moveTo(this.shape[0].x, this.shape[0].y);
        for (let i = 1; i < this.shape.length; i++) {
             this.graphics.lineTo(this.shape[i].x, this.shape[i].y);
        }

        this.graphics.closePath();
        this.graphics.endFill();

        // 3. Draw Grid (Subtle Overlay)
        this.drawGrid();
    }

    drawGrid() {
        // Grid properties
        const N = this.gridSize;
        const lineColor = 0xFFFFFF;
        const alpha = 0.15;

        this.graphics.lineStyle(2, lineColor, alpha);

        // We need to draw grid lines.
        // Transform from grid coords (u,v) [0..N] to screen coords.
        // Center of grid is at (N/2, N/2) which aligns with (this.centerX, this.centerY)
        
        const project = (u, v) => {
            // Center the grid coordinates
            const cu = u - N / 2;
            const cv = v - N / 2;
            // Isometric projection
            // x = (u - v) * halfWidth
            // y = (u + v) * halfHeight
            const x = (cu - cv) * (TILE_WIDTH / 2);
            const y = (cu + cv) * (TILE_HEIGHT / 2);
            return { x: this.centerX + x, y: this.centerY + y };
        };

        // Draw rows
        for (let v = 0; v <= N; v++) {
            const start = project(0, v);
            const end = project(N, v);
            this.graphics.moveTo(start.x, start.y);
            this.graphics.lineTo(end.x, end.y);
        }

        // Draw cols
        for (let u = 0; u <= N; u++) {
            const start = project(u, 0);
            const end = project(u, N);
            this.graphics.moveTo(start.x, start.y);
            this.graphics.lineTo(end.x, end.y);
        }
    }

    isPointInGrid(x, y) {
        // Transform world x,y back to grid u,v
        // Reverse iso: 
        // dx = x - cx, dy = y - cy
        // u = (dx / halfW + dy / halfH) / 2 + N/2
        // v = (dy / halfH - dx / halfW) / 2 + N/2
        // Simplification:
        // dy / halfH = (cu + cv)
        // dx / halfW = (cu - cv)
        // sum = 2cu => cu = sum/2
        // sub = 2cv => cv = sub/2
        
        const dx = x - this.centerX;
        const dy = y - this.centerY;
        const hw = TILE_WIDTH / 2;
        const hh = TILE_HEIGHT / 2;

        const cu = (dx / hw + dy / hh) / 2;
        const cv = (dy / hh - dx / hw) / 2;

        const u = cu + this.gridSize / 2;
        const v = cv + this.gridSize / 2;

        // Add a small buffer so minerals don't hug the line exactly
        const buffer = 0.1; 
        return (u >= -buffer && u <= this.gridSize + buffer && 
                v >= -buffer && v <= this.gridSize + buffer);
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
        
        // Fallback: Just return a point near the edge of the island
        // Pick a random angle and a radius near the edge
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
        // Get a random point inside the sector
        // Simple rejection sampling
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