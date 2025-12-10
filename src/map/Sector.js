import * as PIXI from 'pixi.js';

/**
 * A Sector represents one island region on the map.
 * It has an irregular, organic shape and can contain buildings/minerals.
 */
export class Sector {
    constructor(id, centerX, centerY, radius, rng, gridSize = 2) {
        this.id = id;
        this.centerX = centerX;
        this.centerY = centerY;
        this.radius = radius;
        this.gridSize = gridSize;
        this.connections = []; // Array of Sector IDs this connects to
        
        // Grid Visual Settings
        this.tileSize = 60; // Visual size of one grid tile side
        this.gridAspect = 0.6; // Isometric squash factor for the grid (approx matching island aspect)

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
        const minRadiusFactor = 0.7;
        const maxRadiusFactor = 1.15;

        for (let i = 0; i < basePoints; i++) {
            const angle = (i / basePoints) * Math.PI * 2;
            // Base radius with small random variation
            let r = this.radius * (minRadiusFactor + rng.next() * (maxRadiusFactor - minRadiusFactor));
            // Low-frequency wobble
            const wobble = Math.sin(angle * wobbleFreq + rng.next() * Math.PI * 2) * this.radius * wobbleAmpFactor;
            r += wobble;

            // Clamp to prevent very deep concave or extreme spike
            const minR = this.radius * 0.65;
            const maxR = this.radius * 1.25;
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
        
        this.drawGrid();
    }

    drawGrid() {
        const g = this.graphics;
        const n = this.gridSize;
        const tw = this.tileSize;
        const th = this.tileSize * this.gridAspect;
        
        // Draw grid outline and inner lines
        g.lineStyle(2, 0xFFFFFF, 0.15); // Subtle white lines
        
        // Helper to project grid coordinates (u, v) to world (x, y)
        // Grid centered at (0,0), u and v range from -n/2 to n/2
        const project = (u, v) => {
            // Isometric projection: x = (u - v), y = (u + v)
            return {
                x: (u - v) * (tw / 2) + this.centerX,
                y: (u + v) * (th / 2) + this.centerY
            };
        };

        const start = -n / 2;
        const end = n / 2;

        // Draw Lines along U axis
        for (let i = 0; i <= n; i++) {
            const u = start + i;
            const p1 = project(u, start);
            const p2 = project(u, end);
            g.moveTo(p1.x, p1.y);
            g.lineTo(p2.x, p2.y);
        }

        // Draw Lines along V axis
        for (let i = 0; i <= n; i++) {
            const v = start + i;
            const p1 = project(start, v);
            const p2 = project(end, v);
            g.moveTo(p1.x, p1.y);
            g.lineTo(p2.x, p2.y);
        }
        
        g.lineStyle(0);
    }

    /**
     * Checks if a point falls within the diamond grid area.
     */
    isPointInGrid(x, y) {
        const tw = this.tileSize;
        const th = this.tileSize * this.gridAspect;
        
        // Inverse Projection
        const dx = x - this.centerX;
        const dy = y - this.centerY;
        
        // Solving:
        // x = (u - v) * tw/2
        // y = (u + v) * th/2
        // u = y/th + x/tw
        // v = y/th - x/tw
        
        const u = dy / th + dx / tw;
        const v = dy / th - dx / tw;
        
        const limit = this.gridSize / 2;
        // Add small buffer to avoid placing things exactly on the line
        const buffer = 0.1;
        
        return (u > -limit - buffer && u < limit + buffer &&
                v > -limit - buffer && v < limit + buffer);
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

    getRandomPointOutsideGrid(rng) {
        // Get a random point on the island but NOT in the grid
        const bounds = this.getBounds();
        let attempts = 0;

        while (attempts < 100) {
            const x = rng.nextRange(bounds.minX, bounds.maxX);
            const y = rng.nextRange(bounds.minY, bounds.maxY);

            if (this.containsPoint(x, y) && !this.isPointInGrid(x, y)) {
                return { x, y };
            }
            attempts++;
        }
        
        // Fallback: pick a point far from center if search fails
        const angle = rng.next() * Math.PI * 2;
        return { 
            x: this.centerX + Math.cos(angle) * this.radius * 0.8, 
            y: this.centerY + Math.sin(angle) * this.radius * 0.8 
        };
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