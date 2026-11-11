import { TILE_WIDTH, TILE_HEIGHT } from './TileMetrics.js';

export function projectGridToWorld(u, v, centerX, centerY, gridSize, tileWidth, tileHeight) {
    // Center the grid coordinates
    const cu = u - gridSize / 2;
    const cv = v - gridSize / 2;
    // Isometric projection
    // x = (u - v) * halfWidth
    // y = (u + v) * halfHeight
    const x = (cu - cv) * (tileWidth / 2);
    const y = (cu + cv) * (tileHeight / 2);
    return { x: centerX + x, y: centerY + y };
}

export function getGridDiamond(centerX, centerY, gridSize, tileWidth, tileHeight) {
    // Define Grid Polygon (Diamond) relative to center
    // Top, Right, Bottom, Left
    const gh = (gridSize * tileHeight) / 2;
    const gw = (gridSize * tileWidth) / 2;

    return [
        { x: centerX, y: centerY + gh },
        { x: centerX + gw, y: centerY },
        { x: centerX, y: centerY - gh },
        { x: centerX - gw, y: centerY }
    ];
}

export function worldToGrid(x, y, centerX, centerY, gridSize, tileWidth, tileHeight) {
    const dx = x - centerX;
    const dy = y - centerY;

    // Inverse Isometric
    // x = (cu - cv) * (w/2) => cu - cv = x / (w/2)
    // y = (cu + cv) * (h/2) => cu + cv = y / (h/2)
    // 2cu = x/(w/2) + y/(h/2)
    // 2cv = y/(h/2) - x/(w/2)
    
    const cu = (dx / tileWidth) + (dy / tileHeight);
    const cv = (dy / tileHeight) - (dx / tileWidth);

    const u = cu + gridSize / 2;
    const v = cv + gridSize / 2;
    
    return { u, v };
}

export function isPointInIsoGrid(x, y, centerX, centerY, gridSize, tileWidth, tileHeight) {
    const { u, v } = worldToGrid(x, y, centerX, centerY, gridSize, tileWidth, tileHeight);

    // Add a small buffer so minerals don't hug the line exactly
    const buffer = 0.1;
    return (u >= buffer && u <= gridSize - buffer &&
        v >= buffer && v <= gridSize - buffer);
}