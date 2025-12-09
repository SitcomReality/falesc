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
        // Create a wobbly circular shape using multiple points
        const numPoints = 16 + rng.nextInt(0, 8);
        const points = [];

        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            // Vary radius with multiple octaves of noise-like variation
            const baseRadius = this.radius * (0.7 + rng.next() * 0.6);
            const wobble = Math.sin(angle * 3 + rng.next() * Math.PI) * this.radius * 0.2;
            const r = baseRadius + wobble;

            points.push({
                x: this.centerX + Math.cos(angle) * r,
                y: this.centerY + Math.sin(angle) * r
            });
        }

        return points;
    }

    draw() {
        this.graphics.clear();

        // Fill
        this.graphics.beginFill(0xE8DCC0, 1);
        this.graphics.lineStyle(3, 0x9B8B6F, 1, 0.5);

        if (this.shape.length > 0) {
            this.graphics.moveTo(this.shape[0].x, this.shape[0].y);

            // Draw smooth curves through points
            for (let i = 0; i < this.shape.length; i++) {
                const current = this.shape[i];
                const next = this.shape[(i + 1) % this.shape.length];
                const nextNext = this.shape[(i + 2) % this.shape.length];

                // Control point for smooth curve
                const cpX = next.x;
                const cpY = next.y;

                this.graphics.quadraticCurveTo(cpX, cpY, (next.x + nextNext.x) / 2, (next.y + nextNext.y) / 2);
            }

            this.graphics.closePath();
        }

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