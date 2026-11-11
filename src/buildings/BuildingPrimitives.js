/* Shared ink, facet and wall primitives for the service silhouettes. */
import { INK, PLUM, WINE, SUN, PAPER, PAPER_WARM, CREAM, MINT, MINT_SOFT } from './BuildingPalette.js';

export function mix(a, b, t) {
    const ratio = Math.max(0, Math.min(1, t));
    const ar = (a >> 16) & 0xff;
    const ag = (a >> 8) & 0xff;
    const ab = a & 0xff;
    const br = (b >> 16) & 0xff;
    const bg = (b >> 8) & 0xff;
    const bb = b & 0xff;
    return (
        (Math.round(ar + (br - ar) * ratio) << 16) |
        (Math.round(ag + (bg - ag) * ratio) << 8) |
        Math.round(ab + (bb - ab) * ratio)
    );
}

export function shade(color, amount = 0.18) {
    return mix(color, PLUM, amount);
}

export function tone(color, state) {
    if (state.active) return color;
    // Dusty plum haze: desaturated but still legible against the void.
    const haze = mix(PLUM, PAPER_WARM, 0.34);
    return mix(color, haze, state.pending ? 0.76 : 0.62);
}

export function glow(graphics, x, y, radius, color, alpha = 0.2) {
    graphics.beginFill(color, alpha);
    graphics.lineStyle(0);
    graphics.drawCircle(x, y, radius);
    graphics.endFill();
}

export function diamond(graphics, cx, cy, hw, hh, fill, alpha = 1, lineWidth = 3) {
    graphics.beginFill(fill, alpha);
    graphics.lineStyle(lineWidth, INK, lineWidth > 0 ? 1 : 0);
    graphics.moveTo(cx, cy - hh);
    graphics.lineTo(cx + hw, cy);
    graphics.lineTo(cx, cy + hh);
    graphics.lineTo(cx - hw, cy);
    graphics.closePath();
    graphics.endFill();
}

export function fill(graphics, points, fill, alpha = 1, lineWidth = 3, strokeAlpha = 1) {
    graphics.beginFill(fill, alpha);
    graphics.lineStyle(lineWidth, INK, lineWidth > 0 ? strokeAlpha : 0);
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
        graphics.lineTo(points[i].x, points[i].y);
    }
    graphics.closePath();
    graphics.endFill();
}

export function strokeRing(graphics, points, color, width = 2, alpha = 1) {
    graphics.beginFill(color, 0);
    graphics.lineStyle(width, color, alpha);
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
        graphics.lineTo(points[i].x, points[i].y);
    }
    graphics.closePath();
    graphics.endFill();
}

export function ellipseRing(graphics, cx, cy, hw, hh, color, width = 2, alpha = 1) {
    graphics.beginFill(color, 0);
    graphics.lineStyle(width, color, alpha);
    graphics.drawEllipse(cx, cy, hw, hh);
    graphics.endFill();
}

export function post(graphics, points, color, width = 4, alpha = 1) {
    graphics.lineStyle(width + 3, INK, alpha * 0.9);
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
        graphics.lineTo(points[i].x, points[i].y);
    }
    graphics.lineStyle(width, color, alpha);
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
        graphics.lineTo(points[i].x, points[i].y);
    }
}

export function quadPoint(a, control, b, t) {
    const mt = 1 - t;
    return {
        x: mt * mt * a.x + 2 * mt * t * control.x + t * t * b.x,
        y: mt * mt * a.y + 2 * mt * t * control.y + t * t * b.y
    };
}

export function wallPoint(face, u, v, dims) {
    const ox = dims.ox || 0;
    const oy = dims.oy || 0;
    if (face === 'left') {
        return {
            x: ox - dims.hw + u * dims.hw,
            y: oy + dims.baseY + u * dims.hh - v * dims.height
        };
    }
    return {
        x: ox + u * dims.hw,
        y: oy + dims.baseY + dims.hh - u * dims.hh - v * dims.height
    };
}

export function wallQuad(graphics, face, dims, u0, u1, v0, v1, fillColor, lineWidth = 2) {
    const p0 = wallPoint(face, u0, v0, dims);
    const p1 = wallPoint(face, u1, v0, dims);
    const p2 = wallPoint(face, u1, v1, dims);
    const p3 = wallPoint(face, u0, v1, dims);
    fill(graphics, [p0, p1, p2, p3], fillColor, 1, lineWidth);
}

export function drawLeaf(graphics, baseX, baseY, tipX, tipY, width, fillColor) {
    const midX = (baseX + tipX) / 2;
    const midY = (baseY + tipY) / 2;
    const dx = tipX - baseX;
    const dy = tipY - baseY;
    const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const nx = (-dy / length) * width;
    const ny = (dx / length) * width;
    graphics.beginFill(fillColor, 1);
    graphics.lineStyle(1.5, INK, 0.5);
    graphics.moveTo(baseX, baseY);
    graphics.quadraticCurveTo(midX + nx, midY + ny, tipX, tipY);
    graphics.quadraticCurveTo(midX - nx, midY - ny, baseX, baseY);
    graphics.closePath();
    graphics.endFill();
}

export function drawShadow(graphics, metrics, state) {
    const { hw, hh } = metrics;
    const dx = hw * 0.52;
    const dy = hh * 0.7;

    graphics.beginFill(INK, state.active ? 0.2 : 0.1);
    graphics.lineStyle(0);
    graphics.moveTo(dx, 8 + dy - hh * 0.9);
    graphics.lineTo(dx + hw * 0.9, 8 + dy);
    graphics.lineTo(dx, 8 + dy + hh * 0.9);
    graphics.lineTo(dx - hw * 0.9, 8 + dy);
    graphics.closePath();
    graphics.endFill();

    // A low contact shadow keeps the plinth sitting on the island.
    graphics.beginFill(INK, state.active ? 0.16 : 0.07);
    graphics.lineStyle(0);
    graphics.drawEllipse(0, 12, hw * 0.78, hh * 0.5);
    graphics.endFill();
}

export function drawPlinth(graphics, state, options) {
    const { hw, hh, cy = 8, top, lip, trim, ring = null } = options;

    diamond(graphics, 0, cy + 10, hw, hh, lip, 1, 3);
    diamond(graphics, 0, cy, hw, hh, top, 1, 3);

    if (ring) {
        strokeRing(graphics, [
            { x: 0, y: cy - hh + 9 },
            { x: hw - 18, y: cy },
            { x: 0, y: cy + hh - 9 },
            { x: -hw + 18, y: cy }
        ], ring, 2, state.active ? 0.45 : 0.18);
    }

    graphics.lineStyle(3, trim, state.active ? 0.7 : 0.3);
    graphics.moveTo(-hw + 8, cy - 3);
    graphics.lineTo(0, cy - hh + 5);

    graphics.lineStyle(2, INK, state.active ? 0.26 : 0.14);
    graphics.moveTo(0, cy + hh - 3);
    graphics.lineTo(hw - 6, cy + 2);

    graphics.lineStyle(1.5, INK, state.active ? 0.2 : 0.1);
    graphics.moveTo(-hw * 0.42, cy + hh * 0.42);
    graphics.lineTo(-hw * 0.3, cy + hh * 0.52);
    graphics.moveTo(hw * 0.18, cy + hh * 0.56);
    graphics.lineTo(hw * 0.3, cy + hh * 0.44);
}

export function drawWalls(graphics, state, dims, litColor, shadeColor, trimColor) {
    const { hw, hh, baseY, height } = dims;
    const ox = dims.ox || 0;
    const oy = dims.oy || 0;
    const baseLeft = { x: ox - hw, y: oy + baseY };
    const baseFront = { x: ox, y: oy + baseY + hh };
    const baseRight = { x: ox + hw, y: oy + baseY };
    const eaveY = oy + baseY - height;
    const frontTopY = oy + baseY + hh - height;

    fill(graphics, [
        baseLeft,
        baseFront,
        { x: ox, y: frontTopY },
        { x: ox - hw, y: eaveY }
    ], litColor, 1, 3);

    fill(graphics, [
        baseFront,
        baseRight,
        { x: ox + hw, y: eaveY },
        { x: ox, y: frontTopY }
    ], shadeColor, 1, 3);

    // Bright NW corner, then the heavier SE base line.
    graphics.lineStyle(2, trimColor, state.active ? 0.55 : 0.25);
    graphics.moveTo(baseFront.x, baseFront.y - 6);
    graphics.lineTo(baseFront.x, frontTopY + 4);

    graphics.lineStyle(3, INK, 0.38);
    graphics.moveTo(baseLeft.x + 2, baseLeft.y);
    graphics.lineTo(baseFront.x, baseFront.y);
    graphics.lineTo(baseRight.x - 2, baseRight.y);

    graphics.lineStyle(4, INK, 0.3);
    graphics.moveTo(baseLeft.x + 2, eaveY + 2);
    graphics.lineTo(baseFront.x, frontTopY + 2);
    graphics.lineTo(baseRight.x - 2, eaveY + 2);
}

export function drawWindow(graphics, state, dims, face, u0, u1, v0, v1, options = {}) {
    const { lattice = false, lit = SUN } = options;
    const warm = tone(lit, state);
    const frame = tone(CREAM, state);
    const p0 = wallPoint(face, u0, v0, dims);
    const p1 = wallPoint(face, u1, v0, dims);
    const p2 = wallPoint(face, u1, v1, dims);
    const p3 = wallPoint(face, u0, v1, dims);
    const cx = (p0.x + p2.x) / 2;
    const cy = (p0.y + p2.y) / 2;
    const width = Math.abs(p1.x - p0.x);

    glow(graphics, cx, cy, Math.max(20, width * 1.05), warm, state.active ? 0.1 : 0.035);

    fill(graphics, [p0, p1, p2, p3], frame, 1, 2.5);

    const du = (u1 - u0) * 0.14;
    const dv = (v1 - v0) * 0.16;
    fill(graphics, [
        wallPoint(face, u0 + du, v0 + dv, dims),
        wallPoint(face, u1 - du, v0 + dv, dims),
        wallPoint(face, u1 - du, v1 - dv, dims),
        wallPoint(face, u0 + du, v1 - dv, dims)
    ], warm, 1, 1.5);

    const midU = (u0 + u1) / 2;
    const midV = (v0 + v1) / 2;
    const mb = wallPoint(face, midU, v0 + dv, dims);
    const mt = wallPoint(face, midU, v1 - dv, dims);
    const ml = wallPoint(face, u0 + du, midV, dims);
    const mr = wallPoint(face, u1 - du, midV, dims);
    graphics.lineStyle(1.5, INK, 0.8);
    graphics.moveTo(mb.x, mb.y);
    graphics.lineTo(mt.x, mt.y);
    graphics.moveTo(ml.x, ml.y);
    graphics.lineTo(mr.x, mr.y);

    if (lattice) {
        const lu = u0 + (midU - u0) * 0.5;
        const ru = midU + (u1 - midU) * 0.5;
        const lb = wallPoint(face, lu, v0 + dv, dims);
        const lt = wallPoint(face, lu, v1 - dv, dims);
        const rb = wallPoint(face, ru, v0 + dv, dims);
        const rt = wallPoint(face, ru, v1 - dv, dims);
        graphics.lineStyle(1, INK, 0.6);
        graphics.moveTo(lb.x, lb.y);
        graphics.lineTo(lt.x, lt.y);
        graphics.moveTo(rb.x, rb.y);
        graphics.lineTo(rt.x, rt.y);
    }

    graphics.lineStyle(2, frame, state.active ? 0.8 : 0.35);
    graphics.moveTo(p0.x, p0.y + 1);
    graphics.lineTo(p1.x, p1.y + 1);
}

export function drawAirlock(graphics, state, dims, options = {}) {
    const {
        u0 = 0.54,
        u1 = 0.86,
        v0 = 0.01,
        v1 = 0.64,
        accent = MINT,
        step = true,
        stepWidth = 26,
        stepDepth = 11
    } = options;
    const frameColor = tone(CREAM, state);
    const doorColor = tone(WINE, state);
    const warm = tone(SUN, state);
    const accentColor = tone(accent, state);
    const stepTop = tone(PAPER, state);
    const stepSide = tone(shade(PAPER_WARM, 0.2), state);

    const f0 = wallPoint('right', Math.max(-0.02, u0 - 0.04), v0, dims);
    const f1 = wallPoint('right', Math.min(1.02, u1 + 0.04), v0, dims);
    const f2 = wallPoint('right', Math.min(1.02, u1 + 0.04), Math.min(0.99, v1 + 0.035), dims);
    const f3 = wallPoint('right', Math.max(-0.02, u0 - 0.04), Math.min(0.99, v1 + 0.035), dims);
    const midX = (f0.x + f1.x) / 2;
    const frameWidth = Math.abs(f1.x - f0.x);

    glow(graphics, midX, (f0.y + f1.y) / 2 - 12, Math.max(30, frameWidth * 0.8), warm, state.active ? 0.12 : 0.04);
    fill(graphics, [f0, f1, f2, f3], frameColor, 1, 3);

    const d0 = wallPoint('right', u0 + 0.012, v0, dims);
    const d1 = wallPoint('right', u1 - 0.012, v0, dims);
    const d2 = wallPoint('right', u1 - 0.012, v1 - 0.02, dims);
    const d3 = wallPoint('right', u0 + 0.012, v1 - 0.02, dims);
    const doorX = (d2.x + d3.x) / 2;
    const archY = Math.min(d2.y, d3.y);

    graphics.beginFill(doorColor, 1);
    graphics.lineStyle(2, INK, 1);
    graphics.moveTo(d0.x, d0.y);
    graphics.lineTo(d1.x, d1.y);
    graphics.lineTo(d2.x, d2.y);
    graphics.quadraticCurveTo(doorX, archY - Math.min(14, frameWidth * 0.3), d3.x, d3.y);
    graphics.closePath();
    graphics.endFill();

    const paneY = (d2.y + d3.y) / 2 + 11;
    const paneR = Math.max(5, Math.min(9, frameWidth * 0.2));
    graphics.beginFill(warm, state.active ? 1 : 0.65);
    graphics.lineStyle(1.5, INK, 1);
    graphics.drawCircle(doorX, paneY, paneR);
    graphics.endFill();
    graphics.lineStyle(1, INK, 0.8);
    graphics.moveTo(doorX - paneR, paneY);
    graphics.lineTo(doorX + paneR, paneY);
    graphics.moveTo(doorX, paneY - paneR);
    graphics.lineTo(doorX, paneY + paneR);

    graphics.lineStyle(1.5, INK, 0.7);
    graphics.moveTo(doorX, paneY + paneR + 2);
    graphics.lineTo(doorX, Math.max(d0.y, d1.y) - 3);

    const lampX = (f2.x + f3.x) / 2;
    const lampY = Math.min(f2.y, f3.y) - 6;
    glow(graphics, lampX, lampY, 11, accentColor, state.active ? 0.3 : 0.1);
    graphics.beginFill(accentColor, state.active ? 1 : 0.55);
    graphics.lineStyle(1.5, INK, 1);
    graphics.drawCircle(lampX, lampY, 3.5);
    graphics.endFill();

    if (!step) {
        return { x: midX, y: Math.max(d0.y, d1.y) };
    }

    const stepX = midX + 9;
    const stepY = Math.max(d0.y, d1.y) + 8;
    diamond(graphics, stepX, stepY + 6, stepWidth, stepDepth, stepSide, 1, 2.5);
    diamond(graphics, stepX, stepY, stepWidth - 3, stepDepth - 1, stepTop, 1, 2.5);
    return { x: stepX, y: stepY };
}

export function drawLantern(graphics, state, x, y, options = {}) {
    const { radius = 9, cord = 18, cap = WINE, light = SUN } = options;
    const lightColor = tone(light, state);
    const capColor = tone(cap, state);

    if (cord > 0) {
        graphics.lineStyle(2, INK, 0.8);
        graphics.moveTo(x, y - cord);
        graphics.lineTo(x, y - radius);
    }

    glow(graphics, x, y, radius * 2.6, lightColor, state.active ? 0.16 : 0.04);

    graphics.beginFill(capColor, 1);
    graphics.lineStyle(2, INK, 1);
    graphics.moveTo(x - radius * 0.5, y - radius);
    graphics.lineTo(x + radius * 0.5, y - radius);
    graphics.lineTo(x, y - radius * 1.5);
    graphics.closePath();
    graphics.endFill();

    graphics.beginFill(lightColor, state.active ? 1 : 0.6);
    graphics.lineStyle(2, INK, 1);
    graphics.drawCircle(x, y, radius);
    graphics.endFill();

    graphics.beginFill(tone(CREAM, state), state.active ? 0.9 : 0.35);
    graphics.lineStyle(0);
    graphics.drawCircle(x - radius * 0.25, y - radius * 0.25, radius * 0.35);
    graphics.endFill();
}

export function drawSteam(graphics, state, x, y, scale = 1) {
    const pale = tone(CREAM, state);
    const cool = tone(MINT_SOFT, state);
    const puffs = [
        { dx: 0, dy: 0, r: 8, alpha: 0.4, color: pale },
        { dx: 8, dy: -18, r: 11, alpha: 0.3, color: cool },
        { dx: -8, dy: -38, r: 14, alpha: 0.22, color: pale },
        { dx: 6, dy: -60, r: 17, alpha: 0.14, color: cool }
    ];
    for (const puff of puffs) {
        graphics.beginFill(puff.color, state.active ? puff.alpha : puff.alpha * 0.5);
        graphics.lineStyle(0);
        graphics.drawCircle(x + puff.dx * scale, y + puff.dy * scale, puff.r * scale);
        graphics.endFill();
    }
}

export function drawScaffold(graphics, metrics, state) {
    const creamAlpha = state.pending ? 0.62 : 0.9;
    const mintAlpha = state.pending ? 0.5 : 0.82;
    const width = metrics.hw + 8;
    const front = metrics.hh + 10;
    const guide = metrics.guide;
    const top = guide[1].y - 30;
    const lowRail = top * 0.44;
    const highRail = top * 0.74;

    const cream = (points, lineWidth, alpha) => {
        graphics.lineStyle(lineWidth + 3, INK, alpha * 0.45);
        graphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i += 1) graphics.lineTo(points[i].x, points[i].y);
        graphics.lineStyle(lineWidth, CREAM, alpha);
        graphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i += 1) graphics.lineTo(points[i].x, points[i].y);
    };

    cream([{ x: -width, y: 4 }, { x: -width, y: top }], 2.5, creamAlpha);
    cream([{ x: width, y: 4 }, { x: width, y: top }], 2.5, creamAlpha);
    cream([{ x: 0, y: front + 4 }, { x: 0, y: top + 18 }], 2.5, creamAlpha);

    cream([{ x: -width, y: lowRail }, { x: 0, y: lowRail + front }, { x: width, y: lowRail }], 2, creamAlpha * 0.9);
    cream([{ x: -width, y: highRail }, { x: 0, y: highRail + front }, { x: width, y: highRail }], 2, creamAlpha * 0.9);

    cream([{ x: -width, y: 6 }, { x: 0, y: highRail + front }], 1.5, creamAlpha * 0.65);
    cream([{ x: width, y: 6 }, { x: 0, y: lowRail + front }], 1.5, creamAlpha * 0.65);

    graphics.lineStyle(2, MINT, mintAlpha);
    graphics.moveTo(guide[0].x, guide[0].y);
    if (guide.length === 3) {
        const controlY = guide[1].y * 2 - guide[0].y;
        graphics.quadraticCurveTo(guide[1].x, controlY, guide[2].x, guide[2].y);
    } else {
        for (let i = 1; i < guide.length; i += 1) {
            graphics.lineTo(guide[i].x, guide[i].y);
        }
    }

    graphics.beginFill(MINT, mintAlpha);
    graphics.lineStyle(0);
    for (const point of guide) graphics.drawCircle(point.x, point.y, 2.5);
    graphics.endFill();
}

