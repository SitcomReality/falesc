/**
 * Draws a small path network from each structure to its island's central
 * square. Paths are rebuilt only when the building set changes, so they cost
 * nothing per frame.
 */
export function drawSettlementPaths(graphics, map, buildings) {
    graphics.clear();
    if (!map || !buildings || buildings.length === 0) return;

    const groups = new Map();
    for (const building of buildings) {
        if (!groups.has(building.sectorId)) groups.set(building.sectorId, []);
        groups.get(building.sectorId).push(building);
    }

    const outer = 0x9c623b;
    const inner = 0xd9a56c;
    const highlight = 0xffe8bd;

    for (const [sectorId, list] of groups) {
        const sector = map.sectors.find((entry) => entry.id === sectorId);
        if (!sector) continue;
        const center = sector._project(sector.gridSize / 2, sector.gridSize / 2);

        if (list.length > 1) {
            graphics.beginFill(highlight, 0.28);
            graphics.lineStyle(2, 0x7d5a44, 0.38);
            graphics.moveTo(center.x, center.y - 34);
            graphics.lineTo(center.x + 52, center.y);
            graphics.lineTo(center.x, center.y + 34);
            graphics.lineTo(center.x - 52, center.y);
            graphics.closePath();
            graphics.endFill();
        }

        for (const building of list) {
            const from = { x: center.x, y: center.y };
            const to = { x: building.container.x, y: building.container.y };
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 20) continue;

            // A gentle S-curve, alternating to keep parallel paths legible.
            const side = (building.u + building.v) % 2 === 0 ? 1 : -1;
            const nx = -dy / dist;
            const ny = dx / dist;
            const bend = Math.min(90, dist * 0.08) * side;
            const cx = (from.x + to.x) / 2 + nx * bend;
            const cy = (from.y + to.y) / 2 + ny * bend;

            graphics.lineStyle(24, outer, 0.26);
            graphics.moveTo(from.x, from.y);
            graphics.quadraticCurveTo(cx, cy, to.x, to.y);

            graphics.lineStyle(13, inner, 0.42);
            graphics.moveTo(from.x, from.y);
            graphics.quadraticCurveTo(cx, cy, to.x, to.y);

            graphics.lineStyle(2, highlight, 0.6);
            graphics.moveTo(from.x, from.y);
            graphics.quadraticCurveTo(cx, cy, to.x, to.y);

            // Stepping stones: a few small warm diamonds along the curve.
            for (let t = 0.18; t < 0.86; t += 0.2) {
                const px = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * cx + t * t * to.x;
                const py = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * cy + t * t * to.y;
                graphics.beginFill(0xfff2d8, 0.66);
                graphics.lineStyle(0);
                graphics.moveTo(px, py - 5);
                graphics.lineTo(px + 8, py);
                graphics.lineTo(px, py + 5);
                graphics.lineTo(px - 8, py);
                graphics.closePath();
                graphics.endFill();
            }
        }
    }
}
