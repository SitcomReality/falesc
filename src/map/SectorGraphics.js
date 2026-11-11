/**
 * FALESC — sector art for the Confluence.
 *
 * A sector is a floating shard of dusty regolith in the warm nebula void:
 * a paper-bright top surface, a deep jagged rock keel with mint/lavender
 * crystal veins, hanging cables and pipes, and vacuum-safe dressing placed
 * outside the buildable survey grid.
 *
 * One light rule: everything is lit from the north-west and shaded to the
 * south-east. The drawing is baked once into a Pixi Graphics object, so there
 * is no per-frame work here.
 */

const P = {
    ink: 0x211225,
    plum: 0x3a163c,
    plumDeep: 0x1c0d24,
    wine: 0x7d2148,
    rose: 0xc73d61,
    coral: 0xff6b5e,
    bubblegum: 0xff4f9a,
    peach: 0xffa07a,
    sun: 0xffd36e,
    paper: 0xfff2d8,
    paperWarm: 0xf3d9ae,
    cream: 0xfff8ea,
    mint: 0x59e3c2,
    mintSoft: 0xa8f5dc,
    cyan: 0x36c6d9,
    lavender: 0xc9b6ff
};

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

/* ------------------------------------------------------------------ */
/* Small shared helpers                                                */
/* ------------------------------------------------------------------ */

function hash(a, b, c) {
    const value = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453;
    return value - Math.floor(value);
}

function boundsOf(points) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < points.length; i++) {
        const point = points[i];
        if (point.x < minX) minX = point.x;
        if (point.y < minY) minY = point.y;
        if (point.x > maxX) maxX = point.x;
        if (point.y > maxY) maxY = point.y;
    }
    return { minX, minY, maxX, maxY };
}

function traceShape(g, shape, centerX, centerY, scale, offsetX, offsetY) {
    g.moveTo(
        centerX + (shape[0].x - centerX) * scale + offsetX,
        centerY + (shape[0].y - centerY) * scale + offsetY
    );
    for (let i = 1; i < shape.length; i++) {
        g.lineTo(
            centerX + (shape[i].x - centerX) * scale + offsetX,
            centerY + (shape[i].y - centerY) * scale + offsetY
        );
    }
    g.closePath();
}

function polygon(g, points, color, alpha, edgeColor, edgeWidth) {
    g.beginFill(color, alpha === undefined ? 1 : alpha);
    if (edgeColor === undefined || edgeColor === null) {
        g.lineStyle(0);
    } else {
        g.lineStyle(edgeWidth === undefined ? 1 : edgeWidth, edgeColor, 0.6);
    }
    g.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
        g.lineTo(points[i][0], points[i][1]);
    }
    g.closePath();
    g.endFill();
}

function pointInPolygon(x, y, points) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const xi = points[i].x;
        const yi = points[i].y;
        const xj = points[j].x;
        const yj = points[j].y;
        const intersect = ((yi > y) !== (yj > y)) &&
            (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function ellipseFits(x, y, rx, ry, shape) {
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        if (!pointInPolygon(x + Math.cos(angle) * rx, y + Math.sin(angle) * ry, shape)) {
            return false;
        }
    }
    return true;
}

function inGridDiamond(x, y, centerX, centerY, halfW, halfH, margin) {
    const dx = Math.abs(x - centerX) / Math.max(1, halfW * margin);
    const dy = Math.abs(y - centerY) / Math.max(1, halfH * margin);
    return dx + dy <= 1;
}

function contactShadow(g, x, y, rx, ry, alpha) {
    g.beginFill(P.plumDeep, alpha === undefined ? 0.2 : alpha);
    g.lineStyle(0);
    g.drawEllipse(x, y, rx, ry);
    g.endFill();
}

/* ------------------------------------------------------------------ */
/* Void shadow                                                         */
/* ------------------------------------------------------------------ */

function drawVoidShadow(g, shape, centerX, centerY, keelDepth) {
    // Stacked, offset silhouettes give a soft shadow without a blur filter.
    const layers = [
        { scale: 1.1, x: keelDepth * 0.26, y: keelDepth * 0.9, alpha: 0.08 },
        { scale: 1.05, x: keelDepth * 0.16, y: keelDepth * 0.62, alpha: 0.1 },
        { scale: 1.0, x: keelDepth * 0.1, y: keelDepth * 0.42, alpha: 0.15 }
    ];
    for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        g.beginFill(P.plumDeep, layer.alpha);
        g.lineStyle(0);
        traceShape(g, shape, centerX, centerY, layer.scale, layer.x, layer.y);
        g.endFill();
    }
}

/* ------------------------------------------------------------------ */
/* Underside: the floating shard's keel                                */
/* ------------------------------------------------------------------ */

function frontArc(shape, bounds) {
    const midY = (bounds.minY + bounds.maxY) / 2;
    const points = [];
    for (let i = 0; i < shape.length; i++) {
        if (shape[i].y >= midY - 2) points.push(shape[i]);
    }
    if (points.length < 3) {
        return shape.slice().sort((a, b) => a.x - b.x);
    }
    points.sort((a, b) => a.x - b.x);
    return points;
}

function fillBand(g, arc, depths, t0, t1, color, alpha) {
    g.beginFill(color, alpha);
    g.lineStyle(0);
    for (let i = 0; i < arc.length; i++) {
        const point = arc[i];
        const y = point.y + depths[i] * t0;
        if (i === 0) g.moveTo(point.x, y);
        else g.lineTo(point.x, y);
    }
    for (let i = arc.length - 1; i >= 0; i--) {
        const point = arc[i];
        g.lineTo(point.x, point.y + depths[i] * t1);
    }
    g.closePath();
    g.endFill();
}

function drawUnderside(g, shape, centerX, centerY, bounds, seed, keelDepth) {
    const arc = frontArc(shape, bounds);
    if (arc.length < 2) return;

    const spanX = Math.max(1, bounds.maxX - bounds.minX);
    const midX = (bounds.minX + bounds.maxX) / 2;
    const midY = (bounds.minY + bounds.maxY) / 2;
    const frontSpan = Math.max(1, bounds.maxY - midY);
    const halfSpan = spanX * 0.5;

    const depths = [];
    for (let i = 0; i < arc.length; i++) {
        const point = arc[i];
        const lateral = Math.min(1, Math.abs(point.x - midX) / halfSpan);
        const central = Math.pow(1 - lateral, 1.35);
        const front = Math.max(0, Math.min(1, (point.y - midY) / frontSpan));
        const jitter = 0.82 + hash(seed, i, 3) * 0.4;
        const tooth = i % 5 === 0 ? 1.3 : (i % 5 === 2 ? 0.88 : 1);
        depths.push(keelDepth * (0.12 + 0.88 * central) * (0.5 + 0.5 * front) * jitter * tooth);
    }

    // Main rock mass and a jagged warm strata cap.
    fillBand(g, arc, depths, 0, 1, P.plum, 1);
    fillJaggedCap(g, arc, depths, P.wine, 0.82, seed);

    // Dark lower lip.
    fillBand(g, arc, depths, 0.68, 1, P.plumDeep, 0.92);

    // Broad, broken strata bands across the rock face.
    fillStrataBand(g, arc, depths, 0.27, 0.4, P.wine, 0.2, seed, 31);
    fillStrataBand(g, arc, depths, 0.54, 0.63, P.plumDeep, 0.3, seed, 32);

    // Big faceted buttresses give the keel volume instead of a flat wall.
    drawKeelPlates(g, arc, depths, spanX, seed);

    // Broken shard tips below the lip.
    drawKeelTips(g, arc, depths, seed);

    // Jagged strata seams.
    const strata = [0.18, 0.36, 0.55, 0.76];
    for (let s = 0; s < strata.length; s++) {
        const t = strata[s];
        const highlight = s === 1;
        g.lineStyle(highlight ? 1.6 : 1.1, highlight ? P.rose : P.ink, highlight ? 0.25 : 0.3);
        for (let i = 0; i < arc.length; i++) {
            const point = arc[i];
            const x = point.x;
            const y = point.y + depths[i] * t + (hash(seed, i, 30 + s) - 0.5) * 3;
            if (i === 0) g.moveTo(x, y);
            else g.lineTo(x, y);
        }
    }

    // Angular fractures cut across the strata.
    for (let k = 0; k < 5; k++) {
        const idx = Math.min(arc.length - 1, Math.floor((0.14 + k * 0.18) * arc.length));
        const point = arc[idx];
        const depth = depths[idx];
        let x = point.x;
        let y = point.y + depth * 0.16;
        g.lineStyle(1.7, P.ink, 0.42);
        g.moveTo(x, y);
        for (let step = 1; step <= 3; step++) {
            x += (hash(seed, idx, 60 + step) - 0.5) * 34;
            y += depth * (0.15 + hash(seed, idx, 64 + step) * 0.05);
            g.lineTo(x, y);
        }
        g.lineStyle(1, P.rose, 0.26);
        g.moveTo(point.x - 1.5, point.y + depth * 0.16);
        g.lineTo(x - 1.5, y);
    }

    // Darker lip and a narrow warm reflection above it.
    g.lineStyle(2.6, P.plumDeep, 0.95);
    for (let i = 0; i < arc.length; i++) {
        const point = arc[i];
        const x = point.x;
        const y = point.y + depths[i];
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
    }
    g.lineStyle(1.2, P.rose, 0.3);
    for (let i = 0; i < arc.length; i++) {
        const point = arc[i];
        const x = point.x;
        const y = point.y + depths[i] * 0.82;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
    }

    // Broken teeth hanging below the lip.
    for (let k = 0; k < 6; k++) {
        const idx = Math.min(arc.length - 1, Math.floor((0.08 + k * 0.17) * arc.length));
        const point = arc[idx];
        const baseY = point.y + depths[idx] * 0.74;
        const drop = depths[idx] * (0.26 + hash(seed, idx, 41) * 0.26);
        const half = 12 + hash(seed, idx, 42) * 19;
        const skew = (hash(seed, idx, 43) - 0.5) * 20;
        polygon(g, [
            [point.x - half, baseY],
            [point.x + half, baseY],
            [point.x + skew, baseY + drop]
        ], P.plumDeep, 0.96, P.ink, 1.2);
        g.lineStyle(1.4, P.wine, 0.6);
        g.moveTo(point.x - half, baseY);
        g.lineTo(point.x + skew, baseY + drop);
    }

    // Crystal veins and faceted growths.
    const veinSpots = [0.22, 0.48, 0.73, 0.87];
    for (let k = 0; k < veinSpots.length; k++) {
        const idx = Math.min(arc.length - 1, Math.floor(veinSpots[k] * (arc.length - 1)));
        const point = arc[idx];
        const topY = point.y + 4;
        const bottomY = point.y + depths[idx] * (0.55 + hash(seed, idx, 51) * 0.24);
        const bend = (hash(seed, idx, 52) - 0.5) * 30;
        const cool = k === 1 || k === 3;
        const baseColor = cool ? P.lavender : P.mint;
        const coreColor = cool ? P.paper : P.mintSoft;

        g.beginFill(baseColor, 0.1);
        g.lineStyle(0);
        g.drawEllipse(point.x + bend * 0.4, (topY + bottomY) / 2, 17, (bottomY - topY) * 0.55);
        g.endFill();

        g.lineStyle(5, baseColor, 0.4);
        g.moveTo(point.x, topY);
        g.lineTo(point.x + bend * 0.55, (topY + bottomY) * 0.5);
        g.lineTo(point.x + bend, bottomY);
        g.lineStyle(2, coreColor, 0.95);
        g.moveTo(point.x - 1, topY);
        g.lineTo(point.x + bend * 0.55 - 1, (topY + bottomY) * 0.5);
        g.lineTo(point.x + bend - 1, bottomY);

        drawCrystalShard(g, point.x + bend, bottomY, 12 + hash(seed, idx, 53) * 12, baseColor, coreColor);
    }

    // Crystal clusters growing from the lower lip.
    const crystalSpots = [0.3, 0.58, 0.82];
    for (let k = 0; k < crystalSpots.length; k++) {
        const idx = Math.min(arc.length - 1, Math.floor(crystalSpots[k] * arc.length));
        const point = arc[idx];
        const baseY = point.y + depths[idx] * (0.72 + hash(seed, idx, 55) * 0.1);
        g.beginFill(P.mint, 0.1);
        g.lineStyle(0);
        g.drawCircle(point.x, baseY + 12, 27);
        g.endFill();
        drawCrystalShard(g, point.x, baseY, 20 + hash(seed, idx, 56) * 12, P.mint, P.mintSoft);
        drawCrystalShard(g, point.x - 14, baseY + 5, 12 + hash(seed, idx, 57) * 8, P.lavender, P.paper);
        if (hash(seed, idx, 58) > 0.45) {
            drawCrystalShard(g, point.x + 15, baseY + 8, 11 + hash(seed, idx, 59) * 7, P.cyan, P.mintSoft);
        }
    }

    // Hanging cables and pipes from the underside.
    const anchors = [0.14, 0.32, 0.5, 0.69, 0.86];
    for (let k = 0; k < anchors.length; k++) {
        const idx = Math.min(arc.length - 1, Math.floor(anchors[k] * arc.length));
        const point = arc[idx];
        const baseY = point.y + depths[idx] * 0.2;
        if (k % 2 === 0) {
            drawHangingCable(g, point.x, baseY, depths[idx], seed + k * 17, k);
        } else {
            drawHangingPipe(g, point.x, baseY, depths[idx], seed + k * 23, k);
        }
    }
}

function fillJaggedCap(g, arc, depths, color, alpha, seed) {
    g.beginFill(color, alpha);
    g.lineStyle(0);
    for (let i = 0; i < arc.length; i++) {
        if (i === 0) g.moveTo(arc[i].x, arc[i].y);
        else g.lineTo(arc[i].x, arc[i].y);
    }
    for (let i = arc.length - 1; i >= 0; i--) {
        const t = 0.16 + hash(seed, i, 21) * 0.16 + (hash(seed, i, 22) > 0.7 ? 0.06 : 0);
        g.lineTo(arc[i].x, arc[i].y + depths[i] * t);
    }
    g.closePath();
    g.endFill();
}

function fillStrataBand(g, arc, depths, t0, t1, color, alpha, seed, salt) {
    g.beginFill(color, alpha);
    g.lineStyle(0);
    for (let i = 0; i < arc.length; i++) {
        const point = arc[i];
        const t = t0 + (hash(seed, i, salt) - 0.5) * 0.07;
        if (i === 0) g.moveTo(point.x, point.y + depths[i] * t);
        else g.lineTo(point.x, point.y + depths[i] * t);
    }
    for (let i = arc.length - 1; i >= 0; i--) {
        const point = arc[i];
        const t = t1 + (hash(seed, i, salt + 1) - 0.5) * 0.07;
        g.lineTo(point.x, point.y + depths[i] * t);
    }
    g.closePath();
    g.endFill();
}

function drawKeelPlates(g, arc, depths, spanX, seed) {
    for (let k = 0; k < 5; k++) {
        const idx = Math.min(arc.length - 1, Math.floor((0.1 + k * 0.2) * arc.length));
        const point = arc[idx];
        const depth = depths[idx];
        if (depth < 45) continue;

        const halfWidth = Math.min(spanX * 0.06, 65 + hash(seed, idx, 91) * 85);
        const lean = (hash(seed, idx, 92) - 0.5) * halfWidth * 0.55;
        const topY = point.y + depth * (0.1 + hash(seed, idx, 93) * 0.07);
        const bottomY = point.y + depth * (0.66 + hash(seed, idx, 94) * 0.16);
        const a = [point.x - halfWidth, topY + depth * 0.04];
        const b = [point.x + halfWidth, topY];
        const ridge = [point.x + lean, bottomY - depth * 0.16];
        const c = [point.x + lean * 1.15, bottomY];

        polygon(g, [a, b, c], P.plum, 1, P.ink, 1.3);
        polygon(g, [a, ridge, c], P.wine, 0.95);
        polygon(g, [b, ridge, c], P.plumDeep, 0.9);
        g.lineStyle(1.6, P.rose, 0.5);
        g.moveTo(ridge[0], ridge[1]);
        g.lineTo(c[0], c[1]);
        g.lineStyle(1.4, P.peach, 0.4);
        g.moveTo(a[0], a[1]);
        g.lineTo(c[0], c[1]);
    }
}

function drawKeelTips(g, arc, depths, seed) {
    let deepest = 0;
    for (let i = 1; i < arc.length; i++) {
        if (depths[i] > depths[deepest]) deepest = i;
    }
    const point = arc[deepest];
    const depth = depths[deepest];

    for (let k = 0; k < 3; k++) {
        const offset = (k - 1) * 102 + (hash(seed, k, 101) - 0.5) * 44;
        const baseY = point.y + depth * (0.78 + hash(seed, k, 102) * 0.08);
        const tipY = point.y + depth * (1.02 + hash(seed, k, 103) * 0.2);
        const halfWidth = 36 + hash(seed, k, 104) * 54;
        const skew = (hash(seed, k, 105) - 0.5) * 46;
        const a = [point.x + offset - halfWidth, baseY + 5];
        const b = [point.x + offset + halfWidth, baseY];
        const c = [point.x + offset + skew, tipY];
        const ridge = [point.x + offset + skew * 0.25, baseY + (tipY - baseY) * 0.4];

        polygon(g, [a, b, c], P.plum, 1, P.ink, 1.3);
        polygon(g, [a, ridge, c], P.wine, 0.42);
        polygon(g, [b, ridge, c], P.plumDeep, 0.72);
    }
}

function drawCrystalShard(g, x, y, size, baseColor, litColor) {
    const w = size * 0.5;
    const h = size * 1.5;
    const lean = size * 0.25;
    const tipX = x + lean;
    const tipY = y + h;
    const ridgeY = y - h * 0.14;

    polygon(g, [
        [x - w, y],
        [tipX, tipY],
        [x + lean * 0.3, ridgeY]
    ], litColor, 0.92, P.ink, 1);

    polygon(g, [
        [x + w, y],
        [tipX, tipY],
        [x + lean * 0.3, ridgeY]
    ], baseColor, 0.7);

    g.beginFill(P.cream, 0.9);
    g.lineStyle(0);
    g.drawCircle(tipX, tipY, Math.max(1, size * 0.1));
    g.endFill();
}

function drawHangingCable(g, x, y, depth, seed, index) {
    const sway = (hash(seed, index, 61) - 0.5) * depth * 0.55;
    const drop = depth * (0.6 + hash(seed, index, 62) * 0.6);
    const endX = x + sway * 1.3;
    const endY = y + drop;

    g.beginFill(P.plumDeep, 1);
    g.lineStyle(1, P.ink, 0.7);
    g.drawRoundedRect(x - 5, y - 3, 10, 7, 2);
    g.endFill();

    // Dark cable with a lit NW edge.
    g.lineStyle(4.2, P.plumDeep, 0.95);
    g.moveTo(x, y + 2);
    g.quadraticCurveTo(x + sway * 0.45, y + drop * 0.5, endX, endY);
    g.lineStyle(1.6, P.paperWarm, 0.5);
    g.moveTo(x - 1.6, y + 2);
    g.quadraticCurveTo(x + sway * 0.45 - 1.6, y + drop * 0.5, endX - 1.6, endY);

    // Small suspended service pod.
    g.beginFill(P.wine, 1);
    g.lineStyle(1, P.ink, 0.75);
    g.drawRoundedRect(endX - 6, endY - 2, 12, 15, 2.5);
    g.endFill();
    g.beginFill(P.paperWarm, 0.55);
    g.lineStyle(0);
    g.drawRoundedRect(endX - 4.4, endY - 0.4, 8.8, 3.6, 1.4);
    g.endFill();
    g.beginFill(P.sun, 0.75);
    g.lineStyle(0);
    g.drawCircle(endX, endY + 12, 2.2);
    g.endFill();
}

function drawHangingPipe(g, x, y, depth, seed, index) {
    const sway = (hash(seed, index, 71) - 0.5) * depth * 0.3;
    const drop = depth * (0.5 + hash(seed, index, 72) * 0.5);
    const endX = x + sway;
    const endY = y + drop;

    g.lineStyle(10, P.wine, 1);
    g.moveTo(x, y);
    g.lineTo(endX, endY);
    g.lineStyle(2.8, P.paperWarm, 0.6);
    g.moveTo(x - 2.4, y);
    g.lineTo(endX - 2.4, endY);
    g.lineStyle(1.8, P.plumDeep, 0.85);
    g.moveTo(x + 3.6, y);
    g.lineTo(endX + 3.6, endY);

    g.beginFill(P.plum, 1);
    g.lineStyle(1, P.ink, 0.75);
    g.drawEllipse(endX, endY, 11, 5);
    g.endFill();
    g.beginFill(P.sun, 0.8);
    g.lineStyle(0);
    g.drawCircle(endX + 6, endY + 1, 1.8);
    g.endFill();
}

function drawDriftingDebris(g, bounds, seed, keelDepth) {
    const baseY = bounds.maxY + keelDepth * 0.25;
    for (let i = 0; i < 5; i++) {
        const x = bounds.minX + (bounds.maxX - bounds.minX) * (0.12 + hash(seed, i, 81) * 0.76);
        const y = baseY + hash(seed, i, 82) * keelDepth * 0.8;
        const size = 2.5 + hash(seed, i, 83) * 4.5;
        g.beginFill(P.plum, 0.9);
        g.lineStyle(0);
        g.drawEllipse(x, y, size, size * 0.7);
        g.endFill();
        g.beginFill(P.paperWarm, 0.4);
        g.drawEllipse(x - size * 0.3, y - size * 0.3, size * 0.45, size * 0.22);
        g.endFill();
    }

    // One tumbling scrap with a lit and a shaded face.
    const sx = bounds.minX + (bounds.maxX - bounds.minX) * (0.2 + hash(seed, 7, 84) * 0.6);
    const sy = baseY + hash(seed, 8, 85) * keelDepth * 0.55;
    polygon(g, [
        [sx - 6, sy + 2],
        [sx - 2, sy - 4],
        [sx + 7, sy - 1],
        [sx + 3, sy + 4]
    ], P.wine, 0.95, P.ink, 1);
    g.lineStyle(1.2, P.paperWarm, 0.6);
    g.moveTo(sx - 2, sy - 4);
    g.lineTo(sx + 7, sy - 1);
}

/* ------------------------------------------------------------------ */
/* Top surface                                                         */
/* ------------------------------------------------------------------ */

function drawTopSurface(g, shape, centerX, centerY, bounds, seed, gridSize, tileWidth, tileHeight) {
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

function drawRegolithFlecks(g, shape, centerX, centerY, spanX, spanY, seed, halfGridW, halfGridH, color, alpha, count, shift) {
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

function drawRimLight(g, shape, centerX, centerY) {
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

function strokeSegments(g, segments, width, color, alpha) {
    if (segments.length === 0) return;
    g.lineStyle(width, color, alpha);
    for (let i = 0; i < segments.length; i++) {
        g.moveTo(segments[i][0].x, segments[i][0].y);
        g.lineTo(segments[i][1].x, segments[i][1].y);
    }
}

/* ------------------------------------------------------------------ */
/* Build grid                                                          */
/* ------------------------------------------------------------------ */

function drawGrid(g, centerX, centerY, gridSize, tileWidth, tileHeight) {
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

function chalkLine(g, x0, y0, x1, y1, seedA, seedB) {
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

/* ------------------------------------------------------------------ */
/* Vacuum-safe dressing outside the build grid                         */
/* ------------------------------------------------------------------ */

function drawProps(g, shape, centerX, centerY, seed, gridSize, tileWidth, tileHeight) {
    const halfGridW = (gridSize * tileWidth) / 2;
    const halfGridH = (gridSize * tileHeight) / 2;
    const unit = tileHeight / 256;
    const scale = unit * (1.55 + gridSize * 0.4);
    const target = Math.min(22, 12 + Math.round(gridSize * 2.5));
    const kinds = [
        'rock', 'coral', 'crate', 'antenna', 'pebbles', 'crater',
        'dust', 'pipe', 'solar', 'memorial', 'radiator', 'cable',
        'warning', 'pod', 'dish', 'beacon', 'rock', 'coral'
    ];
    const props = [];

    for (let i = 0; i < 240 && props.length < target; i++) {
        const edge = shape[Math.floor(hash(seed, i, 101) * shape.length) % shape.length];
        const inset = 0.07 + hash(seed, i, 102) * 0.15;
        let x = edge.x + (centerX - edge.x) * inset;
        let y = edge.y + (centerY - edge.y) * inset;
        x += (hash(seed, i, 103) - 0.5) * 26;
        y += (hash(seed, i, 104) - 0.5) * 18;

        if (!pointInPolygon(x, y, shape)) continue;
        if (inGridDiamond(x, y, centerX, centerY, halfGridW, halfGridH, 1.1)) continue;

        const minGap = (i < 160 ? 96 : 60) * scale;
        let crowded = false;
        for (let p = 0; p < props.length; p++) {
            if (Math.hypot(props[p].x - x, props[p].y - y) < minGap) {
                crowded = true;
                break;
            }
        }
        if (crowded) continue;

        const kind = kinds[(i * 5 + Math.floor(hash(seed, i, 105) * kinds.length)) % kinds.length];
        props.push({
            x,
            y,
            kind,
            scale: scale * (0.82 + hash(seed, i, 106) * 0.4),
            roll: hash(seed, i, 107)
        });
    }

    const outcropFractions = [0.12, 0.32, 0.52, 0.72, 0.9];
    for (let k = 0; k < outcropFractions.length; k++) {
        const index = Math.floor(outcropFractions[k] * shape.length) % shape.length;
        const edge = shape[index];
        props.push({
            x: centerX + (edge.x - centerX) * 0.965,
            y: centerY + (edge.y - centerY) * 0.965,
            kind: 'outcrop',
            scale: scale * (0.85 + hash(seed, k, 201) * 0.7),
            roll: hash(seed, k, 202)
        });
    }

    for (let i = 0; i < props.length; i++) {
        drawProp(g, props[i]);
    }
}

function drawRimOutcrop(g, x, y, s, roll) {
    // A chunky rock spur that breaks the smooth rim and sells the shard.
    contactShadow(g, x + 6 * s, y + 4 * s, 30 * s, 9 * s, 0.18);
    drawBoulder(g, x + 15 * s, y - 2 * s, s * 0.72);
    drawBoulder(g, x - 4 * s, y + 2 * s, s * 1.02);

    // A dark fracture running out over the edge.
    polygon(g, [
        [x - 22 * s, y + 7 * s],
        [x + 4 * s, y + 10 * s],
        [x + 26 * s, y + 4 * s],
        [x + 8 * s, y + 13 * s]
    ], P.plumDeep, 0.9, P.ink, 1.1 * s);

    // A lit chip on the north-west side.
    polygon(g, [
        [x - 24 * s, y - 1 * s],
        [x - 12 * s, y - 11 * s],
        [x - 4 * s, y - 3 * s]
    ], P.peach, 0.68);

    if (roll > 0.5) {
        g.beginFill(P.mint, 0.55);
        g.lineStyle(0);
        g.drawCircle(x + 18 * s, y + 6 * s, 1.5 * s);
        g.endFill();
    }
}

function drawProp(g, prop) {
    const x = prop.x;
    const y = prop.y;
    const s = prop.scale;
    const roll = prop.roll;
    switch (prop.kind) {
        case 'rock':
            drawRockCluster(g, x, y, s, roll);
            break;
        case 'outcrop':
            drawRimOutcrop(g, x, y, s, roll);
            break;
        case 'coral':
            drawVoidCoral(g, x, y, s, roll);
            break;
        case 'crate':
            drawCrate(g, x, y, s, roll);
            break;
        case 'pod':
            drawCargoPod(g, x, y, s, roll);
            break;
        case 'antenna':
            drawAntenna(g, x, y, s, roll);
            break;
        case 'dish':
            drawDish(g, x, y, s, roll);
            break;
        case 'solar':
            drawSolarFin(g, x, y, s, roll);
            break;
        case 'radiator':
            drawRadiator(g, x, y, s, roll);
            break;
        case 'pebbles':
            drawPebbles(g, x, y, s, roll);
            break;
        case 'crater':
            drawCrater(g, x, y, s);
            break;
        case 'dust':
            drawDustDrift(g, x, y, s);
            break;
        case 'pipe':
            drawPipeStump(g, x, y, s, roll);
            break;
        case 'cable':
            drawCableCoil(g, x, y, s, roll);
            break;
        case 'warning':
            drawWarningStripes(g, x, y, s);
            break;
        case 'memorial':
            drawMemorial(g, x, y, s, roll);
            break;
        case 'beacon':
            drawBeacon(g, x, y, s);
            break;
        default:
            drawRockCluster(g, x, y, s, roll);
            break;
    }
}

function drawBoulder(g, x, y, s) {
    g.beginFill(P.wine, 1);
    g.lineStyle(1.3 * s, P.ink, 0.75);
    g.moveTo(x - 16 * s, y + 3 * s);
    g.lineTo(x - 12 * s, y - 8 * s);
    g.lineTo(x - 3 * s, y - 14 * s);
    g.lineTo(x + 9 * s, y - 10 * s);
    g.lineTo(x + 15 * s, y + 1 * s);
    g.lineTo(x + 5 * s, y + 5 * s);
    g.closePath();
    g.endFill();

    // Lit north-west facet.
    g.beginFill(P.peach, 0.85);
    g.lineStyle(0);
    g.moveTo(x - 12 * s, y - 8 * s);
    g.lineTo(x - 3 * s, y - 14 * s);
    g.lineTo(x + 2 * s, y - 6 * s);
    g.lineTo(x - 7 * s, y - 2 * s);
    g.closePath();
    g.endFill();

    // Shaded south-east facet.
    g.beginFill(P.plumDeep, 0.9);
    g.lineStyle(0);
    g.moveTo(x + 9 * s, y - 10 * s);
    g.lineTo(x + 15 * s, y + 1 * s);
    g.lineTo(x + 5 * s, y + 5 * s);
    g.lineTo(x + 2 * s, y - 6 * s);
    g.closePath();
    g.endFill();

    g.lineStyle(1.2 * s, P.cream, 0.5);
    g.moveTo(x - 3 * s, y - 14 * s);
    g.lineTo(x + 9 * s, y - 10 * s);
}

function drawRockCluster(g, x, y, s, roll) {
    contactShadow(g, x + 8 * s, y + 4 * s, 22 * s, 7 * s, 0.22);
    if (roll > 0.42) {
        drawBoulder(g, x + 16 * s, y - 4 * s, s * 0.6);
    }
    drawBoulder(g, x, y, s);
}

function drawPebbles(g, x, y, s, roll) {
    const offsets = [
        [0, 0, 1],
        [-14, 5, 0.72],
        [12, 7, 0.58]
    ];
    for (let i = 0; i < offsets.length; i++) {
        const f = 0.6 + hash(roll * 97, i, 3) * 0.55;
        const px = x + offsets[i][0] * s;
        const py = y + offsets[i][1] * s;
        const r = 6 * s * offsets[i][2] * f;
        g.beginFill(P.plumDeep, 0.2);
        g.lineStyle(0);
        g.drawEllipse(px + 3 * s, py + 2 * s, r * 1.3, r * 0.5);
        g.endFill();
        g.beginFill(P.rose, 0.85);
        g.lineStyle(1 * s, P.ink, 0.55);
        g.drawEllipse(px, py, r, r * 0.62);
        g.endFill();
        g.beginFill(P.peach, 0.7);
        g.lineStyle(0);
        g.drawEllipse(px - r * 0.3, py - r * 0.22, r * 0.42, r * 0.2);
        g.endFill();
    }
}

function drawCrater(g, x, y, s) {
    contactShadow(g, x + 13 * s, y + 5 * s, 24 * s, 8 * s, 0.16);

    g.beginFill(P.paperWarm, 0.95);
    g.lineStyle(1.2 * s, P.ink, 0.3);
    g.drawEllipse(x, y, 24 * s, 9 * s);
    g.endFill();

    g.beginFill(P.wine, 0.72);
    g.lineStyle(1 * s, P.ink, 0.4);
    g.drawEllipse(x + 2 * s, y + 1 * s, 17 * s, 6 * s);
    g.endFill();

    g.beginFill(P.plumDeep, 0.78);
    g.lineStyle(0);
    g.drawEllipse(x + 4 * s, y + 2 * s, 11 * s, 3.6 * s);
    g.endFill();

    // Lit north-west rim.
    g.lineStyle(1.6 * s, P.cream, 0.8);
    g.moveTo(x - 21 * s, y - 1.5 * s);
    g.quadraticCurveTo(x - 10 * s, y - 8 * s, x + 2 * s, y - 8.5 * s);

    // Shaded south-east rim.
    g.lineStyle(1.4 * s, P.plumDeep, 0.5);
    g.moveTo(x + 3 * s, y + 8.5 * s);
    g.quadraticCurveTo(x + 14 * s, y + 6.5 * s, x + 22 * s, y + 1 * s);
}

function drawDustDrift(g, x, y, s) {
    contactShadow(g, x + 8 * s, y + 4 * s, 26 * s, 7 * s, 0.12);

    g.beginFill(P.paperWarm, 0.9);
    g.lineStyle(0);
    g.drawEllipse(x, y, 26 * s, 7.5 * s);
    g.endFill();

    g.beginFill(P.cream, 0.55);
    g.drawEllipse(x - 7 * s, y - 2.2 * s, 13 * s, 3.2 * s);
    g.endFill();

    g.beginFill(P.wine, 0.1);
    g.drawEllipse(x + 8 * s, y + 3 * s, 16 * s, 3 * s);
    g.endFill();

    g.lineStyle(1 * s, P.ink, 0.12);
    g.moveTo(x - 17 * s, y + 1 * s);
    g.quadraticCurveTo(x - 5 * s, y - 2 * s, x + 8 * s, y + 1 * s);
    g.moveTo(x - 12 * s, y + 4 * s);
    g.quadraticCurveTo(x, y + 1.5 * s, x + 14 * s, y + 4 * s);
}

function drawVoidCoral(g, x, y, s, roll) {
    contactShadow(g, x + 6 * s, y + 3 * s, 19 * s, 6 * s, 0.2);

    g.beginFill(P.mint, 0.1);
    g.lineStyle(0);
    g.drawCircle(x, y - 10 * s, 25 * s);
    g.endFill();
    g.beginFill(P.lavender, 0.08);
    g.drawCircle(x + 6 * s, y - 6 * s, 17 * s);
    g.endFill();

    const shards = [
        { dx: 0, dy: 0, h: 25, w: 7, lean: 3 },
        { dx: -10, dy: 2, h: 16, w: 5, lean: -4 },
        { dx: 9, dy: 3, h: 19, w: 5.5, lean: 5 },
        { dx: 2, dy: 4, h: 10, w: 4, lean: 1 }
    ];

    for (let i = 0; i < shards.length; i++) {
        const shard = shards[i];
        const bx = x + shard.dx * s + (hash(roll * 61, i, 5) - 0.5) * 3 * s;
        const by = y + shard.dy * s;
        const h = shard.h * s;
        const w = shard.w * s;
        const lean = shard.lean * s;
        const baseColor = i % 2 === 0 ? P.mint : P.cyan;
        const tipY = by - h;

        // Lit north-west facet.
        polygon(g, [
            [bx - w, by],
            [bx + lean, tipY],
            [bx + lean * 0.3, by + 3 * s]
        ], P.mintSoft, 0.95, P.ink, 1);

        // Shaded south-east facet.
        polygon(g, [
            [bx + w, by],
            [bx + lean, tipY],
            [bx + lean * 0.3, by + 3 * s]
        ], baseColor, 0.62, P.ink, 1);

        g.beginFill(P.cream, 0.9);
        g.lineStyle(0);
        g.drawCircle(bx + lean, tipY, 1.3 * s);
        g.endFill();
    }

    // Faceted rubble base: a lit chip and a shaded chip.
    polygon(g, [
        [x - 17 * s, y + 4 * s],
        [x - 10 * s, y - 2 * s],
        [x - 4 * s, y + 5 * s]
    ], P.mintSoft, 0.55, P.ink, 1);
    polygon(g, [
        [x - 4 * s, y + 5 * s],
        [x - 10 * s, y - 2 * s],
        [x + 2 * s, y + 6 * s]
    ], P.plumDeep, 0.7, P.ink, 1);

    g.beginFill(P.mint, 0.9);
    g.lineStyle(0);
    g.drawCircle(x + 14 * s, y + 3 * s, 1.7 * s);
    g.drawCircle(x - 15 * s, y + 1 * s, 1.2 * s);
    g.endFill();
}

function drawCrate(g, x, y, s, roll) {
    const w = 14 * s;
    const h = 16 * s;
    const d = 8 * s;
    const topY = y - h;

    contactShadow(g, x + 8 * s, y + d + 2 * s, 20 * s, 6 * s, 0.2);

    // Shaded south-east face.
    polygon(g, [
        [x, topY + d],
        [x + w, topY],
        [x + w, y],
        [x, y + d]
    ], P.plumDeep, 1, P.ink, 1.2 * s);

    // Warm north-west face.
    polygon(g, [
        [x - w, topY],
        [x, topY + d],
        [x, y + d],
        [x - w, y]
    ], P.wine, 1, P.ink, 1.2 * s);

    // Lit top plate.
    polygon(g, [
        [x, topY - d],
        [x + w, topY],
        [x, topY + d],
        [x - w, topY]
    ], P.paperWarm, 1, P.ink, 1.2 * s);

    polygon(g, [
        [x, topY - d],
        [x - w, topY],
        [x, topY + d * 0.2]
    ], P.cream, 0.55);

    if (roll > 0.35) {
        // Hazard band on the lit face.
        polygon(g, [
            [x - w, y - h * 0.5],
            [x, y - h * 0.5 + d],
            [x, y - h * 0.5 + d + 5 * s],
            [x - w, y - h * 0.5 + 5 * s]
        ], P.sun, 0.9);
        g.lineStyle(1.2 * s, P.plumDeep, 0.55);
        for (let i = 0; i < 3; i++) {
            const t = i / 3;
            g.moveTo(x - w + 7 * s + 5 * s * t, y - h * 0.5 - 4 * s);
            g.lineTo(x - w + 11 * s + 5 * s * t, y - h * 0.5 + 1 * s);
        }
    }

    // Latch and a tiny mint status light.
    g.beginFill(P.ink, 0.5);
    g.lineStyle(0);
    g.drawRoundedRect(x + 3 * s, y - h * 0.55, 3 * s, 6 * s, 1 * s);
    g.endFill();
    g.beginFill(P.mint, 0.9);
    g.drawCircle(x + 10 * s, topY + 7 * s, 1.4 * s);
    g.endFill();
}

function drawCargoPod(g, x, y, s, roll) {
    const w = 20 * s;
    const h = 10 * s;

    contactShadow(g, x + 6 * s, y + 3 * s, 24 * s, 6 * s, 0.2);

    g.beginFill(P.wine, 1);
    g.lineStyle(1.3 * s, P.ink, 0.75);
    g.drawRoundedRect(x - w, y - h * 2, w * 2, h * 2, h * 0.85);
    g.endFill();

    // Lit upper shell.
    g.beginFill(P.paperWarm, 0.4);
    g.lineStyle(0);
    g.drawRoundedRect(x - w * 0.9, y - h * 1.8, w * 1.8, h * 0.7, h * 0.35);
    g.endFill();

    // Shaded lower shell.
    g.beginFill(P.plumDeep, 0.55);
    g.drawRoundedRect(x - w * 0.9, y - h * 0.25, w * 1.8, h * 0.85, h * 0.4);
    g.endFill();

    // Strapping and a lit port.
    g.lineStyle(1.4 * s, P.sun, 0.7);
    g.moveTo(x - w * 0.25, y - h * 1.9);
    g.lineTo(x - w * 0.25, y - h * 0.1);
    g.beginFill(P.mint, 0.95);
    g.lineStyle(1 * s, P.ink, 0.6);
    g.drawCircle(x + w * 0.45, y - h * 1.35, 2 * s);
    g.endFill();

    // Feet.
    g.lineStyle(2 * s, P.ink, 0.8);
    g.moveTo(x - w * 0.55, y);
    g.lineTo(x - w * 0.72, y + h * 0.6);
    g.moveTo(x + w * 0.55, y);
    g.lineTo(x + w * 0.72, y + h * 0.6);

    if (roll > 0.6) {
        g.beginFill(P.sun, 0.8);
        g.lineStyle(0);
        g.drawCircle(x - w * 0.45, y - h * 1.2, 1.4 * s);
        g.endFill();
    }
}

function drawAntenna(g, x, y, s, roll) {
    const height = (42 + roll * 32) * s;

    contactShadow(g, x + 11 * s, y + 2 * s, 18 * s, 5 * s, 0.18);

    // Guy wires.
    g.lineStyle(1 * s, P.ink, 0.35);
    g.moveTo(x + 2 * s, y + 1 * s);
    g.lineTo(x + 18 * s, y + 6 * s);
    g.moveTo(x - 2 * s, y + 1 * s);
    g.lineTo(x - 16 * s, y + 6 * s);

    // Mast: dark body, lit north-west edge.
    g.lineStyle(4 * s, P.plumDeep, 1);
    g.moveTo(x, y);
    g.lineTo(x, y - height);
    g.lineStyle(1.4 * s, P.paperWarm, 0.65);
    g.moveTo(x - 1.3 * s, y);
    g.lineTo(x - 1.3 * s, y - height);

    // Crossbar.
    g.lineStyle(2.2 * s, P.wine, 0.9);
    g.moveTo(x - 12 * s, y - height * 0.62);
    g.lineTo(x + 12 * s, y - height * 0.62);
    g.lineStyle(1 * s, P.paperWarm, 0.6);
    g.moveTo(x - 12 * s, y - height * 0.62 - 1.4 * s);
    g.lineTo(x + 12 * s, y - height * 0.62 - 1.4 * s);

    // Small dish and beacon.
    g.beginFill(P.wine, 1);
    g.lineStyle(1 * s, P.ink, 0.7);
    g.drawEllipse(x, y - height - 3 * s, 8 * s, 4 * s);
    g.endFill();
    g.beginFill(P.paperWarm, 0.6);
    g.lineStyle(0);
    g.drawEllipse(x - 1.6 * s, y - height - 4 * s, 4 * s, 1.8 * s);
    g.endFill();
    g.beginFill(P.plumDeep, 0.6);
    g.drawEllipse(x + 4 * s, y - height - 2 * s, 2.5 * s, 1.2 * s);
    g.endFill();

    g.beginFill(P.sun, 0.18);
    g.drawCircle(x, y - height - 9 * s, 6 * s);
    g.endFill();
    g.beginFill(P.sun, 0.95);
    g.drawCircle(x, y - height - 9 * s, 2.3 * s);
    g.endFill();
}

function drawDish(g, x, y, s, roll) {
    const bowlY = y - 27 * s;
    const tilt = (roll - 0.5) * 5 * s;

    contactShadow(g, x + 9 * s, y + 2 * s, 20 * s, 5 * s, 0.18);

    // Tripod legs: dark with a lit north-west leg.
    g.lineStyle(2 * s, P.ink, 0.8);
    g.moveTo(x - 7 * s, y);
    g.lineTo(x, bowlY + 9 * s);
    g.moveTo(x + 7 * s, y);
    g.lineTo(x, bowlY + 9 * s);
    g.moveTo(x, y);
    g.lineTo(x, bowlY + 9 * s);
    g.lineStyle(1 * s, P.paperWarm, 0.5);
    g.moveTo(x - 7.5 * s, y);
    g.lineTo(x - 1 * s, bowlY + 9 * s);

    // Pedestal.
    polygon(g, [
        [x - 4 * s, bowlY + 10 * s],
        [x + 4 * s, bowlY + 10 * s],
        [x + 3 * s, bowlY + 3 * s],
        [x - 3 * s, bowlY + 3 * s]
    ], P.plum, 1, P.ink, 1);

    // Bowl: dark shell, lit inner face, shaded south-east rim.
    g.beginFill(P.wine, 1);
    g.lineStyle(1.2 * s, P.ink, 0.7);
    g.drawEllipse(x + tilt, bowlY, 18 * s, 9 * s);
    g.endFill();
    g.beginFill(P.paperWarm, 0.68);
    g.lineStyle(0);
    g.drawEllipse(x + tilt - 4 * s, bowlY - 2 * s, 10 * s, 3.6 * s);
    g.endFill();
    g.beginFill(P.plumDeep, 0.45);
    g.drawEllipse(x + tilt + 8 * s, bowlY + 2 * s, 6 * s, 2.2 * s);
    g.endFill();
    g.lineStyle(1.4 * s, P.cream, 0.55);
    g.moveTo(x + tilt - 17 * s, bowlY - 1.5 * s);
    g.quadraticCurveTo(x + tilt, bowlY - 10 * s, x + tilt + 16 * s, bowlY - 2 * s);

    // Feed arm.
    g.lineStyle(1.4 * s, P.paperWarm, 0.9);
    g.moveTo(x + tilt - 8 * s, bowlY - 7 * s);
    g.lineTo(x + tilt, bowlY - 17 * s);
    g.beginFill(P.sun, 0.95);
    g.lineStyle(0);
    g.drawCircle(x + tilt, bowlY - 17 * s, 2 * s);
    g.endFill();
}

function drawSolarFin(g, x, y, s, roll) {
    const height = (32 + roll * 16) * s;
    const topY = y - height;

    contactShadow(g, x + 10 * s, y + 2 * s, 18 * s, 5 * s, 0.18);

    // Support strut.
    g.lineStyle(3 * s, P.ink, 0.85);
    g.moveTo(x, y);
    g.lineTo(x, topY);
    g.lineStyle(1.2 * s, P.paperWarm, 0.55);
    g.moveTo(x - 1.3 * s, y);
    g.lineTo(x - 1.3 * s, topY);

    // Panel slab: dark body with a lit north-west sheen.
    polygon(g, [
        [x - 4 * s, topY + 10 * s],
        [x + 20 * s, topY - 2 * s],
        [x + 26 * s, topY + 14 * s],
        [x + 2 * s, topY + 24 * s]
    ], P.plum, 1, P.ink, 1.2 * s);
    polygon(g, [
        [x - 4 * s, topY + 10 * s],
        [x + 20 * s, topY - 2 * s],
        [x + 11 * s, topY + 8 * s],
        [x + 4 * s, topY + 15 * s]
    ], P.cyan, 0.24);
    polygon(g, [
        [x + 2 * s, topY + 24 * s],
        [x + 26 * s, topY + 14 * s],
        [x + 18 * s, topY + 17 * s],
        [x + 8 * s, topY + 22 * s]
    ], P.plumDeep, 0.65);

    // Cell lines.
    g.lineStyle(1 * s, P.mintSoft, 0.32);
    for (let i = 1; i < 4; i++) {
        const t = i / 4;
        g.moveTo(x - 4 * s + 24 * s * t, topY + 10 * s - 12 * s * t);
        g.lineTo(x + 2 * s + 24 * s * t, topY + 24 * s - 10 * s * t);
    }

    // Sun glint along the lit top edge.
    g.lineStyle(1.4 * s, P.cream, 0.8);
    g.moveTo(x - 4 * s, topY + 10 * s);
    g.lineTo(x + 20 * s, topY - 2 * s);
}

function drawRadiator(g, x, y, s, roll) {
    const height = (26 + roll * 12) * s;

    contactShadow(g, x + 8 * s, y + 2 * s, 18 * s, 5 * s, 0.16);

    for (let i = 0; i < 3; i++) {
        const fx = x + (i - 1) * 10 * s;
        const top = y - height - (i === 1 ? 4 * s : 0);
        polygon(g, [
            [fx - 4 * s, y],
            [fx - 3 * s, top],
            [fx + 3 * s, top + 2 * s],
            [fx + 4 * s, y]
        ], P.plum, 1, P.ink, 1);
        polygon(g, [
            [fx - 4 * s, y],
            [fx - 3 * s, top],
            [fx - 1 * s, top + 1 * s],
            [fx - 2 * s, y]
        ], P.peach, 0.5);
        polygon(g, [
            [fx + 4 * s, y],
            [fx + 3 * s, top + 2 * s],
            [fx + 1 * s, top + 1 * s],
            [fx + 2 * s, y]
        ], P.plumDeep, 0.7);
        g.lineStyle(1.1 * s, P.coral, 0.5);
        g.moveTo(fx - 2 * s, y - height * 0.35);
        g.lineTo(fx + 2 * s, y - height * 0.35);
    }

    // Manifold at the base with a lit top edge.
    g.lineStyle(3 * s, P.wine, 0.9);
    g.moveTo(x - 16 * s, y + 1 * s);
    g.lineTo(x + 16 * s, y + 1 * s);
    g.lineStyle(1 * s, P.paperWarm, 0.55);
    g.moveTo(x - 15 * s, y - 0.6 * s);
    g.lineTo(x + 15 * s, y - 0.6 * s);
}

function drawPipeStump(g, x, y, s, roll) {
    contactShadow(g, x + 5 * s, y + 5 * s, 20 * s, 5 * s, 0.18);

    // Pipe body lying on the regolith.
    g.lineStyle(9 * s, P.wine, 1);
    g.moveTo(x - 16 * s, y - 2 * s);
    g.lineTo(x + 12 * s, y - 8 * s);
    g.lineStyle(2.4 * s, P.paperWarm, 0.7);
    g.moveTo(x - 16 * s, y - 6 * s);
    g.lineTo(x + 12 * s, y - 12 * s);
    g.lineStyle(1.4 * s, P.plumDeep, 0.85);
    g.moveTo(x - 16 * s, y + 3 * s);
    g.lineTo(x + 12 * s, y - 3 * s);

    // Flange.
    g.beginFill(P.plum, 1);
    g.lineStyle(1.2 * s, P.ink, 0.8);
    g.drawEllipse(x + 13 * s, y - 9 * s, 4 * s, 9 * s);
    g.endFill();
    g.beginFill(P.wine, 1);
    g.drawEllipse(x + 13 * s, y - 9 * s, 2 * s, 5 * s);
    g.endFill();

    // Pressure light and a valve wheel.
    g.beginFill(P.mint, 0.9);
    g.lineStyle(1 * s, P.ink, 0.6);
    g.drawCircle(x - 4 * s, y - 12 * s, 1.8 * s);
    g.endFill();
    g.lineStyle(1.2 * s, P.sun, 0.6);
    g.drawCircle(x - 8 * s, y - 4 * s, 3 * s);

    if (roll > 0.55) {
        g.lineStyle(1 * s, P.ink, 0.3);
        g.moveTo(x - 13 * s, y + 2 * s);
        g.lineTo(x - 3 * s, y + 4 * s);
    }
}

function drawCableCoil(g, x, y, s, roll) {
    contactShadow(g, x + 7 * s, y + 3 * s, 17 * s, 5 * s, 0.18);

    for (let i = 0; i < 3; i++) {
        const r = (9 + i * 4) * s;
        g.lineStyle(2.2 * s, P.ink, 0.85);
        g.drawEllipse(x, y - 4 * s + i * 2 * s, r, r * 0.45);
    }
    g.lineStyle(1 * s, P.paperWarm, 0.55);
    g.drawEllipse(x - 1.5 * s, y - 6 * s, 11 * s, 4.5 * s);

    // Connector block: lit north-west face, shaded south-east face.
    polygon(g, [
        [x + 6 * s, y + 2 * s],
        [x + 14 * s, y - 4 * s],
        [x + 17 * s, y + 2 * s],
        [x + 9 * s, y + 8 * s]
    ], P.wine, 1, P.ink, 1);
    g.lineStyle(1.2 * s, P.paperWarm, 0.6);
    g.moveTo(x + 6 * s, y + 2 * s);
    g.lineTo(x + 14 * s, y - 4 * s);
    g.lineStyle(1.6 * s, P.plumDeep, 0.7);
    g.moveTo(x + 9 * s, y + 8 * s);
    g.lineTo(x + 17 * s, y + 2 * s);

    if (roll > 0.5) {
        g.beginFill(P.sun, 0.8);
        g.lineStyle(0);
        g.drawCircle(x + 12 * s, y + 2 * s, 1.3 * s);
        g.endFill();
    }
}

function drawWarningStripes(g, x, y, s) {
    // Hazard plate with a lit north-west edge and a shaded south-east edge.
    polygon(g, [
        [x - 22 * s, y - 5 * s],
        [x + 20 * s, y - 9 * s],
        [x + 24 * s, y + 3 * s],
        [x - 18 * s, y + 7 * s]
    ], P.sun, 0.92, P.ink, 1.2);

    for (let i = 0; i < 4; i++) {
        const bx = x - 16 * s + i * 9 * s;
        polygon(g, [
            [bx, y - 5 * s],
            [bx + 4 * s, y - 5.8 * s],
            [bx + 1 * s, y + 5.6 * s],
            [bx - 3 * s, y + 5 * s]
        ], P.ink, 0.55);
    }

    g.lineStyle(1.6 * s, P.cream, 0.8);
    g.moveTo(x - 22 * s, y - 5 * s);
    g.lineTo(x + 20 * s, y - 9 * s);
    g.lineStyle(1.2 * s, P.plumDeep, 0.55);
    g.moveTo(x + 24 * s, y + 3 * s);
    g.lineTo(x - 18 * s, y + 7 * s);

    // Two low marker posts.
    g.lineStyle(2.2 * s, P.ink, 0.8);
    g.moveTo(x - 23 * s, y - 6 * s);
    g.lineTo(x - 26 * s, y - 16 * s);
    g.moveTo(x + 21 * s, y - 8 * s);
    g.lineTo(x + 24 * s, y - 18 * s);
    g.beginFill(P.sun, 0.9);
    g.lineStyle(0);
    g.drawCircle(x - 26 * s, y - 16 * s, 1.6 * s);
    g.drawCircle(x + 24 * s, y - 18 * s, 1.6 * s);
    g.endFill();
}

function drawMemorial(g, x, y, s, roll) {
    contactShadow(g, x + 6 * s, y + 2 * s, 18 * s, 5 * s, 0.2);

    // Upright slab: warm north-west face, deep south-east face.
    polygon(g, [
        [x - 9 * s, y],
        [x - 8 * s, y - 30 * s],
        [x + 2 * s, y - 34 * s],
        [x + 9 * s, y - 27 * s],
        [x + 7 * s, y + 1 * s]
    ], P.plum, 1, P.ink, 1.2 * s);

    polygon(g, [
        [x - 9 * s, y],
        [x - 8 * s, y - 30 * s],
        [x - 1 * s, y - 32 * s],
        [x - 3 * s, y + 1 * s]
    ], P.paperWarm, 0.42);

    polygon(g, [
        [x + 9 * s, y - 27 * s],
        [x + 7 * s, y + 1 * s],
        [x + 1 * s, y + 2 * s],
        [x + 1 * s, y - 31 * s]
    ], P.plumDeep, 0.65);

    // Etched memorial lines.
    g.lineStyle(1 * s, P.ink, 0.4);
    for (let i = 0; i < 3; i++) {
        const gy = y - 22 * s + i * 4 * s;
        g.moveTo(x - 6 * s, gy);
        g.lineTo(x - 1 * s, gy - 1 * s);
    }
    g.lineStyle(1.2 * s, P.rose, 0.5);
    g.moveTo(x - 1 * s, y - 28 * s);
    g.lineTo(x + 5 * s, y - 29 * s);

    // Offering candle and shrine bowl.
    g.beginFill(P.sun, 0.16);
    g.lineStyle(0);
    g.drawCircle(x - 14 * s, y - 1 * s, 6 * s);
    g.endFill();
    g.beginFill(P.sun, 0.95);
    g.drawCircle(x - 14 * s, y - 1 * s, 2 * s);
    g.endFill();
    g.beginFill(P.wine, 1);
    g.lineStyle(1 * s, P.ink, 0.6);
    g.drawEllipse(x - 14 * s, y + 3 * s, 6 * s, 2.2 * s);
    g.endFill();

    if (roll > 0.55) {
        g.lineStyle(1.2 * s, P.mint, 0.55);
        g.moveTo(x - 10 * s, y - 4 * s);
        g.lineTo(x - 8 * s, y - 16 * s);
    }
}

function drawBeacon(g, x, y, s) {
    // Warm light pool on the regolith.
    g.beginFill(P.sun, 0.12);
    g.lineStyle(0);
    g.drawEllipse(x - 6 * s, y - 2 * s, 24 * s, 8 * s);
    g.endFill();
    contactShadow(g, x + 5 * s, y + 2 * s, 10 * s, 3 * s, 0.18);

    // Post with a lit north-west edge.
    g.lineStyle(4 * s, P.plumDeep, 1);
    g.moveTo(x, y);
    g.lineTo(x, y - 20 * s);
    g.lineStyle(1.4 * s, P.paperWarm, 0.6);
    g.moveTo(x - 1.5 * s, y);
    g.lineTo(x - 1.5 * s, y - 20 * s);

    // Lamp.
    g.beginFill(P.sun, 0.18);
    g.lineStyle(0);
    g.drawCircle(x, y - 23 * s, 9 * s);
    g.endFill();
    g.beginFill(P.sun, 0.95);
    g.lineStyle(1 * s, P.ink, 0.6);
    g.drawCircle(x, y - 23 * s, 3.4 * s);
    g.endFill();
    g.beginFill(P.cream, 0.8);
    g.drawCircle(x - 1 * s, y - 24.4 * s, 1.2 * s);
    g.endFill();

    // Foot.
    g.beginFill(P.wine, 1);
    g.lineStyle(1 * s, P.ink, 0.7);
    g.drawEllipse(x, y + 1 * s, 6 * s, 2 * s);
    g.endFill();
}
