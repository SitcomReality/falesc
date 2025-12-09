import * as PIXI from 'pixi.js';

/**
 * A Sector represents one island region on the map.
 * It has an irregular, organic shape and can contain buildings/minerals.
 */
export class Sector {
    constructor(id, centerX, centerY, radius, rng) {
        this.id = id;
        this.centerX = centerX;
        this.centerY = centerY;
        this.radius = radius;
        this.connections = []; // Array of Sector IDs this connects to

        // Generate organic outline
        this.shape = this.generateShape(rng);

        // Graphics
        this.graphics = new PIXI.Graphics();
        this.draw();
    }

    generateShape(rng) {
        // Create a wobbly shape with higher point density for smoother linear segments
        // (better for 3D extrusion look without complex curve tessellation)
        const numPoints = 40 + rng.nextInt(0, 20);
        const points = [];
        
        // Isometric aspect ratio (squash vertical to look like we're viewing from an angle)
        const aspect = 0.65;

        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            // Vary radius with multiple octaves of noise-like variation
            const baseRadius = this.radius * (0.7 + rng.next() * 0.6);
            const wobble = Math.sin(angle * 3 + rng.next() * Math.PI) * this.radius * 0.2;
            const r = baseRadius + wobble;

            points.push({
                x: this.centerX + Math.cos(angle) * r,
                y: this.centerY + Math.sin(angle) * r * aspect
            });
        }

        return points;
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