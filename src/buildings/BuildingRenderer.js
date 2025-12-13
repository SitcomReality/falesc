import * as PIXI from 'pixi.js';
import { TILE_WIDTH, TILE_HEIGHT } from '../constants.js';

export class BuildingRenderer {
    static draw(graphics, building) {
        graphics.clear();
        
        const { state } = building;
        const isPending = state === 'PENDING';
        const isGhost = state === 'RESERVED' || isPending;
        
        // Dimensions
        const w = TILE_WIDTH;
        const h = TILE_HEIGHT;
        const halfW = w / 2;
        const halfH = h / 2;
        const height = 180; // vertical height of the block (screen space)
        
        // Shadow length is 50% of the building height
        const shadowLength = height * 0.5;
        
        // Palette
        let colorTop, colorLeft, colorRight, alpha, strokeColor, shadowAlpha;
        
        if (isPending) {
            colorTop = 0xC8ECFF;
            colorLeft = 0x9ED5FF;
            colorRight = 0x6EA6E6;
            alpha = 0.35;
            strokeColor = 0xFFFFFF;
            shadowAlpha = 0.2;
        } else if (isGhost) {
            colorTop = 0xAADDFF;
            colorLeft = 0x88BBEE;
            colorRight = 0x5588CC;
            alpha = 0.6;
            strokeColor = 0xFFFFFF;
            shadowAlpha = 0.3;
        } else {
            colorTop = 0xE0E0E0;
            colorLeft = 0xCCCCCC;
            colorRight = 0x999999;
            alpha = 1.0;
            strokeColor = 0x555555;
            shadowAlpha = 0.5;
        }
        
        // Vertices relative to center (0,0) which is center of the grid tile footprint
        // Tile footprint top: (0, -halfH), right: (halfW, 0), bottom: (0, halfH), left: (-halfW, 0)
        const bTop = { x: 0, y: -halfH };
        const bRight = { x: halfW, y: 0 };
        const bBottom = { x: 0, y: halfH };
        const bLeft = { x: -halfW, y: 0 };
        
        // Top face vertices (shift up by height)
        const tTop = { x: bTop.x, y: bTop.y - height };
        const tRight = { x: bRight.x, y: bRight.y - height };
        const tBottom = { x: bBottom.x, y: bBottom.y - height };
        const tLeft = { x: bLeft.x, y: bLeft.y - height };
        
        // --- Shadow (flat isometric parallelogram aligned to grid) ---
        // Light from NW -> shadow projects SE. Build a parallelogram whose edges are parallel
        // to the tile footprint edges by offsetting the right and bottom footprint points.
        // Offset chosen to keep an isometric look (dx along x, dy along y).
        const offsetX = shadowLength * 0.9; // how far to the right
        const offsetY = shadowLength * 0.45; // how far down (kept shallower for iso)
        
        const sA = { x: bRight.x,               y: bRight.y };                    // building right base
        const sB = { x: bRight.x + offsetX,     y: bRight.y + offsetY };          // right + offset (far SE)
        const sC = { x: bBottom.x + offsetX,    y: bBottom.y + offsetY };         // bottom + offset
        const sD = { x: bBottom.x,              y: bBottom.y };                   // building bottom base
        
        graphics.beginFill(0x000000, shadowAlpha);
        graphics.lineStyle(0);
        graphics.moveTo(sA.x, sA.y);
        graphics.lineTo(sB.x, sB.y);
        graphics.lineTo(sC.x, sC.y);
        graphics.lineTo(sD.x, sD.y);
        graphics.closePath();
        graphics.endFill();

        // --- Secondary Shadow (rotated / top-right, fading behind the building) ---
        // Create a second parallelogram that projects toward the North-East (top-right)
        // using a rotated offset so it sits to the top-right of the existing shadow and
        // appears to disappear behind the building on the North-East side.
        // We keep it slightly subtler in alpha so it blends with the main shadow.
        const offset2X = shadowLength * 0.45; // smaller horizontal component
        const offset2Y = shadowLength * 0.9;  // larger vertical component (will be inverted to go up)
        const secondaryAlpha = Math.max(0.06, shadowAlpha * 0.65);

        // Anchor this secondary shadow around the top-right edge so it appears to tuck behind
        const rA = { x: tRight.x,                         y: tRight.y };                          // top-right top corner
        const rB = { x: tRight.x + offset2X,              y: tRight.y - offset2Y };               // shifted up-right
        const rC = { x: tBottom.x + offset2X,             y: tBottom.y - offset2Y };              // below shifted up-right
        const rD = { x: tBottom.x,                        y: tBottom.y };                         // top of right face

        graphics.beginFill(0x000000, secondaryAlpha);
        graphics.lineStyle(0);
        graphics.moveTo(rA.x, rA.y);
        graphics.lineTo(rB.x, rB.y);
        graphics.lineTo(rC.x, rC.y);
        graphics.lineTo(rD.x, rD.y);
        graphics.closePath();
        graphics.endFill();
        
        // --- Building Faces ---
        // Draw right face first (so it visually sits above the ground shadow where appropriate)
        graphics.beginFill(colorRight, alpha);
        graphics.lineStyle(1, strokeColor, alpha);
        graphics.moveTo(bBottom.x, bBottom.y);
        graphics.lineTo(bRight.x, bRight.y);
        graphics.lineTo(tRight.x, tRight.y);
        graphics.lineTo(tBottom.x, tBottom.y);
        graphics.closePath();
        graphics.endFill();
        
        // Left Face (Light)
        graphics.beginFill(colorLeft, alpha);
        graphics.lineStyle(1, strokeColor, alpha);
        graphics.moveTo(bBottom.x, bBottom.y);
        graphics.lineTo(bLeft.x, bLeft.y);
        graphics.lineTo(tLeft.x, tLeft.y);
        graphics.lineTo(tBottom.x, tBottom.y);
        graphics.closePath();
        graphics.endFill();
        
        // Top Face
        graphics.beginFill(colorTop, alpha);
        graphics.lineStyle(1, strokeColor, alpha);
        graphics.moveTo(tTop.x, tTop.y);
        graphics.lineTo(tRight.x, tRight.y);
        graphics.lineTo(tBottom.x, tBottom.y);
        graphics.lineTo(tLeft.x, tLeft.y);
        graphics.closePath();
        graphics.endFill();
    }
}

