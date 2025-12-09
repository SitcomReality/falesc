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
        this.graphics.clear();
        
        // Draw bridge as a thick line
        this.graphics.lineStyle(8, 0x8B7355, 1);
        this.graphics.moveTo(this.pointA.x, this.pointA.y);
        this.graphics.lineTo(this.pointB.x, this.pointB.y);
        
        // Add darker outline
        this.graphics.lineStyle(12, 0x5D4E3C, 1);
        this.graphics.moveTo(this.pointA.x, this.pointA.y);
        this.graphics.lineTo(this.pointB.x, this.pointB.y);
        
        // Draw the main bridge on top
        this.graphics.lineStyle(8, 0x8B7355, 1);
        this.graphics.moveTo(this.pointA.x, this.pointA.y);
        this.graphics.lineTo(this.pointB.x, this.pointB.y);
    }

    destroy() {
        this.graphics.destroy();
    }
}