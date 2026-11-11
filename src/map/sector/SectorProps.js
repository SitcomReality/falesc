/* Vacuum-safe dressing outside the build grid. */
import { P } from './SectorPalette.js';
import { contactShadow, hash, inGridDiamond, pointInPolygon, polygon } from './SectorPrimitives.js';

export function drawProps(g, shape, centerX, centerY, seed, gridSize, tileWidth, tileHeight) {
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


export function drawRimOutcrop(g, x, y, s, roll) {
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


export function drawProp(g, prop) {
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


export function drawBoulder(g, x, y, s) {
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


export function drawRockCluster(g, x, y, s, roll) {
    contactShadow(g, x + 8 * s, y + 4 * s, 22 * s, 7 * s, 0.22);
    if (roll > 0.42) {
        drawBoulder(g, x + 16 * s, y - 4 * s, s * 0.6);
    }
    drawBoulder(g, x, y, s);
}


export function drawPebbles(g, x, y, s, roll) {
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


export function drawCrater(g, x, y, s) {
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


export function drawDustDrift(g, x, y, s) {
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


export function drawVoidCoral(g, x, y, s, roll) {
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


export function drawCrate(g, x, y, s, roll) {
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


export function drawCargoPod(g, x, y, s, roll) {
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


export function drawAntenna(g, x, y, s, roll) {
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


export function drawDish(g, x, y, s, roll) {
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


export function drawSolarFin(g, x, y, s, roll) {
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


export function drawRadiator(g, x, y, s, roll) {
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


export function drawPipeStump(g, x, y, s, roll) {
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


export function drawCableCoil(g, x, y, s, roll) {
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


export function drawWarningStripes(g, x, y, s) {
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


export function drawMemorial(g, x, y, s, roll) {
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


export function drawBeacon(g, x, y, s) {
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

