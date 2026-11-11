import { Sector } from './Sector.js';
import { SeededRandom } from './SeededRandom.js';
import { TILE_WIDTH } from './TileMetrics.js';
import { generateShape } from './ShapeGenerator.js';

/**
 * Generates the archipelago.
 *
 * Shapes are generated once, in local coordinates, then packed by their actual
 * axis-aligned bounds. Nothing is regenerated after packing and nothing is
 * collision-tested as a circle it is not. The finished cluster is translated
 * into a world rectangle with generous water on every side.
 */
export class MapGenerator {
    constructor(seed, mapSize, screenWidth, screenHeight) {
        this.seed = seed;
        this.rng = new SeededRandom(seed);
        this.entityRng = new SeededRandom(seed + 1);
        this.sectors = [];
        this.screenWidth = screenWidth;
        this.screenHeight = screenHeight;
        this.homeSector = null;

        const gridConfigs = {
            // Larger home grids give the Contest's three chapters room for
            // housing, signature services and later growth.
            small: [7, 2, 2, 2],
            medium: [8, 3, 3, 2, 2, 2],
            large: [9, 3, 3, 2, 2, 2, 2]
        };

        this.gridSizes = (gridConfigs[mapSize] || gridConfigs.medium)
            .slice()
            .sort((a, b) => b - a);

        this.generate();
    }

    generate() {
        const worldMargin = 520;
        const minSpacing = 110;

        // 1. Build every silhouette once, in local space.
        const layouts = this.gridSizes.map((size, index) => {
            const rng = new SeededRandom(this.seed + 7919 * (index + 1));
            const radius = ((size * TILE_WIDTH) / 2) * 1.8;
            const shape = generateShape(0, 0, radius, rng);
            const bounds = boundsOf(shape);
            return { size, radius, shape, bounds, rng };
        });

        // 2. Pack actual AABBs on a spiral. AABB non-overlap is conservative:
        //    if the boxes are apart, the irregular shapes are too.
        const placed = [];
        for (const layout of layouts) {
            const position = this.findPlacement(layout, placed, minSpacing);
            const box = translateBounds(layout.bounds, position.x, position.y);
            placed.push({ layout, x: position.x, y: position.y, bounds: box });
        }

        // 3. Centre the cluster in a world rectangle with sea around it.
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const entry of placed) {
            minX = Math.min(minX, entry.bounds.minX);
            minY = Math.min(minY, entry.bounds.minY);
            maxX = Math.max(maxX, entry.bounds.maxX);
            maxY = Math.max(maxY, entry.bounds.maxY);
        }

        const clusterWidth = maxX - minX;
        const clusterHeight = maxY - minY;
        const originX = worldMargin - minX;
        const originY = worldMargin - minY;

        this.worldWidth = clusterWidth + worldMargin * 2;
        this.worldHeight = clusterHeight + worldMargin * 2;
        this.bounds = {
            minX: worldMargin,
            minY: worldMargin,
            maxX: worldMargin + clusterWidth,
            maxY: worldMargin + clusterHeight,
            width: clusterWidth,
            height: clusterHeight,
            margin: worldMargin
        };
        this.world = {
            width: this.worldWidth,
            height: this.worldHeight,
            centerX: this.worldWidth / 2,
            centerY: this.worldHeight / 2
        };

        // 4. Build each sector once, at its final position.
        placed.forEach((entry, index) => {
            const sector = new Sector(
                index,
                entry.x + originX,
                entry.y + originY,
                entry.layout.size,
                entry.layout.rng,
                entry.layout.shape
            );
            this.sectors.push(sector);
        });

        this.homeSector = this.sectors.reduce((best, sector) => {
            if (!best) return sector;
            if (sector.gridSize > best.gridSize) return sector;
            if (sector.gridSize === best.gridSize && sector.centerY < best.centerY) return sector;
            return best;
        }, null);
        this.commonsSector = this.sectors
            .filter((sector) => sector !== this.homeSector)
            .sort((a, b) => b.gridSize - a.gridSize || a.centerX - b.centerX)[0] || null;
        if (this.commonsSector) this.commonsSector.commons = true;
        this.gardenSector = this.sectors
            .filter((sector) => sector !== this.homeSector && sector !== this.commonsSector && sector.gridSize >= 3)
            .sort((a, b) => b.gridSize - a.gridSize || a.centerX - b.centerX)[0] || null;
        if (this.gardenSector) this.gardenSector.garden = true;
        this.commonsEnabled = false;
        this.gardenEnabled = false;
    }

    findPlacement(layout, placed, minSpacing) {
        let angle = 0;
        let distance = 0;
        const stepAngle = 0.55;
        const stepDistance = 24;

        for (let attempts = 0; attempts < 2400; attempts++) {
            const x = Math.cos(angle) * distance;
            const y = Math.sin(angle) * distance * 0.62;
            const candidate = translateBounds(layout.bounds, x, y);

            let collides = false;
            for (const other of placed) {
                if (boundsOverlap(candidate, other.bounds, minSpacing)) {
                    collides = true;
                    break;
                }
            }
            if (!collides) return { x, y };

            angle += stepAngle;
            distance += stepDistance;
        }

        // Extremely unlikely fallback: line the island up beyond the current
        // cluster on the x-axis. It preserves non-overlap even when the spiral
        // search gives up.
        let farX = 0;
        for (const other of placed) farX = Math.max(farX, other.bounds.maxX + minSpacing + layout.bounds.maxX + 10);
        return { x: farX, y: 0 };
    }

    isPointOnMap(x, y) {
        return this.sectors.some(sector => sector.containsPoint(x, y));
    }

    getRandomSector() {
        return this.sectors[this.entityRng.nextInt(0, this.sectors.length - 1)];
    }

    getRandomPointOnMap() {
        const sector = this.getRandomSector();
        return sector.getRandomPoint(this.entityRng);
    }

    getRandomMineralPoint() {
        const sector = this.getRandomSector();
        return sector.getRandomPointOutsideGrid(this.entityRng);
    }

    destroy() {
        this.sectors.forEach(s => s.destroy());
        this.sectors = [];
    }
}

function boundsOf(points) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const point of points) {
        if (point.x < minX) minX = point.x;
        if (point.y < minY) minY = point.y;
        if (point.x > maxX) maxX = point.x;
        if (point.y > maxY) maxY = point.y;
    }
    return { minX, minY, maxX, maxY };
}

function translateBounds(bounds, x, y) {
    return {
        minX: bounds.minX + x,
        minY: bounds.minY + y,
        maxX: bounds.maxX + x,
        maxY: bounds.maxY + y
    };
}

function boundsOverlap(a, b, gap) {
    return !(
        a.maxX + gap < b.minX ||
        a.minX - gap > b.maxX ||
        a.maxY + gap < b.minY ||
        a.minY - gap > b.maxY
    );
}
