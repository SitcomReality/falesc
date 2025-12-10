import * as PIXI from 'pixi.js';

export function drawSectorGraphics(graphics, shape, centerX, centerY, gridSize, tileWidth, tileHeight) {
    graphics.clear();

    const depth = 35; // Height of the cliff/side
    const topColor = 0xE8DCC0; // Sand/Light Dirt
    const sideColor = 0x655540; // Dark Rock/Earth
    const strokeColor = 0x9B8B6F;

    if (shape.length === 0) return;

    // 1. Draw the "Sides" (Underground Projection)
    graphics.beginFill(sideColor);

    // Draw the bottom lid (offset by depth)
    graphics.moveTo(shape[0].x, shape[0].y + depth);
    for (let i = 1; i < shape.length; i++) {
        graphics.lineTo(shape[i].x, shape[i].y + depth);
    }
    graphics.closePath();

    // Draw the walls connecting Top to Bottom
    for (let i = 0; i < shape.length; i++) {
        const curr = shape[i];
        const next = shape[(i + 1) % shape.length];

        graphics.moveTo(curr.x, curr.y);
        graphics.lineTo(next.x, next.y);
        graphics.lineTo(next.x, next.y + depth);
        graphics.lineTo(curr.x, curr.y + depth);
    }
    graphics.endFill();

    // 2. Draw Top Surface
    graphics.beginFill(topColor);
    graphics.lineStyle(3, strokeColor, 1, 0.5);

    graphics.moveTo(shape[0].x, shape[0].y);
    for (let i = 1; i < shape.length; i++) {
        graphics.lineTo(shape[i].x, shape[i].y);
    }

    graphics.closePath();
    graphics.endFill();

    // 3. Draw Grid (Subtle Overlay)
    drawGrid(graphics, centerX, centerY, gridSize, tileWidth, tileHeight);
}

function drawGrid(graphics, centerX, centerY, gridSize, tileWidth, tileHeight) {
    // Grid properties
    const N = gridSize;
    // Slightly darker grey and a bit more opaque so the grid is easier to see
    const lineColor = 0xB0B0B0;
    const alpha = 0.25;

    graphics.lineStyle(2, lineColor, alpha);

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
        const x = (cu - cv) * (tileWidth / 2);
        const y = (cu + cv) * (tileHeight / 2);
        return { x: centerX + x, y: centerY + y };
    };

    // Draw rows
    for (let v = 0; v <= N; v++) {
        const start = project(0, v);
        const end = project(N, v);
        graphics.moveTo(start.x, start.y);
        graphics.lineTo(end.x, end.y);
    }

    // Draw cols
    for (let u = 0; u <= N; u++) {
        const start = project(u, 0);
        const end = project(u, N);
        graphics.moveTo(start.x, start.y);
        graphics.lineTo(end.x, end.y);
    }
}