/* Garden dome, observatory and commons beacon silhouettes. */
import { INK, PLUM, WINE, BUBBLEGUM, PEACH, SUN, PAPER, PAPER_WARM, CREAM, MINT, MINT_SOFT, CYAN, LAVENDER } from '../BuildingPalette.js';
import { diamond, drawAirlock, drawLeaf, drawPlinth, drawWalls, drawWindow, ellipseRing, fill, glow, mix, post, shade, tone } from '../BuildingPrimitives.js';
import { drawHousing } from '../art/HousingArt.js';

export function drawGardenDome(graphics, state) {
    const trim = tone(CREAM, state);
    const deck = tone(PAPER_WARM, state);
    const deckLip = tone(shade(PAPER_WARM, 0.24), state);
    const glass = tone(MINT, state);
    const glassEdge = tone(CYAN, state);
    const warm = tone(SUN, state);
    const leaf = tone(MINT, state);
    const leafSoft = tone(MINT_SOFT, state);
    const leafDeep = tone(mix(MINT, INK, 0.35), state);
    const stem = tone(mix(CYAN, INK, 0.3), state);
    const metal = tone(CREAM, state);
    const doorDark = tone(WINE, state);
    const accent = tone(MINT, state);
    const baseY = 12;

    drawPlinth(graphics, state, {
        hw: 224,
        hh: 96,
        cy: baseY,
        top: deck,
        lip: deckLip,
        trim,
        ring: accent
    });

    // Plaza and warm interior light.
    graphics.beginFill(tone(CREAM, state), state.active ? 0.5 : 0.3);
    graphics.lineStyle(2, accent, state.active ? 0.5 : 0.2);
    graphics.drawEllipse(0, baseY + 2, 186, 62);
    graphics.endFill();
    glow(graphics, 0, -22, 150, warm, state.active ? 0.13 : 0.05);
    glow(graphics, 0, 18, 160, leafSoft, state.active ? 0.14 : 0.05);

    // Raised interior beds.
    diamond(graphics, -86, 24, 52, 20, tone(PAPER_WARM, state), 1, 2);
    diamond(graphics, -86, 18, 46, 17, tone(PAPER, state), 1, 2);
    diamond(graphics, 78, 20, 46, 18, tone(PAPER_WARM, state), 1, 2);
    diamond(graphics, 78, 14, 40, 15, tone(PAPER, state), 1, 2);

    // Central tree and shrubs, all kept inside the glass.
    post(graphics, [{ x: 0, y: 26 }, { x: 0, y: -56 }], stem, 4);
    post(graphics, [{ x: 0, y: -18 }, { x: -28, y: -48 }], stem, 3);
    post(graphics, [{ x: 0, y: -30 }, { x: 26, y: -56 }], stem, 3);

    graphics.beginFill(leafDeep, 1);
    graphics.lineStyle(0);
    graphics.drawCircle(0, -78, 31);
    graphics.drawCircle(-28, -60, 23);
    graphics.drawCircle(29, -62, 24);
    graphics.endFill();
    graphics.beginFill(1);
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
    graphics.beginFill(1);
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

    drawLeaf(graphics, -126, 26, -152, -16, 11, leaf);
    drawLeaf(graphics, -116, 28, -126, -8, 8, leafSoft);
    drawLeaf(graphics, 66, 28, 96, -14, 9, leaf);
    drawLeaf(graphics, 120, 28, 146, -6, 10, leafSoft);

    const blooms = [
        { x: -102, y: -12, color: BUBBLEGUM },
        { x: -72, y: -6, color: SUN },
        { x: 70, y: -10, color: PEACH },
        { x: 96, y: -12, color: LAVENDER }
    ];
    for (const bloom of blooms) {
        graphics.beginFill(tone(bloom.color, state), state.active ? 0.95 : 0.5);
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

    ellipseRing(graphics, 0, -48, 150, 40, INK, 1.5, strutAlpha);
    ellipseRing(graphics, 0, -124, 118, 30, INK, 1.5, strutAlpha);
    ellipseRing(graphics, 0, -180, 64, 17, INK, 1.5, strutAlpha);

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
    graphics.beginFill(tone(MINT_SOFT, state), state.active ? 0.55 : 0.3);
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
        glow(graphics, lamp.x, lamp.y, 10, accent, state.active ? 0.22 : 0.06);
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
    glow(graphics, vx, vy - 12, 44, accent, state.active ? 0.22 : 0.08);

    diamond(graphics, vx + 8, vy + 14, 36, 12, tone(shade(PAPER_WARM, 0.2), state), 1, 2.5);
    diamond(graphics, vx + 6, vy + 8, 32, 10, tone(PAPER, state), 1, 2.5);

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

export function drawObservatory(graphics, state) {
    drawHousing(graphics, state);
    const trim = tone(CREAM, state);
    const dome = tone(LAVENDER, state);
    const glass = tone(MINT, state);
    const ink = tone(INK, state);
    const metal = tone(PAPER_WARM, state);
    graphics.beginFill(dome, 1);
    graphics.lineStyle(3, ink, 1);
    graphics.drawEllipse(0, -98, 54, 34);
    graphics.endFill();
    graphics.beginFill(trim, 1);
    graphics.lineStyle(2, ink, 1);
    graphics.drawEllipse(0, -98, 44, 24);
    graphics.endFill();
    graphics.beginFill(glass, 0.95);
    graphics.drawRect(-4, -118, 8, 34);
    graphics.endFill();
    graphics.lineStyle(7, metal, 1);
    graphics.moveTo(-18, -112);
    graphics.lineTo(34, -132);
    graphics.lineStyle(3, ink, 0.9);
    graphics.moveTo(34, -132);
    graphics.lineTo(40, -135);
}

export function drawCommonsBeacon(graphics, state) {
    const trim = tone(CREAM, state);
    const deck = tone(PAPER_WARM, state);
    const deckLip = tone(shade(PAPER_WARM, 0.24), state);
    const stone = tone(PAPER, state);
    const stoneWarm = tone(PAPER_WARM, state);
    const glassLit = tone(mix(LAVENDER, CREAM, 0.35), state);
    const glassShade = tone(mix(LAVENDER, PLUM, 0.22), state);
    const bandColor = tone(MINT, state);
    const warm = tone(SUN, state);
    const lens = tone(MINT, state);
    const accent = tone(CYAN, state);

    drawPlinth(graphics, state, {
        hw: 158,
        hh: 66,
        cy: 10,
        top: deck,
        lip: deckLip,
        trim,
        ring: accent
    });

    // Stepped art-deco base.
    diamond(graphics, 0, 32, 144, 60, deckLip, 1, 3);
    diamond(graphics, 0, 20, 132, 55, stone, 1, 3);
    diamond(graphics, 0, 4, 96, 40, stoneWarm, 1, 3);
    diamond(graphics, 0, -8, 80, 33, stone, 1, 3);
    diamond(graphics, 0, 58, 60, 24, deckLip, 1, 2.5);
    diamond(graphics, 0, 50, 52, 21, stoneWarm, 1, 2.5);

    const baseLeft = { x: -58, y: -6 };
    const baseFront = { x: 0, y: 26 };
    const baseRight = { x: 58, y: -6 };
    const topLeft = { x: -28, y: -236 };
    const topFront = { x: 0, y: -212 };
    const topRight = { x: 28, y: -236 };

    fill(graphics, [baseLeft, baseFront, topFront, topLeft], glassLit, 1, 3);
    fill(graphics, [baseFront, baseRight, topRight, topFront], glassShade, 1, 3);

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
        fill(graphics, [
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
    glow(graphics, 0, -270, 64, warm, state.active ? 0.1 : 0.03);

    diamond(graphics, 0, -240, 36, 14, lens, 1, 3);
    diamond(graphics, 0, -252, 24, 10, trim, 1, 3);
    post(graphics, [{ x: 0, y: -252 }, { x: 0, y: -262 }], trim, 3);

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
    diamond(graphics, 68, 44, 38, 15, deckLip, 1, 2.5);
    diamond(graphics, 68, 38, 33, 13, deck, 1, 2.5);
    drawWalls(graphics, state, pavilion, trim, stoneWarm, trim);
    drawWindow(graphics, state, pavilion, 'left', 0.2, 0.55, 0.35, 0.68, { lattice: true });
    drawAirlock(graphics, state, pavilion, {
        u0: 0.3,
        u1: 0.86,
        v1: 0.7,
        accent: CYAN,
        step: false
    });
    diamond(graphics, 68, -14, 30, 13, stoneWarm, 1, 2.5);
    diamond(graphics, 68, -18, 22, 9, bandColor, 1, 2);
    graphics.lineStyle(2, accent, state.active ? 0.7 : 0.3);
    graphics.moveTo(50, 38);
    graphics.lineTo(68, 47);
    graphics.lineTo(86, 38);
}

