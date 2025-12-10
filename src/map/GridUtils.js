import { TILE_WIDTH, TILE_HEIGHT } from '../constants.js';

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

export function isPointInIsoGrid(x, y, centerX, centerY, gridSize, tileWidth, tileHeight) {
    // Transform world x,y back to grid u,v
    // Reverse iso: 
    // dx = x - cx, dy = y - cy
    // u = (dx / halfW + dy / halfH) / 2 + N/2
    // v = (dy / halfH - dx / halfW) / 2 + N/2
    // Simplification:
    // dy / halfH = (cu + cv)
    // dx / halfW = (cu - cv)
    // sum = 2cu => cu = sum/2
    // sub = 2cv => cv = sub/2

    const dx = x - centerX;
    const dy = y - centerY;
    const hw = tileWidth / 2;
    const hh = tileHeight / 2;

    const cu = (dx / hw + dy / hh) / 2;
    const cv = (dy / hh - dx / hw) / 2;

    const u = cu + gridSize / 2;
    const v = cv + gridSize / 2;

    // Add a small buffer so minerals don't hug the line exactly
    const buffer = 0.1;
    return (u >= buffer && u <= gridSize - buffer &&
        v >= buffer && v <= gridSize - buffer);
}