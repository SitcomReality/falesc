/* Void shadow, underside keel and hanging keel details. */
import { P } from './SectorPalette.js';
import { fillBand, frontArc, hash, polygon, traceShape } from './SectorPrimitives.js';

export function drawVoidShadow(g, shape, centerX, centerY, keelDepth) {
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


export function drawUnderside(g, shape, centerX, centerY, bounds, seed, keelDepth) {
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


export function fillJaggedCap(g, arc, depths, color, alpha, seed) {
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


export function fillStrataBand(g, arc, depths, t0, t1, color, alpha, seed, salt) {
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


export function drawKeelPlates(g, arc, depths, spanX, seed) {
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


export function drawKeelTips(g, arc, depths, seed) {
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


export function drawCrystalShard(g, x, y, size, baseColor, litColor) {
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


export function drawHangingCable(g, x, y, depth, seed, index) {
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


export function drawHangingPipe(g, x, y, depth, seed, index) {
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


export function drawDriftingDebris(g, bounds, seed, keelDepth) {
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

