/**
 * FALESC building art: public services as warm places, not machines.
 *
 * Every program is drawn in local coordinates with its plinth near y = 0 and
 * the silhouette rising into negative y. The world is lit from the north-west,
 * so the south-west wall face is lit, the south-east wall face is shaded, and
 * the flat shadow is cast to the south-east. Doors always sit on the visible
 * south-east face. Under construction, the same silhouette is ghosted and
 * desaturated behind cream scaffolding and a mint planning guide.
 */

const INK = 0x211225;
const PLUM = 0x3a163c;
const WINE = 0x7d2148;
const ROSE = 0xc73d61;
const CORAL = 0xff6b5e;
const BUBBLEGUM = 0xff4f9a;
const PEACH = 0xffa07a;
const SUN = 0xffd36e;
const PAPER = 0xfff2d8;
const PAPER_WARM = 0xf3d9ae;
const CREAM = 0xfff8ea;
const MINT = 0x59e3c2;
const MINT_SOFT = 0xa8f5dc;
const CYAN = 0x36c6d9;
const LAVENDER = 0xc9b6ff;

const PROGRAM_FALLBACK = 'housing';

/** Program footprints and the planned crest used by scaffolding guides. */
const PROGRAMS = {
    housing: {
        hw: 124,
        hh: 54,
        guide: [
            { x: -116, y: -100 },
            { x: 0, y: -186 },
            { x: 116, y: -100 }
        ]
    },
    canteen: {
        hw: 132,
        hh: 58,
        guide: [
            { x: -110, y: -70 },
            { x: 0, y: -122 },
            { x: 110, y: -70 }
        ]
    },
    tea_house: {
        hw: 122,
        hh: 52,
        guide: [
            { x: -118, y: -92 },
            { x: 0, y: -202 },
            { x: 118, y: -92 }
        ]
    },
    garden_dome: {
        hw: 224,
        hh: 96,
        guide: [
            { x: -172, y: 10 },
            { x: 0, y: -226 },
            { x: 172, y: 10 }
        ]
    },
    clinic: {
        hw: 112,
        hh: 48,
        guide: [
            { x: -104, y: -86 },
            { x: 0, y: -144 },
            { x: 104, y: -86 }
        ]
    },
    amphitheatre: {
        hw: 184,
        hh: 78,
        guide: [
            { x: -158, y: -62 },
            { x: 0, y: -112 },
            { x: 158, y: -62 }
        ]
    },
    bathhouse: {
        hw: 158,
        hh: 66,
        guide: [
            { x: -122, y: 8 },
            { x: 0, y: -104 },
            { x: 122, y: 8 }
        ]
    },
    commons_beacon: {
        hw: 158,
        hh: 66,
        guide: [
            { x: -40, y: -262 },
            { x: 0, y: -296 },
            { x: 40, y: -262 }
        ]
    }
};

export class BuildingRenderer {
    static draw(graphics, building) {
        graphics.clear();

        const state = BuildingRenderer.stateOf(building);
        const program = BuildingRenderer.programOf(building);
        const metrics = PROGRAMS[program];

        BuildingRenderer.drawShadow(graphics, metrics, state);

        switch (program) {
            case 'canteen':
                BuildingRenderer.drawCanteen(graphics, state);
                break;
            case 'tea_house':
                BuildingRenderer.drawTeaHouse(graphics, state);
                break;
            case 'garden_dome':
                BuildingRenderer.drawGardenDome(graphics, state);
                break;
            case 'bathhouse':
                BuildingRenderer.drawBathhouse(graphics, state);
                break;
            case 'amphitheatre':
                BuildingRenderer.drawAmphitheatre(graphics, state);
                break;
            case 'clinic':
                BuildingRenderer.drawClinic(graphics, state);
                break;
            case 'commons_beacon':
                BuildingRenderer.drawCommonsBeacon(graphics, state);
                break;
            case 'housing':
            default:
                BuildingRenderer.drawHousing(graphics, state);
                break;
        }

        if (state.ghost) BuildingRenderer.drawScaffold(graphics, metrics, state);
    }

    static programOf(building) {
        const candidate = building.programId || building.blueprintId || PROGRAM_FALLBACK;
        if (Object.prototype.hasOwnProperty.call(PROGRAMS, candidate)) return candidate;
        return PROGRAM_FALLBACK;
    }

    static stateOf(building) {
        const active = building.state === 'ACTIVE';
        return {
            active,
            pending: building.state === 'PENDING',
            ghost: !active
        };
    }

    /* ------------------------------------------------------------------ */
    /* Colour helpers                                                      */
    /* ------------------------------------------------------------------ */
    static mix(a, b, t) {
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

    static shade(color, amount = 0.18) {
        return BuildingRenderer.mix(color, PLUM, amount);
    }

    static tone(color, state) {
        if (state.active) return color;
        // Dusty plum haze: desaturated but still legible against the void.
        const haze = BuildingRenderer.mix(PLUM, PAPER_WARM, 0.34);
        return BuildingRenderer.mix(color, haze, state.pending ? 0.76 : 0.62);
    }

    /* ------------------------------------------------------------------ */
    /* Geometry helpers                                                    */
    /* ------------------------------------------------------------------ */
    static glow(graphics, x, y, radius, color, alpha = 0.2) {
        graphics.beginFill(color, alpha);
        graphics.lineStyle(0);
        graphics.drawCircle(x, y, radius);
        graphics.endFill();
    }

    static diamond(graphics, cx, cy, hw, hh, fill, alpha = 1, lineWidth = 3) {
        graphics.beginFill(fill, alpha);
        graphics.lineStyle(lineWidth, INK, lineWidth > 0 ? 1 : 0);
        graphics.moveTo(cx, cy - hh);
        graphics.lineTo(cx + hw, cy);
        graphics.lineTo(cx, cy + hh);
        graphics.lineTo(cx - hw, cy);
        graphics.closePath();
        graphics.endFill();
    }

    static fill(graphics, points, fill, alpha = 1, lineWidth = 3, strokeAlpha = 1) {
        graphics.beginFill(fill, alpha);
        graphics.lineStyle(lineWidth, INK, lineWidth > 0 ? strokeAlpha : 0);
        graphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i += 1) {
            graphics.lineTo(points[i].x, points[i].y);
        }
        graphics.closePath();
        graphics.endFill();
    }

    static ring(graphics, points, color, width = 2, alpha = 1) {
        graphics.beginFill(color, 0);
        graphics.lineStyle(width, color, alpha);
        graphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i += 1) {
            graphics.lineTo(points[i].x, points[i].y);
        }
        graphics.closePath();
        graphics.endFill();
    }

    static ellipseRing(graphics, cx, cy, hw, hh, color, width = 2, alpha = 1) {
        graphics.beginFill(color, 0);
        graphics.lineStyle(width, color, alpha);
        graphics.drawEllipse(cx, cy, hw, hh);
        graphics.endFill();
    }

    static post(graphics, points, color, width = 4, alpha = 1) {
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

    static quadPoint(a, control, b, t) {
        const mt = 1 - t;
        return {
            x: mt * mt * a.x + 2 * mt * t * control.x + t * t * b.x,
            y: mt * mt * a.y + 2 * mt * t * control.y + t * t * b.y
        };
    }

    static wallPoint(face, u, v, dims) {
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

    static wallQuad(graphics, face, dims, u0, u1, v0, v1, fillColor, lineWidth = 2) {
        const p0 = BuildingRenderer.wallPoint(face, u0, v0, dims);
        const p1 = BuildingRenderer.wallPoint(face, u1, v0, dims);
        const p2 = BuildingRenderer.wallPoint(face, u1, v1, dims);
        const p3 = BuildingRenderer.wallPoint(face, u0, v1, dims);
        BuildingRenderer.fill(graphics, [p0, p1, p2, p3], fillColor, 1, lineWidth);
    }

    static leaf(graphics, baseX, baseY, tipX, tipY, width, fillColor) {
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

    /* ------------------------------------------------------------------ */
    /* Shared parts                                                        */
    /* ------------------------------------------------------------------ */
    static drawShadow(graphics, metrics, state) {
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

    static drawPlinth(graphics, state, options) {
        const { hw, hh, cy = 8, top, lip, trim, ring = null } = options;

        BuildingRenderer.diamond(graphics, 0, cy + 10, hw, hh, lip, 1, 3);
        BuildingRenderer.diamond(graphics, 0, cy, hw, hh, top, 1, 3);

        if (ring) {
            BuildingRenderer.ring(graphics, [
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

    static drawWalls(graphics, state, dims, litColor, shadeColor, trimColor) {
        const { hw, hh, baseY, height } = dims;
        const ox = dims.ox || 0;
        const oy = dims.oy || 0;
        const baseLeft = { x: ox - hw, y: oy + baseY };
        const baseFront = { x: ox, y: oy + baseY + hh };
        const baseRight = { x: ox + hw, y: oy + baseY };
        const eaveY = oy + baseY - height;
        const frontTopY = oy + baseY + hh - height;

        BuildingRenderer.fill(graphics, [
            baseLeft,
            baseFront,
            { x: ox, y: frontTopY },
            { x: ox - hw, y: eaveY }
        ], litColor, 1, 3);

        BuildingRenderer.fill(graphics, [
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

    static drawWindow(graphics, state, dims, face, u0, u1, v0, v1, options = {}) {
        const { lattice = false, lit = SUN } = options;
        const warm = BuildingRenderer.tone(lit, state);
        const frame = BuildingRenderer.tone(CREAM, state);
        const p0 = BuildingRenderer.wallPoint(face, u0, v0, dims);
        const p1 = BuildingRenderer.wallPoint(face, u1, v0, dims);
        const p2 = BuildingRenderer.wallPoint(face, u1, v1, dims);
        const p3 = BuildingRenderer.wallPoint(face, u0, v1, dims);
        const cx = (p0.x + p2.x) / 2;
        const cy = (p0.y + p2.y) / 2;
        const width = Math.abs(p1.x - p0.x);

        BuildingRenderer.glow(graphics, cx, cy, Math.max(20, width * 1.05), warm, state.active ? 0.1 : 0.035);

        BuildingRenderer.fill(graphics, [p0, p1, p2, p3], frame, 1, 2.5);

        const du = (u1 - u0) * 0.14;
        const dv = (v1 - v0) * 0.16;
        BuildingRenderer.fill(graphics, [
            BuildingRenderer.wallPoint(face, u0 + du, v0 + dv, dims),
            BuildingRenderer.wallPoint(face, u1 - du, v0 + dv, dims),
            BuildingRenderer.wallPoint(face, u1 - du, v1 - dv, dims),
            BuildingRenderer.wallPoint(face, u0 + du, v1 - dv, dims)
        ], warm, 1, 1.5);

        const midU = (u0 + u1) / 2;
        const midV = (v0 + v1) / 2;
        const mb = BuildingRenderer.wallPoint(face, midU, v0 + dv, dims);
        const mt = BuildingRenderer.wallPoint(face, midU, v1 - dv, dims);
        const ml = BuildingRenderer.wallPoint(face, u0 + du, midV, dims);
        const mr = BuildingRenderer.wallPoint(face, u1 - du, midV, dims);
        graphics.lineStyle(1.5, INK, 0.8);
        graphics.moveTo(mb.x, mb.y);
        graphics.lineTo(mt.x, mt.y);
        graphics.moveTo(ml.x, ml.y);
        graphics.lineTo(mr.x, mr.y);

        if (lattice) {
            const lu = u0 + (midU - u0) * 0.5;
            const ru = midU + (u1 - midU) * 0.5;
            const lb = BuildingRenderer.wallPoint(face, lu, v0 + dv, dims);
            const lt = BuildingRenderer.wallPoint(face, lu, v1 - dv, dims);
            const rb = BuildingRenderer.wallPoint(face, ru, v0 + dv, dims);
            const rt = BuildingRenderer.wallPoint(face, ru, v1 - dv, dims);
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

    static drawAirlock(graphics, state, dims, options = {}) {
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
        const frameColor = BuildingRenderer.tone(CREAM, state);
        const doorColor = BuildingRenderer.tone(WINE, state);
        const warm = BuildingRenderer.tone(SUN, state);
        const accentColor = BuildingRenderer.tone(accent, state);
        const stepTop = BuildingRenderer.tone(PAPER, state);
        const stepSide = BuildingRenderer.tone(BuildingRenderer.shade(PAPER_WARM, 0.2), state);

        const f0 = BuildingRenderer.wallPoint('right', Math.max(-0.02, u0 - 0.04), v0, dims);
        const f1 = BuildingRenderer.wallPoint('right', Math.min(1.02, u1 + 0.04), v0, dims);
        const f2 = BuildingRenderer.wallPoint('right', Math.min(1.02, u1 + 0.04), Math.min(0.99, v1 + 0.035), dims);
        const f3 = BuildingRenderer.wallPoint('right', Math.max(-0.02, u0 - 0.04), Math.min(0.99, v1 + 0.035), dims);
        const midX = (f0.x + f1.x) / 2;
        const frameWidth = Math.abs(f1.x - f0.x);

        BuildingRenderer.glow(graphics, midX, (f0.y + f1.y) / 2 - 12, Math.max(30, frameWidth * 0.8), warm, state.active ? 0.12 : 0.04);
        BuildingRenderer.fill(graphics, [f0, f1, f2, f3], frameColor, 1, 3);

        const d0 = BuildingRenderer.wallPoint('right', u0 + 0.012, v0, dims);
        const d1 = BuildingRenderer.wallPoint('right', u1 - 0.012, v0, dims);
        const d2 = BuildingRenderer.wallPoint('right', u1 - 0.012, v1 - 0.02, dims);
        const d3 = BuildingRenderer.wallPoint('right', u0 + 0.012, v1 - 0.02, dims);
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
        BuildingRenderer.glow(graphics, lampX, lampY, 11, accentColor, state.active ? 0.3 : 0.1);
        graphics.beginFill(accentColor, state.active ? 1 : 0.55);
        graphics.lineStyle(1.5, INK, 1);
        graphics.drawCircle(lampX, lampY, 3.5);
        graphics.endFill();

        if (!step) {
            return { x: midX, y: Math.max(d0.y, d1.y) };
        }

        const stepX = midX + 9;
        const stepY = Math.max(d0.y, d1.y) + 8;
        BuildingRenderer.diamond(graphics, stepX, stepY + 6, stepWidth, stepDepth, stepSide, 1, 2.5);
        BuildingRenderer.diamond(graphics, stepX, stepY, stepWidth - 3, stepDepth - 1, stepTop, 1, 2.5);
        return { x: stepX, y: stepY };
    }

    static drawLantern(graphics, state, x, y, options = {}) {
        const { radius = 9, cord = 18, cap = WINE, light = SUN } = options;
        const lightColor = BuildingRenderer.tone(light, state);
        const capColor = BuildingRenderer.tone(cap, state);

        if (cord > 0) {
            graphics.lineStyle(2, INK, 0.8);
            graphics.moveTo(x, y - cord);
            graphics.lineTo(x, y - radius);
        }

        BuildingRenderer.glow(graphics, x, y, radius * 2.6, lightColor, state.active ? 0.16 : 0.04);

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

        graphics.beginFill(BuildingRenderer.tone(CREAM, state), state.active ? 0.9 : 0.35);
        graphics.lineStyle(0);
        graphics.drawCircle(x - radius * 0.25, y - radius * 0.25, radius * 0.35);
        graphics.endFill();
    }

    static drawSteam(graphics, state, x, y, scale = 1) {
        const pale = BuildingRenderer.tone(CREAM, state);
        const cool = BuildingRenderer.tone(MINT_SOFT, state);
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

    static drawScaffold(graphics, metrics, state) {
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

    /* ------------------------------------------------------------------ */
    /* Housing — welcome house with an arched coral roof                   */
    /* ------------------------------------------------------------------ */
    static drawHousing(graphics, state) {
        const trim = BuildingRenderer.tone(CREAM, state);
        const deck = BuildingRenderer.tone(PAPER_WARM, state);
        const deckLip = BuildingRenderer.tone(BuildingRenderer.shade(PAPER_WARM, 0.24), state);
        const wallLit = BuildingRenderer.tone(CREAM, state);
        const wallShade = BuildingRenderer.tone(BuildingRenderer.mix(PAPER_WARM, PEACH, 0.45), state);
        const roofLit = BuildingRenderer.tone(PEACH, state);
        const roofShade = BuildingRenderer.tone(ROSE, state);
        const warm = BuildingRenderer.tone(SUN, state);
        const metal = BuildingRenderer.tone(WINE, state);
        const dims = { hw: 96, hh: 42, baseY: 6, height: 112 };

        BuildingRenderer.drawPlinth(graphics, state, {
            hw: 124,
            hh: 54,
            cy: 8,
            top: deck,
            lip: deckLip,
            trim,
            ring: BuildingRenderer.tone(PEACH, state)
        });
        BuildingRenderer.drawWalls(graphics, state, dims, wallLit, wallShade, trim);

        BuildingRenderer.drawWindow(graphics, state, dims, 'left', 0.3, 0.72, 0.36, 0.68, { lattice: true });
        BuildingRenderer.drawWindow(graphics, state, dims, 'left', 0.08, 0.24, 0.4, 0.62, { lattice: false });
        BuildingRenderer.drawWindow(graphics, state, dims, 'right', 0.07, 0.28, 0.36, 0.66, { lattice: true });

        // Arched coral roof: a lit barrel over a shaded south-east skirt.
        const apex = { x: 0, y: -186 };
        const eaveLeft = { x: -116, y: -100 };
        const eaveRight = { x: 116, y: -100 };
        const eaveFront = { x: 0, y: -46 };

        graphics.beginFill(roofLit, 1);
        graphics.lineStyle(3, INK, 1);
        graphics.moveTo(eaveLeft.x, eaveLeft.y);
        graphics.quadraticCurveTo(-96, -178, apex.x, apex.y);
        graphics.quadraticCurveTo(96, -178, eaveRight.x, eaveRight.y);
        graphics.quadraticCurveTo(60, -66, eaveFront.x, eaveFront.y);
        graphics.quadraticCurveTo(-60, -66, eaveLeft.x, eaveLeft.y);
        graphics.closePath();
        graphics.endFill();

        graphics.beginFill(roofShade, state.active ? 0.88 : 0.92);
        graphics.lineStyle(0);
        graphics.moveTo(apex.x, apex.y);
        graphics.quadraticCurveTo(96, -178, eaveRight.x, eaveRight.y);
        graphics.quadraticCurveTo(60, -66, eaveFront.x, eaveFront.y);
        graphics.quadraticCurveTo(34, -146, apex.x, apex.y + 8);
        graphics.closePath();
        graphics.endFill();

        graphics.beginFill(INK, 0);
        graphics.lineStyle(3, INK, 1);
        graphics.moveTo(eaveLeft.x, eaveLeft.y);
        graphics.quadraticCurveTo(-96, -178, apex.x, apex.y);
        graphics.quadraticCurveTo(96, -178, eaveRight.x, eaveRight.y);
        graphics.quadraticCurveTo(60, -66, eaveFront.x, eaveFront.y);
        graphics.quadraticCurveTo(-60, -66, eaveLeft.x, eaveLeft.y);
        graphics.closePath();
        graphics.endFill();

        graphics.lineStyle(2, INK, state.active ? 0.22 : 0.12);
        graphics.moveTo(apex.x, apex.y + 6);
        graphics.quadraticCurveTo(-60, -160, -108, -96);
        graphics.moveTo(apex.x, apex.y + 6);
        graphics.quadraticCurveTo(60, -160, 108, -96);
        graphics.moveTo(apex.x, apex.y + 6);
        graphics.quadraticCurveTo(20, -120, 54, -58);

        graphics.lineStyle(5, trim, state.active ? 0.7 : 0.35);
        graphics.moveTo(eaveLeft.x + 4, eaveLeft.y);
        graphics.quadraticCurveTo(-58, -64, eaveFront.x, eaveFront.y + 2);
        graphics.quadraticCurveTo(58, -64, eaveRight.x - 4, eaveRight.y);

        graphics.lineStyle(3, trim, state.active ? 0.55 : 0.2);
        graphics.moveTo(eaveLeft.x + 8, eaveLeft.y - 4);
        graphics.quadraticCurveTo(-88, -170, apex.x, apex.y + 6);

        // A small attic porthole, warm against the roof.
        graphics.beginFill(trim, 1);
        graphics.lineStyle(2, INK, 1);
        graphics.drawCircle(0, -124, 13);
        graphics.endFill();
        graphics.beginFill(warm, state.active ? 1 : 0.6);
        graphics.lineStyle(1.5, INK, 1);
        graphics.drawCircle(0, -124, 9);
        graphics.endFill();
        graphics.lineStyle(1.2, INK, 0.75);
        graphics.moveTo(-9, -124);
        graphics.lineTo(9, -124);
        graphics.moveTo(0, -133);
        graphics.lineTo(0, -115);

        BuildingRenderer.drawAirlock(graphics, state, dims, {
            u0: 0.4,
            u1: 0.76,
            v1: 0.52,
            accent: MINT,
            stepWidth: 27,
            stepDepth: 11
        });

        // Porch lamp and bunting.
        const lampX = 116;
        const lampTopY = -58;
        BuildingRenderer.post(graphics, [
            { x: lampX, y: 12 },
            { x: lampX, y: lampTopY },
            { x: lampX + 16, y: lampTopY - 6 }
        ], metal, 4);
        BuildingRenderer.drawLantern(graphics, state, lampX + 16, lampTopY - 2, { radius: 8, cord: 0 });

        const buntStart = { x: -112, y: -100 };
        const buntControl = { x: -10, y: -58 };
        const buntEnd = { x: lampX + 16, y: lampTopY - 14 };
        graphics.lineStyle(1.5, INK, state.active ? 0.8 : 0.35);
        graphics.moveTo(buntStart.x, buntStart.y);
        graphics.quadraticCurveTo(buntControl.x, buntControl.y, buntEnd.x, buntEnd.y);
        const flags = [BUBBLEGUM, MINT, SUN, CORAL, LAVENDER];
        for (let i = 0; i < flags.length; i += 1) {
            const point = BuildingRenderer.quadPoint(buntStart, buntControl, buntEnd, (i + 1) / 6);
            graphics.beginFill(BuildingRenderer.tone(flags[i], state), state.active ? 1 : 0.5);
            graphics.lineStyle(1, INK, 0.8);
            graphics.moveTo(point.x - 4, point.y);
            graphics.lineTo(point.x + 6, point.y + 2);
            graphics.lineTo(point.x - 1, point.y + 9);
            graphics.closePath();
            graphics.endFill();
        }
    }

    /* ------------------------------------------------------------------ */
    /* Canteen — counter, awning, steam, queue mat                         */
    /* ------------------------------------------------------------------ */
    static drawCanteen(graphics, state) {
        const trim = BuildingRenderer.tone(CREAM, state);
        const deck = BuildingRenderer.tone(PAPER_WARM, state);
        const deckLip = BuildingRenderer.tone(BuildingRenderer.shade(PAPER_WARM, 0.24), state);
        const wallLit = BuildingRenderer.tone(CREAM, state);
        const wallShade = BuildingRenderer.tone(BuildingRenderer.mix(PAPER_WARM, PEACH, 0.42), state);
        const roof = BuildingRenderer.tone(PAPER, state);
        const fascia = BuildingRenderer.tone(CORAL, state);
        const awningLight = BuildingRenderer.tone(CORAL, state);
        const awningPale = BuildingRenderer.tone(CREAM, state);
        const mint = BuildingRenderer.tone(MINT, state);
        const dims = { hw: 110, hh: 46, baseY: 8, height: 78 };

        BuildingRenderer.drawPlinth(graphics, state, {
            hw: 132,
            hh: 58,
            cy: 10,
            top: deck,
            lip: deckLip,
            trim,
            ring: BuildingRenderer.tone(CORAL, state)
        });
        BuildingRenderer.drawWalls(graphics, state, dims, wallLit, wallShade, trim);

        BuildingRenderer.drawWindow(graphics, state, dims, 'left', 0.08, 0.46, 0.26, 0.62, { lattice: true });
        BuildingRenderer.drawWindow(graphics, state, dims, 'left', 0.54, 0.92, 0.26, 0.62, { lattice: true });
        BuildingRenderer.drawWindow(graphics, state, dims, 'right', 0.06, 0.4, 0.3, 0.62, { lattice: false });

        // Serving counter under the south-east window.
        const counterA = BuildingRenderer.wallPoint('right', 0.04, 0.31, dims);
        const counterB = BuildingRenderer.wallPoint('right', 0.42, 0.31, dims);
        BuildingRenderer.fill(graphics, [
            counterA,
            counterB,
            { x: counterB.x + 8, y: counterB.y + 7 },
            { x: counterA.x + 8, y: counterA.y + 7 }
        ], BuildingRenderer.tone(PEACH, state), 1, 2);
        graphics.lineStyle(2, trim, state.active ? 0.8 : 0.4);
        graphics.moveTo(counterA.x + 2, counterA.y + 2);
        graphics.lineTo(counterB.x + 2, counterB.y + 2);

        // Low broad roof with a coral fascia.
        const left = { x: -110, y: -70 };
        const front = { x: 0, y: -24 };
        const right = { x: 110, y: -70 };
        const back = { x: 0, y: -116 };
        BuildingRenderer.fill(graphics, [left, front, right, back], roof, 1, 3);
        graphics.lineStyle(3, trim, state.active ? 0.55 : 0.25);
        graphics.moveTo(back.x + 4, back.y + 8);
        graphics.lineTo(left.x + 6, left.y + 4);
        graphics.moveTo(back.x + 4, back.y + 8);
        graphics.lineTo(right.x - 6, right.y + 4);
        BuildingRenderer.post(graphics, [left, front, right], fascia, 6, state.active ? 1 : 0.7);

        // Roof steam vent.
        BuildingRenderer.diamond(graphics, -28, -90, 18, 8, BuildingRenderer.tone(PAPER_WARM, state), 1, 2);
        BuildingRenderer.diamond(graphics, -28, -98, 16, 7, trim, 1, 2);
        BuildingRenderer.post(graphics, [{ x: -28, y: -98 }, { x: -28, y: -120 }], BuildingRenderer.tone(WINE, state), 4);
        BuildingRenderer.diamond(graphics, -28, -122, 12, 5, mint, 1, 2);
        BuildingRenderer.drawSteam(graphics, state, -28, -130, 0.9);

        // Striped awning over the south-east wall.
        const mountA = BuildingRenderer.wallPoint('right', -0.04, 0.94, dims);
        const mountB = BuildingRenderer.wallPoint('right', 1.04, 0.94, dims);
        const over = { x: 16, y: 18 };
        const stripes = 8;
        const stripePoints = [];
        for (let i = 0; i <= stripes; i += 1) {
            const t = i / stripes;
            const inner = {
                x: mountA.x + (mountB.x - mountA.x) * t,
                y: mountA.y + (mountB.y - mountA.y) * t
            };
            stripePoints.push({
                inner,
                outer: { x: inner.x + over.x, y: inner.y + over.y }
            });
        }
        for (let i = 0; i < stripes; i += 1) {
            const a = stripePoints[i].outer;
            const b = stripePoints[i + 1].outer;
            const radius = Math.max(5, Math.sqrt((b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y)) / 2);
            graphics.beginFill(i % 2 === 0 ? awningLight : awningPale, 1);
            graphics.lineStyle(1.5, INK, 0.6);
            graphics.drawCircle((a.x + b.x) / 2, (a.y + b.y) / 2 + 2, radius);
            graphics.endFill();
        }
        for (let i = 0; i < stripes; i += 1) {
            BuildingRenderer.fill(graphics, [
                stripePoints[i].inner,
                stripePoints[i + 1].inner,
                stripePoints[i + 1].outer,
                stripePoints[i].outer
            ], i % 2 === 0 ? awningLight : awningPale, 1, 0);
        }
        graphics.lineStyle(2.5, INK, 0.9);
        graphics.moveTo(mountA.x, mountA.y);
        graphics.lineTo(mountB.x, mountB.y);
        graphics.lineTo(mountB.x + over.x, mountB.y + over.y);
        graphics.lineTo(mountA.x + over.x, mountA.y + over.y);
        graphics.closePath();

        // Short brackets tie the awning to the wall, clear of the windows.
        BuildingRenderer.post(graphics, [
            { x: mountA.x + over.x, y: mountA.y + over.y },
            BuildingRenderer.wallPoint('right', 0.03, 0.74, dims)
        ], trim, 2.5, 0.75);
        BuildingRenderer.post(graphics, [
            { x: mountB.x + over.x, y: mountB.y + over.y },
            BuildingRenderer.wallPoint('right', 0.97, 0.74, dims)
        ], trim, 2.5, 0.75);

        // Airlock door and the little queue step and mat.
        const step = BuildingRenderer.drawAirlock(graphics, state, dims, {
            u0: 0.52,
            u1: 0.84,
            v1: 0.54,
            accent: MINT,
            stepWidth: 24,
            stepDepth: 10
        });
        const matX = step.x;
        const matY = step.y + 2;
        graphics.beginFill(BuildingRenderer.tone(CORAL, state), 1);
        graphics.lineStyle(2, INK, 1);
        graphics.moveTo(matX - 20, matY);
        graphics.lineTo(matX, matY + 9);
        graphics.lineTo(matX + 20, matY);
        graphics.lineTo(matX, matY - 9);
        graphics.closePath();
        graphics.endFill();
        graphics.lineStyle(2, trim, state.active ? 0.9 : 0.5);
        graphics.moveTo(matX - 14, matY - 3);
        graphics.lineTo(matX, matY + 3);
        graphics.lineTo(matX + 14, matY - 3);
        graphics.moveTo(matX - 14, matY - 8);
        graphics.lineTo(matX, matY - 2);
        graphics.lineTo(matX + 14, matY - 8);
    }

    /* ------------------------------------------------------------------ */
    /* Tea House — stepped curved roof, hanging lanterns, steam            */
    /* ------------------------------------------------------------------ */
    static drawTeaHouse(graphics, state) {
        const trim = BuildingRenderer.tone(CREAM, state);
        const deck = BuildingRenderer.tone(PAPER_WARM, state);
        const deckLip = BuildingRenderer.tone(BuildingRenderer.shade(PAPER_WARM, 0.24), state);
        const wallLit = BuildingRenderer.tone(CREAM, state);
        const wallShade = BuildingRenderer.tone(BuildingRenderer.mix(PAPER_WARM, PEACH, 0.42), state);
        const roofMain = BuildingRenderer.tone(ROSE, state);
        const roofShade = BuildingRenderer.tone(WINE, state);
        const roofTrim = BuildingRenderer.tone(PEACH, state);
        const dims = { hw: 94, hh: 40, baseY: 6, height: 96 };

        BuildingRenderer.drawPlinth(graphics, state, {
            hw: 122,
            hh: 52,
            cy: 8,
            top: deck,
            lip: deckLip,
            trim,
            ring: BuildingRenderer.tone(PEACH, state)
        });
        BuildingRenderer.drawWalls(graphics, state, dims, wallLit, wallShade, trim);

        BuildingRenderer.drawWindow(graphics, state, dims, 'left', 0.1, 0.4, 0.32, 0.64, { lattice: true });
        BuildingRenderer.drawWindow(graphics, state, dims, 'left', 0.5, 0.82, 0.32, 0.64, { lattice: true });
        BuildingRenderer.drawWindow(graphics, state, dims, 'right', 0.08, 0.3, 0.34, 0.64, { lattice: true });

        // Lower roof tier.
        graphics.beginFill(roofMain, 1);
        graphics.lineStyle(3, INK, 1);
        graphics.moveTo(-118, -92);
        graphics.quadraticCurveTo(-108, -120, -54, -128);
        graphics.lineTo(54, -128);
        graphics.quadraticCurveTo(108, -120, 118, -92);
        graphics.quadraticCurveTo(62, -54, 0, -38);
        graphics.quadraticCurveTo(-62, -54, -118, -92);
        graphics.closePath();
        graphics.endFill();

        graphics.beginFill(roofShade, state.active ? 0.45 : 0.38);
        graphics.lineStyle(0);
        graphics.moveTo(-118, -92);
        graphics.quadraticCurveTo(-62, -54, 0, -38);
        graphics.quadraticCurveTo(62, -54, 118, -92);
        graphics.quadraticCurveTo(58, -72, 0, -58);
        graphics.quadraticCurveTo(-58, -72, -118, -92);
        graphics.closePath();
        graphics.endFill();

        graphics.beginFill(INK, 0);
        graphics.lineStyle(3, INK, 1);
        graphics.moveTo(-118, -92);
        graphics.quadraticCurveTo(-108, -120, -54, -128);
        graphics.lineTo(54, -128);
        graphics.quadraticCurveTo(108, -120, 118, -92);
        graphics.quadraticCurveTo(62, -54, 0, -38);
        graphics.quadraticCurveTo(-62, -54, -118, -92);
        graphics.closePath();
        graphics.endFill();

        graphics.lineStyle(5, roofTrim, state.active ? 0.85 : 0.4);
        graphics.moveTo(-118, -92);
        graphics.quadraticCurveTo(-62, -54, 0, -38);
        graphics.quadraticCurveTo(62, -54, 118, -92);
        graphics.lineStyle(2.5, INK, 0.3);
        graphics.moveTo(-54, -126);
        graphics.lineTo(54, -126);

        // Upturned eave tips.
        graphics.lineStyle(6, INK, 1);
        graphics.moveTo(-118, -92);
        graphics.quadraticCurveTo(-128, -98, -136, -110);
        graphics.moveTo(118, -92);
        graphics.quadraticCurveTo(128, -98, 136, -110);
        graphics.lineStyle(3.5, roofTrim, state.active ? 1 : 0.5);
        graphics.moveTo(-118, -92);
        graphics.quadraticCurveTo(-128, -98, -136, -110);
        graphics.moveTo(118, -92);
        graphics.quadraticCurveTo(128, -98, 136, -110);

        // Upper roof tier.
        graphics.beginFill(roofMain, 1);
        graphics.lineStyle(3, INK, 1);
        graphics.moveTo(-66, -136);
        graphics.quadraticCurveTo(-54, -186, 0, -202);
        graphics.quadraticCurveTo(54, -186, 66, -136);
        graphics.quadraticCurveTo(34, -122, 0, -116);
        graphics.quadraticCurveTo(-34, -122, -66, -136);
        graphics.closePath();
        graphics.endFill();

        graphics.beginFill(roofShade, state.active ? 0.42 : 0.36);
        graphics.lineStyle(0);
        graphics.moveTo(0, -202);
        graphics.quadraticCurveTo(54, -186, 66, -136);
        graphics.quadraticCurveTo(34, -122, 0, -116);
        graphics.quadraticCurveTo(20, -172, 0, -202);
        graphics.closePath();
        graphics.endFill();

        graphics.beginFill(INK, 0);
        graphics.lineStyle(3, INK, 1);
        graphics.moveTo(-66, -136);
        graphics.quadraticCurveTo(-54, -186, 0, -202);
        graphics.quadraticCurveTo(54, -186, 66, -136);
        graphics.quadraticCurveTo(34, -122, 0, -116);
        graphics.quadraticCurveTo(-34, -122, -66, -136);
        graphics.closePath();
        graphics.endFill();

        graphics.lineStyle(4, roofTrim, state.active ? 0.85 : 0.4);
        graphics.moveTo(-66, -136);
        graphics.quadraticCurveTo(-54, -186, 0, -202);
        graphics.quadraticCurveTo(54, -186, 66, -136);

        graphics.lineStyle(4, INK, 1);
        graphics.moveTo(-66, -136);
        graphics.quadraticCurveTo(-76, -140, -82, -148);
        graphics.moveTo(66, -136);
        graphics.quadraticCurveTo(76, -140, 82, -148);
        graphics.lineStyle(2.5, roofTrim, state.active ? 1 : 0.5);
        graphics.moveTo(-66, -136);
        graphics.quadraticCurveTo(-76, -140, -82, -148);
        graphics.moveTo(66, -136);
        graphics.quadraticCurveTo(76, -140, 82, -148);

        // Finial.
        BuildingRenderer.post(graphics, [{ x: 0, y: -200 }, { x: 0, y: -218 }], BuildingRenderer.tone(WINE, state), 3);
        BuildingRenderer.glow(graphics, 0, -220, 12, BuildingRenderer.tone(MINT, state), state.active ? 0.3 : 0.08);
        graphics.beginFill(BuildingRenderer.tone(MINT, state), state.active ? 1 : 0.5);
        graphics.lineStyle(1.5, INK, 1);
        graphics.drawCircle(0, -220, 4.5);
        graphics.endFill();

        // Steam cup on the lower roof shoulder.
        BuildingRenderer.diamond(graphics, -88, -110, 11, 5, trim, 1, 2);
        BuildingRenderer.post(graphics, [{ x: -88, y: -110 }, { x: -88, y: -126 }], BuildingRenderer.tone(WINE, state), 3);
        BuildingRenderer.drawSteam(graphics, state, -88, -132, 0.6);

        // Airlock door.
        BuildingRenderer.drawAirlock(graphics, state, dims, {
            u0: 0.48,
            u1: 0.76,
            v1: 0.6,
            accent: MINT,
            stepWidth: 22,
            stepDepth: 9
        });

        // Hanging lanterns under the lower eaves.
        BuildingRenderer.drawLantern(graphics, state, -84, -54, { radius: 9, cord: 17 });
        BuildingRenderer.drawLantern(graphics, state, 84, -54, { radius: 9, cord: 17 });
    }

    /* ------------------------------------------------------------------ */
    /* Garden Dome — pressurised geodesic glasshouse                       */
    /* ------------------------------------------------------------------ */
    static drawClinic(graphics, state) {
        BuildingRenderer.drawHousing(graphics, state);
        const ink = BuildingRenderer.tone(INK, state);
        const cream = BuildingRenderer.tone(CREAM, state);
        const mint = BuildingRenderer.tone(MINT, state);
        graphics.beginFill(cream, 0.96);
        graphics.lineStyle(2.5, ink, 1);
        graphics.drawRoundedRect(-22, -96, 44, 25, 5);
        graphics.endFill();
        graphics.beginFill(mint, 1);
        graphics.lineStyle(2, ink, 1);
        graphics.drawRoundedRect(-16, -90, 32, 13, 3);
        graphics.endFill();
        graphics.beginFill(cream, 1);
        graphics.drawRect(-3, -89, 6, 11);
        graphics.drawRect(-9, -84, 18, 5);
        graphics.endFill();
    }

    static storeyTop(programId) {
        const heights = {
            housing: 112,
            canteen: 78,
            tea_house: 96,
            bathhouse: 96,
            garden_dome: 150,
            commons_beacon: 160,
            clinic: 112
        };
        return heights[programId] || 96;
    }

    static drawBathhouse(graphics, state) {
        BuildingRenderer.drawTeaHouse(graphics, state);
        const trim = BuildingRenderer.tone(CREAM, state);
        const water = BuildingRenderer.tone(0x9fe8ff, state);
        const deep = BuildingRenderer.tone(0x4fb8c9, state);

        // A sunken pool in front of the tea-room shell.
        graphics.beginFill(deep, state.active ? 0.9 : 0.5);
        graphics.lineStyle(4, INK, 1);
        graphics.drawEllipse(0, 24, 80, 24);
        graphics.endFill();
        graphics.beginFill(water, state.active ? 0.75 : 0.35);
        graphics.lineStyle(0);
        graphics.drawEllipse(0, 22, 62, 16);
        graphics.endFill();
        graphics.lineStyle(2, trim, state.active ? 0.8 : 0.3);
        graphics.drawEllipse(0, 22, 44, 10);

        // Steam curls.
        graphics.lineStyle(3, trim, state.active ? 0.7 : 0.25);
        for (const x of [-46, -18, 22, 50]) {
            graphics.moveTo(x, 10);
            graphics.quadraticCurveTo(x - 8, -8, x + 2, -24);
            graphics.quadraticCurveTo(x + 8, -38, x - 2, -50);
        }
    }

    static drawGardenDome(graphics, state) {
        const trim = BuildingRenderer.tone(CREAM, state);
        const deck = BuildingRenderer.tone(PAPER_WARM, state);
        const deckLip = BuildingRenderer.tone(BuildingRenderer.shade(PAPER_WARM, 0.24), state);
        const glass = BuildingRenderer.tone(MINT, state);
        const glassEdge = BuildingRenderer.tone(CYAN, state);
        const warm = BuildingRenderer.tone(SUN, state);
        const leaf = BuildingRenderer.tone(MINT, state);
        const leafSoft = BuildingRenderer.tone(MINT_SOFT, state);
        const leafDeep = BuildingRenderer.tone(BuildingRenderer.mix(MINT, INK, 0.35), state);
        const stem = BuildingRenderer.tone(BuildingRenderer.mix(CYAN, INK, 0.3), state);
        const metal = BuildingRenderer.tone(CREAM, state);
        const doorDark = BuildingRenderer.tone(WINE, state);
        const accent = BuildingRenderer.tone(MINT, state);
        const baseY = 12;

        BuildingRenderer.drawPlinth(graphics, state, {
            hw: 224,
            hh: 96,
            cy: baseY,
            top: deck,
            lip: deckLip,
            trim,
            ring: accent
        });

        // Plaza and warm interior light.
        graphics.beginFill(BuildingRenderer.tone(CREAM, state), state.active ? 0.5 : 0.3);
        graphics.lineStyle(2, accent, state.active ? 0.5 : 0.2);
        graphics.drawEllipse(0, baseY + 2, 186, 62);
        graphics.endFill();
        BuildingRenderer.glow(graphics, 0, -22, 150, warm, state.active ? 0.13 : 0.05);
        BuildingRenderer.glow(graphics, 0, 18, 160, leafSoft, state.active ? 0.14 : 0.05);

        // Raised interior beds.
        BuildingRenderer.diamond(graphics, -86, 24, 52, 20, BuildingRenderer.tone(PAPER_WARM, state), 1, 2);
        BuildingRenderer.diamond(graphics, -86, 18, 46, 17, BuildingRenderer.tone(PAPER, state), 1, 2);
        BuildingRenderer.diamond(graphics, 78, 20, 46, 18, BuildingRenderer.tone(PAPER_WARM, state), 1, 2);
        BuildingRenderer.diamond(graphics, 78, 14, 40, 15, BuildingRenderer.tone(PAPER, state), 1, 2);

        // Central tree and shrubs, all kept inside the glass.
        BuildingRenderer.post(graphics, [{ x: 0, y: 26 }, { x: 0, y: -56 }], stem, 4);
        BuildingRenderer.post(graphics, [{ x: 0, y: -18 }, { x: -28, y: -48 }], stem, 3);
        BuildingRenderer.post(graphics, [{ x: 0, y: -30 }, { x: 26, y: -56 }], stem, 3);

        graphics.beginFill(leafDeep, 1);
        graphics.lineStyle(0);
        graphics.drawCircle(0, -78, 31);
        graphics.drawCircle(-28, -60, 23);
        graphics.drawCircle(29, -62, 24);
        graphics.endFill();
        graphics.beginFill(leaf, 1);
        graphics.drawCircle(-8, -86, 21);
        graphics.drawCircle(-34, -66, 14);
        graphics.drawCircle(22, -72, 16);
        graphics.endFill();
        graphics.beginFill(leafSoft, 0.85);
        graphics.drawCircle(-14, -92, 11);
        graphics.drawCircle(-40, -72, 7);
        graphics.drawCircle(16, -80, 8);
        graphics.endFill();

        graphics.beginFill(leafDeep, 1);
        graphics.lineStyle(0);
        graphics.drawCircle(-108, 4, 16);
        graphics.drawCircle(-86, -4, 21);
        graphics.drawCircle(-62, 4, 15);
        graphics.drawCircle(58, 2, 15);
        graphics.drawCircle(82, -6, 20);
        graphics.drawCircle(104, 4, 13);
        graphics.endFill();
        graphics.beginFill(leaf, 1);
        graphics.drawCircle(-112, -4, 9);
        graphics.drawCircle(-88, -12, 12);
        graphics.drawCircle(54, -6, 9);
        graphics.drawCircle(86, -14, 11);
        graphics.endFill();
        graphics.beginFill(leafSoft, 0.8);
        graphics.drawCircle(-116, -8, 5);
        graphics.drawCircle(-92, -16, 6);
        graphics.drawCircle(82, -18, 5);
        graphics.endFill();

        BuildingRenderer.leaf(graphics, -126, 26, -152, -16, 11, leaf);
        BuildingRenderer.leaf(graphics, -116, 28, -126, -8, 8, leafSoft);
        BuildingRenderer.leaf(graphics, 66, 28, 96, -14, 9, leaf);
        BuildingRenderer.leaf(graphics, 120, 28, 146, -6, 10, leafSoft);

        const blooms = [
            { x: -102, y: -12, color: BUBBLEGUM },
            { x: -72, y: -6, color: SUN },
            { x: 70, y: -10, color: PEACH },
            { x: 96, y: -12, color: LAVENDER }
        ];
        for (const bloom of blooms) {
            graphics.beginFill(BuildingRenderer.tone(bloom.color, state), state.active ? 0.95 : 0.5);
            graphics.lineStyle(1, INK, 0.6);
            graphics.drawCircle(bloom.x, bloom.y, 4);
            graphics.endFill();
        }

        // The glass shell: greenery stays behind the glaze.
        graphics.beginFill(glass, state.active ? 0.2 : 0.12);
        graphics.lineStyle(3, glassEdge, state.active ? 0.75 : 0.35);
        graphics.moveTo(-172, 4);
        graphics.quadraticCurveTo(-172, -140, -98, -192);
        graphics.quadraticCurveTo(-44, -222, 0, -222);
        graphics.quadraticCurveTo(44, -222, 98, -192);
        graphics.quadraticCurveTo(172, -140, 172, 4);
        graphics.quadraticCurveTo(172, 60, 0, 66);
        graphics.quadraticCurveTo(-172, 60, -172, 4);
        graphics.closePath();
        graphics.endFill();

        // Geodesic meridians and rim.
        const strutAlpha = state.active ? 0.32 : 0.16;
        const rim = [];
        graphics.lineStyle(2, INK, strutAlpha);
        for (let i = 0; i <= 6; i += 1) {
            const angle = (Math.PI * i) / 6;
            const start = {
                x: 172 * Math.cos(angle),
                y: 4 + 62 * Math.sin(angle)
            };
            rim.push(start);
            graphics.moveTo(start.x, start.y);
            graphics.quadraticCurveTo(start.x * 0.58, -100, 0, -222);
        }

        graphics.lineStyle(1.5, INK, strutAlpha * 0.7);
        for (let i = 1; i <= 3; i += 1) {
            const x = -144 + i * 72;
            const backY = 4 - 62 * Math.sqrt(Math.max(0, 1 - (x * x) / (172 * 172)));
            graphics.moveTo(x, backY);
            graphics.quadraticCurveTo(x * 0.58, -100, 0, -222);
        }

        BuildingRenderer.ellipseRing(graphics, 0, -48, 150, 40, INK, 1.5, strutAlpha);
        BuildingRenderer.ellipseRing(graphics, 0, -124, 118, 30, INK, 1.5, strutAlpha);
        BuildingRenderer.ellipseRing(graphics, 0, -180, 64, 17, INK, 1.5, strutAlpha);

        graphics.lineStyle(2.5, INK, strutAlpha + 0.12);
        for (let i = 1; i < rim.length; i += 1) {
            graphics.moveTo(rim[i - 1].x, rim[i - 1].y);
            graphics.lineTo(rim[i].x, rim[i].y);
        }
        graphics.beginFill(accent, state.active ? 0.7 : 0.35);
        graphics.lineStyle(0);
        for (const point of rim) graphics.drawCircle(point.x, point.y, 2.4);
        graphics.endFill();

        graphics.lineStyle(1.5, INK, strutAlpha * 0.9);
        graphics.moveTo(154, 24);
        graphics.lineTo(58, -112);
        graphics.moveTo(86, 58);
        graphics.lineTo(0, -100);
        graphics.moveTo(154, 24);
        graphics.lineTo(124, -88);
        graphics.moveTo(-154, 24);
        graphics.lineTo(-58, -112);
        graphics.moveTo(-86, 58);
        graphics.lineTo(0, -100);
        graphics.moveTo(-154, 24);
        graphics.lineTo(-124, -88);
        graphics.moveTo(66, -160);
        graphics.lineTo(116, -124);
        graphics.moveTo(-66, -160);
        graphics.lineTo(-116, -124);

        // North-west glass highlight.
        graphics.lineStyle(3, trim, state.active ? 0.45 : 0.2);
        graphics.moveTo(-148, -24);
        graphics.quadraticCurveTo(-140, -140, -44, -192);
        graphics.lineStyle(2, trim, state.active ? 0.22 : 0.1);
        graphics.moveTo(-160, 8);
        graphics.quadraticCurveTo(-158, -94, -94, -164);

        // Condensation on the panes.
        const drops = [
            { x: -158, y: 16, r: 2.5 },
            { x: -146, y: -4, r: 2 },
            { x: -132, y: -22, r: 2.8 },
            { x: 148, y: 6, r: 2.6 },
            { x: 136, y: -12, r: 2.2 },
            { x: 158, y: 24, r: 3 },
            { x: -114, y: 44, r: 2.2 },
            { x: 116, y: 40, r: 2.2 }
        ];
        graphics.beginFill(BuildingRenderer.tone(MINT_SOFT, state), state.active ? 0.55 : 0.3);
        graphics.lineStyle(0);
        for (const drop of drops) graphics.drawEllipse(drop.x, drop.y, drop.r, drop.r * 1.7);
        graphics.endFill();
        graphics.lineStyle(1.5, trim, state.active ? 0.35 : 0.15);
        graphics.moveTo(-132, -18);
        graphics.quadraticCurveTo(-128, 4, -134, 18);
        graphics.moveTo(140, 4);
        graphics.quadraticCurveTo(136, 20, 141, 32);

        // Ground lamps mark the landmark from the map overview.
        const lamps = [
            { x: -164, y: 22 },
            { x: 164, y: 22 },
            { x: -60, y: 54 },
            { x: 58, y: 52 }
        ];
        for (const lamp of lamps) {
            BuildingRenderer.glow(graphics, lamp.x, lamp.y, 10, accent, state.active ? 0.22 : 0.06);
            graphics.beginFill(accent, state.active ? 0.95 : 0.5);
            graphics.lineStyle(1.5, INK, 0.6);
            graphics.drawCircle(lamp.x, lamp.y, 3);
            graphics.endFill();
        }

        // Airlock vestibule on the south-east rim.
        const vx = 26;
        const vy = 62;
        const vw = 30;
        const vh = 62;
        BuildingRenderer.glow(graphics, vx, vy - 12, 44, accent, state.active ? 0.22 : 0.08);

        BuildingRenderer.diamond(graphics, vx + 8, vy + 14, 36, 12, BuildingRenderer.tone(BuildingRenderer.shade(PAPER_WARM, 0.2), state), 1, 2.5);
        BuildingRenderer.diamond(graphics, vx + 6, vy + 8, 32, 10, BuildingRenderer.tone(PAPER, state), 1, 2.5);

        graphics.beginFill(metal, 1);
        graphics.lineStyle(3, INK, 1);
        graphics.moveTo(vx - vw, vy);
        graphics.lineTo(vx - vw, vy - vh * 0.56);
        graphics.quadraticCurveTo(vx - vw, vy - vh, vx, vy - vh);
        graphics.quadraticCurveTo(vx + vw, vy - vh, vx + vw, vy - vh * 0.56);
        graphics.lineTo(vx + vw, vy);
        graphics.closePath();
        graphics.endFill();

        graphics.lineStyle(2, accent, state.active ? 0.85 : 0.4);
        graphics.moveTo(vx - vw - 3, vy - vh * 0.5);
        graphics.quadraticCurveTo(vx - vw - 3, vy - vh - 3, vx, vy - vh - 3);
        graphics.quadraticCurveTo(vx + vw + 3, vy - vh - 3, vx + vw + 3, vy - vh * 0.5);

        const innerWidth = vw - 8;
        graphics.beginFill(doorDark, 1);
        graphics.lineStyle(2, INK, 1);
        graphics.moveTo(vx - innerWidth, vy);
        graphics.lineTo(vx - innerWidth, vy - vh * 0.5);
        graphics.quadraticCurveTo(vx - innerWidth, vy - vh * 0.88, vx, vy - vh * 0.88);
        graphics.quadraticCurveTo(vx + innerWidth, vy - vh * 0.88, vx + innerWidth, vy - vh * 0.5);
        graphics.lineTo(vx + innerWidth, vy);
        graphics.closePath();
        graphics.endFill();

        graphics.beginFill(warm, state.active ? 1 : 0.6);
        graphics.lineStyle(2, INK, 1);
        graphics.drawCircle(vx, vy - vh * 0.5, 9);
        graphics.endFill();
        graphics.lineStyle(1.2, INK, 0.8);
        graphics.moveTo(vx - 9, vy - vh * 0.5);
        graphics.lineTo(vx + 9, vy - vh * 0.5);
        graphics.moveTo(vx, vy - vh * 0.5 - 9);
        graphics.lineTo(vx, vy - vh * 0.5 + 9);

        graphics.lineStyle(1.5, INK, 0.75);
        graphics.moveTo(vx, vy - 2);
        graphics.lineTo(vx, vy - vh * 0.36);

        graphics.lineStyle(1.5, INK, 0.8);
        graphics.moveTo(vx, vy - vh);
        graphics.lineTo(vx, vy - vh - 6);
        graphics.beginFill(accent, state.active ? 1 : 0.55);
        graphics.lineStyle(1.5, INK, 1);
        graphics.drawCircle(vx, vy - vh - 9, 4);
        graphics.endFill();
    }

    /* ------------------------------------------------------------------ */
    /* Commons Beacon — art-deco prism-glass lighthouse                    */
    /* ------------------------------------------------------------------ */
    static drawAmphitheatre(graphics, state) {
        const trim = BuildingRenderer.tone(CREAM, state);
        const deck = BuildingRenderer.tone(PAPER_WARM, state);
        const deckLip = BuildingRenderer.tone(BuildingRenderer.shade(PAPER_WARM, 0.24), state);
        const stone = BuildingRenderer.tone(PAPER, state);
        const rose = BuildingRenderer.tone(ROSE, state);
        const warm = BuildingRenderer.tone(SUN, state);
        const mint = BuildingRenderer.tone(MINT, state);
        const ink = BuildingRenderer.tone(INK, state);

        BuildingRenderer.drawPlinth(graphics, state, {
            hw: 190,
            hh: 82,
            cy: 12,
            top: deck,
            lip: deckLip,
            trim
        });
        graphics.beginFill(stone, 1);
        graphics.lineStyle(3, ink, 1);
        graphics.drawEllipse(0, -26, 126, 50);
        graphics.endFill();
        for (let tier = 0; tier < 3; tier++) {
            graphics.beginFill(tier === 1 ? warm : deck, 1);
            graphics.lineStyle(2, ink, 0.9);
            graphics.drawEllipse(0, -18 + tier * 7, 104 - tier * 20, 36 - tier * 6);
            graphics.endFill();
        }
        graphics.beginFill(rose, 1);
        graphics.lineStyle(2.5, ink, 1);
        graphics.drawRoundedRect(-42, 13, 84, 22, 4);
        graphics.endFill();
        graphics.beginFill(trim, 1);
        graphics.drawRect(-30, 17, 60, 12);
        graphics.endFill();
        graphics.beginFill(mint, 0.95);
        for (let light = 0; light < 5; light++) {
            graphics.drawCircle(-46 + light * 23, -62 - (light % 2) * 5, 3.2);
        }
        graphics.endFill();
    }

    static drawCommonsBeacon(graphics, state) {
        const trim = BuildingRenderer.tone(CREAM, state);
        const deck = BuildingRenderer.tone(PAPER_WARM, state);
        const deckLip = BuildingRenderer.tone(BuildingRenderer.shade(PAPER_WARM, 0.24), state);
        const stone = BuildingRenderer.tone(PAPER, state);
        const stoneWarm = BuildingRenderer.tone(PAPER_WARM, state);
        const glassLit = BuildingRenderer.tone(BuildingRenderer.mix(LAVENDER, CREAM, 0.35), state);
        const glassShade = BuildingRenderer.tone(BuildingRenderer.mix(LAVENDER, PLUM, 0.22), state);
        const bandColor = BuildingRenderer.tone(MINT, state);
        const warm = BuildingRenderer.tone(SUN, state);
        const lens = BuildingRenderer.tone(MINT, state);
        const accent = BuildingRenderer.tone(CYAN, state);

        BuildingRenderer.drawPlinth(graphics, state, {
            hw: 158,
            hh: 66,
            cy: 10,
            top: deck,
            lip: deckLip,
            trim,
            ring: accent
        });

        // Stepped art-deco base.
        BuildingRenderer.diamond(graphics, 0, 32, 144, 60, deckLip, 1, 3);
        BuildingRenderer.diamond(graphics, 0, 20, 132, 55, stone, 1, 3);
        BuildingRenderer.diamond(graphics, 0, 4, 96, 40, stoneWarm, 1, 3);
        BuildingRenderer.diamond(graphics, 0, -8, 80, 33, stone, 1, 3);
        BuildingRenderer.diamond(graphics, 0, 58, 60, 24, deckLip, 1, 2.5);
        BuildingRenderer.diamond(graphics, 0, 50, 52, 21, stoneWarm, 1, 2.5);

        const baseLeft = { x: -58, y: -6 };
        const baseFront = { x: 0, y: 26 };
        const baseRight = { x: 58, y: -6 };
        const topLeft = { x: -28, y: -236 };
        const topFront = { x: 0, y: -212 };
        const topRight = { x: 28, y: -236 };

        BuildingRenderer.fill(graphics, [baseLeft, baseFront, topFront, topLeft], glassLit, 1, 3);
        BuildingRenderer.fill(graphics, [baseFront, baseRight, topRight, topFront], glassShade, 1, 3);

        graphics.lineStyle(1.5, INK, 0.22);
        graphics.moveTo(-38, 5);
        graphics.lineTo(-19, -230);
        graphics.moveTo(-19, 14);
        graphics.lineTo(-9, -224);
        graphics.moveTo(19, 14);
        graphics.lineTo(9, -224);
        graphics.moveTo(38, 5);
        graphics.lineTo(19, -230);

        const bands = [0.2, 0.46, 0.72];
        for (const t of bands) {
            const bl = {
                x: baseLeft.x + (topLeft.x - baseLeft.x) * t,
                y: baseLeft.y + (topLeft.y - baseLeft.y) * t
            };
            const bf = {
                x: 0,
                y: baseFront.y + (topFront.y - baseFront.y) * t
            };
            const br = {
                x: baseRight.x + (topRight.x - baseRight.x) * t,
                y: baseRight.y + (topRight.y - baseRight.y) * t
            };
            BuildingRenderer.fill(graphics, [
                bl,
                bf,
                br,
                { x: br.x, y: br.y - 7 },
                { x: 0, y: bf.y - 7 },
                { x: bl.x, y: bl.y - 7 }
            ], bandColor, 1, 1.5, 0.6);
        }

        const windows = [
            { x: -38, y: -74 },
            { x: -34, y: -136 },
            { x: -29, y: -196 },
            { x: 18, y: -66 },
            { x: 20, y: -126 },
            { x: 22, y: -186 }
        ];
        for (const window of windows) {
            graphics.beginFill(warm, state.active ? 0.95 : 0.45);
            graphics.lineStyle(1.5, INK, 1);
            graphics.moveTo(window.x, window.y);
            graphics.lineTo(window.x + 7, window.y + 2);
            graphics.lineTo(window.x + 7, window.y + 18);
            graphics.lineTo(window.x + 3.5, window.y + 22);
            graphics.lineTo(window.x, window.y + 18);
            graphics.closePath();
            graphics.endFill();
        }

        graphics.lineStyle(2, warm, state.active ? 0.5 : 0.2);
        graphics.moveTo(0, -188);
        graphics.lineTo(14, -200);
        graphics.lineTo(0, -212);
        graphics.moveTo(0, -206);
        graphics.lineTo(10, -214);
        graphics.lineTo(0, -222);

        // Shared light beams behind the crown.
        graphics.beginFill(warm, state.active ? 0.1 : 0.03);
        graphics.lineStyle(0);
        graphics.moveTo(0, -270);
        graphics.lineTo(-192, -372);
        graphics.lineTo(-96, -256);
        graphics.closePath();
        graphics.moveTo(0, -270);
        graphics.lineTo(192, -372);
        graphics.lineTo(96, -256);
        graphics.closePath();
        graphics.endFill();
        BuildingRenderer.glow(graphics, 0, -270, 64, warm, state.active ? 0.1 : 0.03);

        BuildingRenderer.diamond(graphics, 0, -240, 36, 14, lens, 1, 3);
        BuildingRenderer.diamond(graphics, 0, -252, 24, 10, trim, 1, 3);
        BuildingRenderer.post(graphics, [{ x: 0, y: -252 }, { x: 0, y: -262 }], trim, 3);

        graphics.beginFill(trim, 1);
        graphics.lineStyle(2.5, INK, 1);
        graphics.drawCircle(0, -276, 17);
        graphics.endFill();
        graphics.beginFill(warm, state.active ? 1 : 0.55);
        graphics.lineStyle(2, INK, 1);
        graphics.drawCircle(0, -276, 11);
        graphics.endFill();
        graphics.beginFill(trim, state.active ? 1 : 0.5);
        graphics.lineStyle(0);
        graphics.drawCircle(0, -279, 5);
        graphics.endFill();

        if (state.active) {
            graphics.lineStyle(3, trim, 0.9);
            graphics.moveTo(0, -312);
            graphics.lineTo(0, -328);
            graphics.moveTo(-18, -300);
            graphics.lineTo(-26, -308);
            graphics.moveTo(18, -300);
            graphics.lineTo(26, -308);
        }

        // Human-scale gatehouse at the foot of the wonder.
        const pavilion = { ox: 68, oy: 26, hw: 30, hh: 13, baseY: 0, height: 40 };
        BuildingRenderer.diamond(graphics, 68, 44, 38, 15, deckLip, 1, 2.5);
        BuildingRenderer.diamond(graphics, 68, 38, 33, 13, deck, 1, 2.5);
        BuildingRenderer.drawWalls(graphics, state, pavilion, trim, stoneWarm, trim);
        BuildingRenderer.drawWindow(graphics, state, pavilion, 'left', 0.2, 0.55, 0.35, 0.68, { lattice: true });
        BuildingRenderer.drawAirlock(graphics, state, pavilion, {
            u0: 0.3,
            u1: 0.86,
            v1: 0.7,
            accent: CYAN,
            step: false
        });
        BuildingRenderer.diamond(graphics, 68, -14, 30, 13, stoneWarm, 1, 2.5);
        BuildingRenderer.diamond(graphics, 68, -18, 22, 9, bandColor, 1, 2);
        graphics.lineStyle(2, accent, state.active ? 0.7 : 0.3);
        graphics.moveTo(50, 38);
        graphics.lineTo(68, 47);
        graphics.lineTo(86, 38);
    }
}
