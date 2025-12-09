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
        
        // Compute angle and width scaling so horizontal bridges are thinner.
        const dx = this.pointB.x - this.pointA.x;
        const dy = this.pointB.y - this.pointA.y;
        const angle = Math.atan2(dy, dx);
        // abs(sin(angle)) -> 0 at horizontal (0, PI), 1 at vertical (PI/2, 3PI/2)
        const absSin = Math.abs(Math.sin(angle));
        // widthFactor ranges from 0.5 (horizontal) to 1.0 (vertical)
        const widthFactor = 0.5 + 0.5 * absSin;

        // Base stroke sizes (will be scaled by widthFactor)
        const baseMain = 80;
        const baseOutline = 120;

        const mainWidth = Math.max(1, Math.round(baseMain * widthFactor));
        const outlineWidth = Math.max(1, Math.round(baseOutline * widthFactor));

        // Draw bridge as a thick line
        this.graphics.lineStyle(mainWidth, 0x8B7355, 1);
        this.graphics.moveTo(this.pointA.x, this.pointA.y);
        this.graphics.lineTo(this.pointB.x, this.pointB.y);
        
        // Add darker outline
        this.graphics.lineStyle(outlineWidth, 0x5D4E3C, 1);
        this.graphics.moveTo(this.pointA.x, this.pointA.y);
        this.graphics.lineTo(this.pointB.x, this.pointB.y);
        
        // Draw the main bridge on top
        this.graphics.lineStyle(mainWidth, 0x8B7355, 1);
        this.graphics.moveTo(this.pointA.x, this.pointA.y);
        this.graphics.lineTo(this.pointB.x, this.pointB.y);
    }

    destroy() {
        this.graphics.destroy();
    }
}