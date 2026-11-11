import { boundsOf } from './SectorPrimitives.js';
import { drawVoidShadow, drawUnderside, drawDriftingDebris } from './SectorSilhouette.js';
import { drawTopSurface, drawRimLight, drawGrid } from './SectorSurface.js';
import { drawProps } from './SectorProps.js';

/** Compose one island: void shadow, keel, top surface, grid and dressing. */
export function drawSectorGraphics(graphics, shape, centerX, centerY, gridSize, tileWidth, tileHeight) {
    graphics.clear();
    if (!shape || shape.length < 3) return;

    const N = Math.max(1, gridSize || 1);
    const bounds = boundsOf(shape);
    const seed = centerX * 0.019 + centerY * 0.031 + N * 1.73;
    const keelDepth = N * tileHeight * 0.6;

    drawVoidShadow(graphics, shape, centerX, centerY, keelDepth);
    drawUnderside(graphics, shape, centerX, centerY, bounds, seed, keelDepth);
    drawDriftingDebris(graphics, bounds, seed, keelDepth);
    drawTopSurface(graphics, shape, centerX, centerY, bounds, seed, N, tileWidth, tileHeight);
    drawRimLight(graphics, shape, centerX, centerY);
    drawGrid(graphics, centerX, centerY, N, tileWidth, tileHeight);
    drawProps(graphics, shape, centerX, centerY, seed, N, tileWidth, tileHeight);
}
