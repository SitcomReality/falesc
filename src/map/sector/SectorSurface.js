/* Top surface, regolith flecks, rim light and the build grid. */
import { P } from './SectorPalette.js';
import { ellipseFits, hash, inGridDiamond, pointInPolygon, traceShape } from './SectorPrimitives.js';

export function drawTopSurface(g, shape, centerX, centerY, bounds, seed, gridSize, tileWidth, tileHeight) {
    const spanX = Math.max(1, bounds.maxX - bounds.minX);
    const spanY = Math.max(1, bounds.maxY - bounds.minY);
    const halfGridW = (gridSize * tileWidth) / 2;
    const halfGridH = (gridSize * tileHeight) / 2;

    const project = (u, v) => {
        const cu = u - gridSize / 2;
        const cv = v - gridSize / 2;
        return {
            x: centerX + (cu - cv) * (tileWidth / 2),
            y: centerY + (cu + cv) * (tileHeight / 2)
        };
    };
    const pad = [project(0, 0), project(gridSize, 0), project(gridSize, gridSize), project(0, gridSize)];

    // Dusty rose regolith base. A paper wash over rose keeps the surface
    // pink-cream rather than the bright sand of the old shore art.
    g.beginFill(P.rose, 1);
    g.lineStyle(0);
    traceShape(g, shape, centerX, centerY, 1, 0, 0);
    g.endFill();

    g.beginFill(P.paper, 0.52);
    traceShape(g, shape, centerX, centerY, 0.995, 0, 0);
    g.endFill();

    // Mineral mottling breaks up the flat field.
    const patchColors = [P.wine, P.paper, P.peach, P.rose, P.wine, P.paperWarm, P.cream, P.rose];
    for (let i = 0; i < 8; i++) {
        const angle = hash(seed, i, 31) * Math.PI * 2;
        const reach = 0.44 + hash(seed, i, 32) * 0.44;
        const px = centerX + Math.cos(angle) * spanX * 0.5 * reach;
        const py = centerY + Math.sin(angle) * spanY * 0.5 * reach;
        const rx = spanX * (0.03 + hash(seed, i, 33) * 0.035);
        const ry = spanY * (0.024 + hash(seed, i, 34) * 0.028);
        if (!ellipseFits(px, py, rx, ry, shape)) continue;
        g.beginFill(patchColors[i], 0.12);
        g.lineStyle(0);
        g.drawEllipse(px, py, rx, ry);
        g.endFill();
    }

    // South-east terminator: the top darkens away from the light.
    g.beginFill(P.wine, 0.16);
    traceShape(g, shape, centerX, centerY, 0.95, spanX * 0.02, spanY * 0.026);
    g.endFill();

    // A warm wash in the north-west quadrant.
    g.beginFill(P.paperWarm, 0.12);
    traceShape(g, shape, centerX, centerY, 0.9, -spanX * 0.02, -spanY * 0.026);
    g.endFill();

    // Surveyed build field: a quiet paper pad under the grid, so the
    // buildable diamond reads separately from the dusty outer ring.
    g.beginFill(P.cream, 0.11);
    g.lineStyle(0);
    g.moveTo(pad[0].x, pad[0].y);
    for (let i = 1; i < 4; i++) {
        g.lineTo(pad[i].x, pad[i].y);
    }
    g.closePath();
    g.endFill();

    // Warm paper highlights, pushed north-west.
    g.beginFill(P.cream, 0.3);
    traceShape(g, shape, centerX, centerY, 0.68, -spanX * 0.03, -spanY * 0.038);
    g.endFill();

    g.beginFill(P.paper, 0.18);
    traceShape(g, shape, centerX, centerY, 0.48, -spanX * 0.012, -spanY * 0.016);
    g.endFill();

    // Broken dust berm just inside the rim.
    g.lineStyle(12, P.wine, 0.09);
    for (let i = 0; i < shape.length; i += 2) {
        if (hash(seed, i, 111) < 0.4) continue;
        const a = shape[i];
        const b = shape[(i + 1) % shape.length];
        g.moveTo(centerX + (a.x - centerX) * 0.975, centerY + (a.y - centerY) * 0.975);
        g.lineTo(centerX + (b.x - centerX) * 0.975, centerY + (b.y - centerY) * 0.975);
    }

    // Long wind drifts in the outer ring.
    for (let i = 0; i < 2; i++) {
        const angle = hash(seed, i, 112) * Math.PI * 2;
        const reach = 0.7 + hash(seed, i, 113) * 0.12;
        const x = centerX + Math.cos(angle) * spanX * 0.5 * reach;
        const y = centerY + Math.sin(angle) * spanY * 0.5 * reach;
        const rx = spanX * 0.07;
        const ry = spanY * 0.022;
        if (!ellipseFits(x, y, rx, ry, shape)) continue;
        g.beginFill(i === 0 ? P.paperWarm : P.cream, 0.16);
        g.lineStyle(0);
        g.drawEllipse(x, y, rx, ry);
        g.endFill();
    }

    // Dusty crust just inside the rim.
    g.lineStyle(2.8, P.wine, 0.18);
    traceShape(g, shape, centerX, centerY, 0.958, 0, 0);

    // Etched survey contours: dashed so they read as hand-etched survey marks.
    const rings = [
        { scale: 0.86, step: 5, phase: 0, alpha: 0.14 },
        { scale: 0.7, step: 4, phase: 2, alpha: 0.15 },
        { scale: 0.5, step: 3, phase: 1, alpha: 0.12 },
        { scale: 0.34, step: 3, phase: 0, alpha: 0.08 }
    ];
    for (let r = 0; r < rings.length; r++) {
        const ring = rings[r];
        g.lineStyle(1.1, P.ink, ring.alpha);
        for (let i = ring.phase; i < shape.length; i += ring.step) {
            const a = shape[i];
            const b = shape[(i + 1) % shape.length];
            g.moveTo(
                centerX + (a.x - centerX) * ring.scale,
                centerY + (a.y - centerY) * ring.scale
            );
            g.lineTo(
                centerX + (b.x - centerX) * ring.scale,
                centerY + (b.y - centerY) * ring.scale
            );
        }
    }

    // Regolith grain outside the build pad: fine flecks, not props.
    drawRegolithFlecks(g, shape, centerX, centerY, spanX, spanY, seed, halfGridW, halfGridH, P.ink, 0.17, 46, 0);
    drawRegolithFlecks(g, shape, centerX, centerY, spanX, spanY, seed, halfGridW, halfGridH, P.paper, 0.32, 30, 7);

    // Angular regolith chips catch the light along the rim.
    g.beginFill(P.plumDeep, 0.26);
    g.lineStyle(0);
    for (let i = 0; i < 16; i++) {
        const angle = hash(seed, i, 71) * Math.PI * 2;
        const reach = 0.62 + hash(seed, i, 72) * 0.32;
        const x = centerX + Math.cos(angle) * spanX * 0.5 * reach;
        const y = centerY + Math.sin(angle) * spanY * 0.5 * reach;
        if (!pointInPolygon(x, y, shape)) continue;
        if (inGridDiamond(x, y, centerX, centerY, halfGridW, halfGridH, 1.06)) continue;
        const r = 2.5 + hash(seed, i, 73) * 5;
        g.moveTo(x - r, y + r * 0.2);
        g.lineTo(x - r * 0.2, y - r * 0.7);
        g.lineTo(x + r, y - r * 0.1);
        g.lineTo(x + r * 0.2, y + r * 0.6);
        g.closePath();
    }
    g.endFill();

    // Fine cracks in the regolith crust.
    for (let i = 0; i < 5; i++) {
        const angle = hash(seed, i, 76) * Math.PI * 2;
        const reach = 0.66 + hash(seed, i, 77) * 0.28;
        let x = centerX + Math.cos(angle) * spanX * 0.5 * reach;
        let y = centerY + Math.sin(angle) * spanY * 0.5 * reach;
        if (!pointInPolygon(x, y, shape)) continue;
        if (inGridDiamond(x, y, centerX, centerY, halfGridW, halfGridH, 1.04)) continue;
        const points = [[x, y]];
        g.lineStyle(1.6, P.wine, 0.3);
        g.moveTo(x, y);
        for (let step = 0; step < 3; step++) {
            x += (hash(seed, i, 78 + step) - 0.5) * 34;
            y += (hash(seed, i, 82 + step) - 0.5) * 22;
            if (!pointInPolygon(x, y, shape)) break;
            g.lineTo(x, y);
            points.push([x, y]);
        }
        g.lineStyle(0.9, P.cream, 0.35);
        g.moveTo(points[0][0] - 1.5, points[0][1] - 2);
        for (let p = 1; p < points.length; p++) {
            g.lineTo(points[p][0] - 1.5, points[p][1] - 2);
        }
    }

    // Survey transects with tick marks, running out from the build pad.
    for (let i = 0; i < 3; i++) {
        const angle = hash(seed, i, 91) * Math.PI * 2;
        const r0 = 0.64;
        const r1 = 0.82 + hash(seed, i, 92) * 0.08;
        const x0 = centerX + Math.cos(angle) * spanX * 0.5 * r0;
        const y0 = centerY + Math.sin(angle) * spanY * 0.5 * r0;
        const x1 = centerX + Math.cos(angle) * spanX * 0.5 * r1;
        const y1 = centerY + Math.sin(angle) * spanY * 0.5 * r1;
        if (!pointInPolygon(x0, y0, shape) || !pointInPolygon(x1, y1, shape)) continue;
        if (inGridDiamond(x0, y0, centerX, centerY, halfGridW, halfGridH, 1.03)) continue;
        if (inGridDiamond(x1, y1, centerX, centerY, halfGridW, halfGridH, 1.03)) continue;
        const dx = x1 - x0;
        const dy = y1 - y0;
        const length = Math.hypot(dx, dy) || 1;
        const px = -dy / length;
        const py = dx / length;
        g.lineStyle(1.2, P.ink, 0.2);
        g.moveTo(x0, y0);
        g.lineTo(x1, y1);
        g.moveTo(x1 - px * 7, y1 - py * 7);
        g.lineTo(x1 + px * 7, y1 + py * 7);
        const mx = (x0 + x1) * 0.5;
        const my = (y0 + y1) * 0.5;
        g.moveTo(mx - px * 4, my - py * 4);
        g.lineTo(mx + px * 4, my + py * 4);
    }

    // Faint grain inside the surveyed pad, kept clear of the grid lines.
    g.beginFill(P.ink, 0.07);
    g.lineStyle(0);
    for (let i = 0; i < 22; i++) {
        const u = hash(seed, i, 96) * gridSize;
        const v = hash(seed, i, 97) * gridSize;
        const point = project(u, v);
        g.drawCircle(point.x, point.y, 1 + hash(seed, i, 98) * 2.2);
    }
    g.endFill();

    // Wind-scoured gouges in the outer regolith.
    for (let i = 0; i < 4; i++) {
        const angle = hash(seed, i, 61) * Math.PI * 2;
        const reach = 0.7 + hash(seed, i, 62) * 0.14;
        const x0 = centerX + Math.cos(angle) * spanX * 0.5 * reach;
        const y0 = centerY + Math.sin(angle) * spanY * 0.5 * reach;
        if (!pointInPolygon(x0, y0, shape)) continue;
        if (inGridDiamond(x0, y0, centerX, centerY, halfGridW, halfGridH, 1.04)) continue;
        const length = 50 + hash(seed, i, 63) * 90;
        const direction = hash(seed, i, 64) * Math.PI * 2;
        const x1 = x0 + Math.cos(direction) * length;
        const y1 = y0 + Math.sin(direction) * length * 0.45;
        if (!pointInPolygon(x1, y1, shape)) continue;
        g.lineStyle(3, P.wine, 0.16);
        g.moveTo(x0, y0);
        g.lineTo(x1, y1);
        g.lineStyle(1.1, P.cream, 0.3);
        g.moveTo(x0 - 2, y0 - 3);
        g.lineTo(x1 - 2, y1 - 3);
    }

    // Small etched survey crosses outside the buildable diamond.
    for (let i = 0; i < 6; i++) {
        const angle = hash(seed, i, 21) * Math.PI * 2;
        const reach = 0.54 + hash(seed, i, 22) * 0.28;
        const x = centerX + Math.cos(angle) * spanX * 0.5 * reach;
        const y = centerY + Math.sin(angle) * spanY * 0.5 * reach;
        if (!pointInPolygon(x, y, shape)) continue;
        if (inGridDiamond(x, y, centerX, centerY, halfGridW, halfGridH, 1.08)) continue;
        g.lineStyle(1.3, P.ink, 0.2);
        g.moveTo(x - 5, y);
        g.lineTo(x + 5, y);
        g.moveTo(x, y - 5);
        g.lineTo(x, y + 5);
    }

    // A few shallow scrape marks near the sunlit rim.
    for (let i = 0; i < 5; i++) {
        const angle = hash(seed, i, 23) * Math.PI * 2;
        const reach = 0.72 + hash(seed, i, 24) * 0.16;
        const x = centerX + Math.cos(angle) * spanX * 0.5 * reach;
        const y = centerY + Math.sin(angle) * spanY * 0.5 * reach;
        if (!pointInPolygon(x, y, shape)) continue;
        if (inGridDiamond(x, y, centerX, centerY, halfGridW, halfGridH, 1.02)) continue;
        const length = 12 + hash(seed, i, 25) * 16;
        g.lineStyle(1, P.cream, 0.32);
        g.moveTo(x - length, y + 3);
        g.lineTo(x + length, y - 2);
    }
}


export function drawRegolithFlecks(g, shape, centerX, centerY, spanX, spanY, seed, halfGridW, halfGridH, color, alpha, count, shift) {
    g.beginFill(color, alpha);
    g.lineStyle(0);
    for (let i = 0; i < count; i++) {
        const index = i + shift;
        const angle = hash(seed, index, 41) * Math.PI * 2;
        const reach = 0.58 + hash(seed, index, 42) * 0.34;
        const x = centerX + Math.cos(angle) * spanX * 0.5 * reach;
        const y = centerY + Math.sin(angle) * spanY * 0.5 * reach;
        if (!pointInPolygon(x, y, shape)) continue;
        if (inGridDiamond(x, y, centerX, centerY, halfGridW, halfGridH, 1.06)) continue;
        const radius = 2.2 + hash(seed, index, 43) * 4.2;
        g.drawCircle(x, y, radius);
    }
    g.endFill();
}


export function drawRimLight(g, shape, centerX, centerY) {
    const nw = [];
    const se = [];
    for (let i = 0; i < shape.length; i++) {
        const a = shape[i];
        const b = shape[(i + 1) % shape.length];
        const mx = (a.x + b.x) * 0.5 - centerX;
        const my = (a.y + b.y) * 0.5 - centerY;
        const length = Math.hypot(mx, my) || 1;
        const outward = (mx + my) / length;
        if (outward < -0.12) nw.push([a, b]);
        else if (outward > 0.12) se.push([a, b]);
    }

    // A dark contact line keeps the pale top from blending into the keel.
    g.lineStyle(1.3, P.ink, 0.26);
    traceShape(g, shape, centerX, centerY, 1, 0, 0);

    strokeSegments(g, nw, 13, P.peach, 0.18);
    strokeSegments(g, nw, 6, P.sun, 0.9);
    strokeSegments(g, nw, 2.2, P.cream, 1);

    strokeSegments(g, se, 11, P.plumDeep, 0.3);
    strokeSegments(g, se, 5.5, P.wine, 0.72);
    strokeSegments(g, se, 1.8, P.ink, 0.4);
}


export function strokeSegments(g, segments, width, color, alpha) {
    if (segments.length === 0) return;
    g.lineStyle(width, color, alpha);
    for (let i = 0; i < segments.length; i++) {
        g.moveTo(segments[i][0].x, segments[i][0].y);
        g.lineTo(segments[i][1].x, segments[i][1].y);
    }
}


export function drawGrid(g, centerX, centerY, gridSize, tileWidth, tileHeight) {
    const N = gridSize;
    const halfW = tileWidth / 2;
    const halfH = tileHeight / 2;

    const project = (u, v) => {
        const cu = u - N / 2;
        const cv = v - N / 2;
        return {
            x: centerX + (cu - cv) * halfW,
            y: centerY + (cu + cv) * halfH
        };
    };

    const corners = [project(0, 0), project(N, 0), project(N, N), project(0, N)];
    const drawDiamond = () => {
        g.moveTo(corners[0].x, corners[0].y);
        g.lineTo(corners[1].x, corners[1].y);
        g.lineTo(corners[2].x, corners[2].y);
        g.lineTo(corners[3].x, corners[3].y);
        g.closePath();
    };

    const drawLines = (width, color, alpha) => {
        g.lineStyle(width, color, alpha);
        for (let v = 0; v <= N; v++) {
            const start = project(0, v);
            const end = project(N, v);
            chalkLine(g, start.x, start.y, end.x, end.y, centerX + v * 17, centerY - v * 13);
        }
        for (let u = 0; u <= N; u++) {
            const start = project(u, 0);
            const end = project(u, N);
            chalkLine(g, start.x, start.y, end.x, end.y, centerX + u * 23, centerY + u * 11);
        }
    };

    // Chalk: a soft warm underlay plus a fine ink line.
    drawLines(3.4, P.wine, 0.12);
    drawLines(1.2, P.ink, 0.38);

    // Boundary: a little stronger than the interior lines.
    g.lineStyle(4.6, P.ink, 0.14);
    drawDiamond();
    g.lineStyle(2, P.ink, 0.6);
    drawDiamond();

    // Corner brackets.
    g.lineStyle(2.1, P.ink, 0.62);
    for (let i = 0; i < 4; i++) {
        const corner = corners[i];
        const prev = corners[(i + 3) % 4];
        const next = corners[(i + 1) % 4];
        const pdx = prev.x - corner.x;
        const pdy = prev.y - corner.y;
        const ndx = next.x - corner.x;
        const ndy = next.y - corner.y;
        const pl = Math.hypot(pdx, pdy) || 1;
        const nl = Math.hypot(ndx, ndy) || 1;
        const length = Math.min(30, 0.18 * Math.min(pl, nl));
        g.moveTo(corner.x, corner.y);
        g.lineTo(corner.x + (pdx / pl) * length, corner.y + (pdy / pl) * length);
        g.moveTo(corner.x, corner.y);
        g.lineTo(corner.x + (ndx / nl) * length, corner.y + (ndy / nl) * length);
    }

    // Compass rose / cardinal diamond at the centre of the buildable area.
    const cx = centerX;
    const cy = centerY;
    g.lineStyle(1.7, P.ink, 0.48);
    g.moveTo(cx, cy - 17);
    g.lineTo(cx + 28, cy);
    g.lineTo(cx, cy + 17);
    g.lineTo(cx - 28, cy);
    g.closePath();
    g.lineStyle(1, P.ink, 0.3);
    g.moveTo(cx, cy - 26);
    g.lineTo(cx, cy + 26);
    g.moveTo(cx - 34, cy);
    g.lineTo(cx + 34, cy);
    g.beginFill(P.rose, 0.85);
    g.lineStyle(0);
    g.drawCircle(cx, cy, 2.4);
    g.endFill();
    g.beginFill(P.sun, 0.9);
    g.drawCircle(cx, cy - 17, 1.8);
    g.endFill();
}


export function chalkLine(g, x0, y0, x1, y1, seedA, seedB) {
    const segments = 4;
    const nx = -(y1 - y0);
    const ny = x1 - x0;
    const length = Math.hypot(nx, ny) || 1;
    g.moveTo(x0, y0);
    for (let i = 1; i < segments; i++) {
        const t = i / segments;
        const jitter = (hash(seedA, seedB, i) - 0.5) * 2.2;
        g.lineTo(
            x0 + (x1 - x0) * t + (nx / length) * jitter,
            y0 + (y1 - y0) * t + (ny / length) * jitter
        );
    }
    g.lineTo(x1, y1);
}

