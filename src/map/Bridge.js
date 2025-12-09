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

        const g = this.graphics;

        // Direction from A to B
        const dx = this.pointB.x - this.pointA.x;
        const dy = this.pointB.y - this.pointA.y;
        const length = Math.hypot(dx, dy) || 1;

        const ux = dx / length;
        const uy = dy / length;

        // Perpendicular (screen-space "side" of the bridge)
        const nx = -uy;
        const ny = ux;

        // Make horizontal bridges appear thinner using angle-based width factor
        const angle = Math.atan2(dy, dx);
        const absSin = Math.abs(Math.sin(angle));
        const widthFactor = 0.5 + 0.5 * absSin;

        // Platform dimensions
        const baseWidth = 80; // base half-width before perspective
        const halfWidth = (baseWidth * widthFactor) / 2;
        const edgeInset = 40; // how far the platform pulls back from the island edge

        // Metal color palette (cartoon cell-shaded)
        const metalBase = 0xB0BEC5;
        const metalDark = 0x546E7A;
        const metalLight = 0xCFD8DC;
        const outlineColor = 0x263238;

        // Helper for constructing quads
        const moveQuad = (points) => {
            g.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                g.lineTo(points[i].x, points[i].y);
            }
            g.closePath();
        };

        // Compute platform corners
        const buildPlatform = () => {
            // Pull back slightly from sector edges so gates sit clear of cliffs
            const startX = this.pointA.x + ux * edgeInset;
            const startY = this.pointA.y + uy * edgeInset;
            const endX = this.pointB.x - ux * edgeInset;
            const endY = this.pointB.y - uy * edgeInset;

            const leftStart = {
                x: startX + nx * halfWidth,
                y: startY + ny * halfWidth
            };
            const rightStart = {
                x: startX - nx * halfWidth,
                y: startY - ny * halfWidth
            };
            const leftEnd = {
                x: endX + nx * halfWidth,
                y: endY + ny * halfWidth
            };
            const rightEnd = {
                x: endX - nx * halfWidth,
                y: endY - ny * halfWidth
            };

            // Slight "lip" for the far edge to hint at thickness
            const lipInset = 6;
            const leftEndInner = {
                x: leftEnd.x - ux * lipInset,
                y: leftEnd.y - uy * lipInset
            };
            const rightEndInner = {
                x: rightEnd.x - ux * lipInset,
                y: rightEnd.y - uy * lipInset
            };

            // Top surface (base)
            g.lineStyle(2, outlineColor, 1, 0.5);
            g.beginFill(metalBase);
            moveQuad([leftStart, rightStart, rightEndInner, leftEndInner]);
            g.endFill();

            // Near edge strip (slightly lighter)
            g.lineStyle(1, outlineColor, 1, 0.5);
            g.beginFill(metalLight);
            moveQuad([leftEndInner, rightEndInner, rightEnd, leftEnd]);
            g.endFill();

            // Simple side shadow under platform
            const shadowDrop = 8;
            g.lineStyle(0);
            g.beginFill(0x000000, 0.25);
            moveQuad([
                { x: leftStart.x, y: leftStart.y + shadowDrop },
                { x: rightStart.x, y: rightStart.y + shadowDrop },
                { x: rightEnd.x, y: rightEnd.y + shadowDrop },
                { x: leftEnd.x, y: leftEnd.y + shadowDrop }
            ]);
            g.endFill();

            return {
                start: { x: startX, y: startY },
                end: { x: endX, y: endY }
            };
        };

        const buildGateAt = (anchor, forwardSign) => {
            // forwardSign: +1 towards B, -1 towards A
            const gateWidth = baseWidth * widthFactor * 0.9;
            const gateHalf = gateWidth / 2;
            const gateHeight = 110;
            const depth = 14; // "thickness" of the arch in screen-space

            // Determine which side is lighter based on normal direction
            const sideLightFirst = nx * forwardSign >= 0;

            const baseCenter = {
                x: anchor.x + ux * forwardSign * 10,
                y: anchor.y + uy * forwardSign * 10
            };

            // Base span (side-to-side across bridge)
            const leftBase = {
                x: baseCenter.x + nx * gateHalf,
                y: baseCenter.y + ny * gateHalf
            };
            const rightBase = {
                x: baseCenter.x - nx * gateHalf,
                y: baseCenter.y - ny * gateHalf
            };

            // Extruded back (depth)
            const leftBaseBack = {
                x: leftBase.x + nx * depth * -1,
                y: leftBase.y + ny * depth * -1
            };
            const rightBaseBack = {
                x: rightBase.x + nx * depth * -1,
                y: rightBase.y + ny * depth * -1
            };

            // Upright posts (vertical in screen space)
            const leftTop = {
                x: leftBase.x,
                y: leftBase.y - gateHeight
            };
            const rightTop = {
                x: rightBase.x,
                y: rightBase.y - gateHeight
            };
            const leftTopBack = {
                x: leftBaseBack.x,
                y: leftBaseBack.y - gateHeight
            };
            const rightTopBack = {
                x: rightBaseBack.x,
                y: rightBaseBack.y - gateHeight
            };

            // Choose which side is light vs dark
            const nearColor = sideLightFirst ? metalLight : metalDark;
            const farColor = sideLightFirst ? metalDark : metalLight;

            // Near vertical frame (front face)
            g.lineStyle(2, outlineColor, 1, 0.5);
            g.beginFill(nearColor);
            moveQuad([leftBase, rightBase, rightTop, leftTop]);
            g.endFill();

            // Far vertical frame (back face)
            g.lineStyle(2, outlineColor, 1, 0.5);
            g.beginFill(farColor);
            moveQuad([leftBaseBack, rightBaseBack, rightTopBack, leftTopBack]);
            g.endFill();

            // Top beam (flat arch)
            g.lineStyle(2, outlineColor, 1, 0.5);
            g.beginFill(metalBase);
            moveQuad([leftTop, rightTop, rightTopBack, leftTopBack]);
            g.endFill();

            // Inner opening shadow (simple dark inset)
            const inset = 10;
            g.lineStyle(0);
            g.beginFill(0x000000, 0.35);
            moveQuad([
                { x: leftBase.x + (rightBase.x - leftBase.x) * 0.1, y: leftBase.y },
                { x: rightBase.x - (rightBase.x - leftBase.x) * 0.1, y: rightBase.y },
                { x: rightTop.x - (rightTop.x - leftTop.x) * 0.1, y: rightTop.y + inset },
                { x: leftTop.x + (rightTop.x - leftTop.x) * 0.1, y: leftTop.y + inset }
            ]);
            g.endFill();
        };

        const platformAnchors = buildPlatform();
        // Gate at each end of the bridge
        buildGateAt(platformAnchors.start, -1);
        buildGateAt(platformAnchors.end, 1);
    }

    destroy() {
        this.graphics.destroy();
    }
}