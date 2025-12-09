import * as PIXI from 'pixi.js';

/**
 * A Bridge connects two Sectors, allowing movement between them.
 */
export class Bridge {
    constructor(sectorA, sectorB) {
        this.sectorA = sectorA;
        this.sectorB = sectorB;
        
        // Calculate connection points (closest points on each sector's edge)
        this.pointA = this.findClosestEdgePoint(sectorA, sectorB.centerX, sectorB.centerY);
        this.pointB = this.findClosestEdgePoint(sectorB, sectorA.centerX, sectorA.centerY);
        
        this.graphics = new PIXI.Graphics();
        this.draw();
    }

    findClosestEdgePoint(sector, targetX, targetY) {
        // Find the point on the sector's perimeter closest to the target
        let minDist = Infinity;
        let closest = { x: sector.centerX, y: sector.centerY };
        
        for (const point of sector.shape) {
            const dist = Math.hypot(point.x - targetX, point.y - targetY);
            if (dist < minDist) {
                minDist = dist;
                closest = point;
            }
        }
        
        return closest;
    }

    draw() {
        const g = this.graphics;
        g.clear();

        const palette = {
            light: 0xE0E0E0,  // Highlight / Top
            base: 0x90A4AE,   // Light Side
            dark: 0x546E7A,   // Dark Side / Shadow
            floor: 0x78909C   // Floor Surface
        };

        const dx = this.pointB.x - this.pointA.x;
        const dy = this.pointB.y - this.pointA.y;
        const angle = Math.atan2(dy, dx);
        
        // Perspective: Horizontal bridges are thinner
        const absSin = Math.abs(Math.sin(angle));
        const widthFactor = 0.5 + 0.5 * absSin;
        const width = 45 * widthFactor; 

        // Calculate perp vector for width
        const perp = angle + Math.PI / 2;
        const px = Math.cos(perp) * width / 2;
        const py = Math.sin(perp) * width / 2;

        // --- 1. FLOOR ---
        const floorDepth = 8;
        
        const corners = [
            { x: this.pointA.x - px, y: this.pointA.y - py }, // A-Left
            { x: this.pointB.x - px, y: this.pointB.y - py }, // B-Left
            { x: this.pointB.x + px, y: this.pointB.y + py }, // B-Right
            { x: this.pointA.x + px, y: this.pointA.y + py }  // A-Right
        ];

        // Floor Sides (Darker)
        g.beginFill(palette.dark);
        g.moveTo(corners[3].x, corners[3].y);
        g.lineTo(corners[2].x, corners[2].y);
        g.lineTo(corners[2].x, corners[2].y + floorDepth);
        g.lineTo(corners[3].x, corners[3].y + floorDepth);
        g.endFill();

        // Floor Top
        g.beginFill(palette.floor);
        g.moveTo(corners[0].x, corners[0].y);
        g.lineTo(corners[1].x, corners[1].y);
        g.lineTo(corners[2].x, corners[2].y);
        g.lineTo(corners[3].x, corners[3].y);
        g.endFill();

        // --- 2. GATES ---
        // Sort gates by Y position to handle occlusion properly (painter's algo)
        const gateA = { x: this.pointA.x, y: this.pointA.y, angle: perp };
        const gateB = { x: this.pointB.x, y: this.pointB.y, angle: perp };
        const gates = [gateA, gateB].sort((a, b) => a.y - b.y);

        gates.forEach(gate => {
            this.drawGate(g, gate.x, gate.y, gate.angle, width, palette);
        });
    }

    drawGate(g, x, y, angle, totalWidth, palette) {
        // Gate consists of two pillars and a top bar.
        const pillarW = 12;
        const pillarH = 50; 
        
        // Positions for pillars (centered on the width line)
        const lx = x + Math.cos(angle) * (totalWidth/2);
        const ly = y + Math.sin(angle) * (totalWidth/2);
        
        const rx = x - Math.cos(angle) * (totalWidth/2);
        const ry = y - Math.sin(angle) * (totalWidth/2);

        const pillars = [
            { x: lx, y: ly },
            { x: rx, y: ry }
        ].sort((a, b) => a.y - b.y);

        // Draw Pillars
        pillars.forEach(p => {
            this.drawPillar(g, p.x, p.y, pillarW, pillarH, palette);
        });

        // Draw Lintel connecting the tops
        const topLx = lx;
        const topLy = ly - pillarH;
        const topRx = rx;
        const topRy = ry - pillarH;
        
        this.drawLintel(g, topLx, topLy, topRx, topRy, 10, palette);
    }

    drawPillar(g, x, y, w, h, p) {
        // Crystal-like pillar
        const hw = w / 2;
        
        // Dynamic "seam" based on x position to fake rotation/variety
        const seam = Math.sin(x * 0.05) * (w * 0.2);
        
        const topY = y - h;
        const shoulderY = topY + 6; // Cap height
        
        // Bottom Y
        const botY = y;
        const botShoulderY = y - 4; // slight angled base
        
        // Dark Side (Right)
        g.beginFill(p.dark);
        g.moveTo(x + seam, botShoulderY);
        g.lineTo(x + hw, botY);
        g.lineTo(x + hw, shoulderY);
        g.lineTo(x + seam, topY);
        g.endFill();
        
        // Light Side (Left)
        g.beginFill(p.base);
        g.moveTo(x - hw, botY);
        g.lineTo(x + seam, botShoulderY);
        g.lineTo(x + seam, topY);
        g.lineTo(x - hw, shoulderY);
        g.endFill();
        
        // Top Cap (Diamond/Crystal shape)
        g.beginFill(p.light);
        g.moveTo(x - hw, shoulderY);
        g.lineTo(x + seam, topY); // Apex
        g.lineTo(x + hw, shoulderY);
        g.lineTo(x, shoulderY + 4); // Center dip
        g.endFill();
        
        // Highlight Edge
        g.lineStyle(1, 0xFFFFFF, 0.4);
        g.moveTo(x + seam, topY);
        g.lineTo(x + seam, botShoulderY);
        g.lineStyle(0);
    }

    drawLintel(g, x1, y1, x2, y2, thickness, p) {
        const barHeight = thickness;
        const barDepth = 8;
        
        const dx = x2 - x1;
        const dy = y2 - y1;
        const angle = Math.atan2(dy, dx);
        const perp = angle + Math.PI/2;
        
        const offX = Math.cos(perp) * barDepth/2;
        const offY = Math.sin(perp) * barDepth/2;
        
        const corners = [
            { x: x1 + offX, y: y1 + offY },
            { x: x2 + offX, y: y2 + offY },
            { x: x2 - offX, y: y2 - offY },
            { x: x1 - offX, y: y1 - offY }
        ];
        
        // Draw Top Face
        g.beginFill(p.light);
        g.moveTo(corners[0].x, corners[0].y);
        g.lineTo(corners[1].x, corners[1].y);
        g.lineTo(corners[2].x, corners[2].y);
        g.lineTo(corners[3].x, corners[3].y);
        g.endFill();
        
        // Draw Side Face (Down)
        g.beginFill(p.dark);
        g.moveTo(corners[2].x, corners[2].y);
        g.lineTo(corners[1].x, corners[1].y);
        g.lineTo(corners[1].x, corners[1].y + barHeight);
        g.lineTo(corners[2].x, corners[2].y + barHeight);
        g.endFill();
        
        // Cap Side
        g.beginFill(p.base);
        g.moveTo(corners[3].x, corners[3].y);
        g.lineTo(corners[2].x, corners[2].y);
        g.lineTo(corners[2].x, corners[2].y + barHeight);
        g.lineTo(corners[3].x, corners[3].y + barHeight);
        g.endFill();
    }

    destroy() {
        this.graphics.destroy();
    }
}