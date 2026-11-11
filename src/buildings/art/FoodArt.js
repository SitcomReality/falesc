/* Canteen and tea house silhouettes. */
import { INK, WINE, ROSE, CORAL, PEACH, PAPER, PAPER_WARM, CREAM, MINT } from '../BuildingPalette.js';
import { diamond, drawAirlock, drawLantern, drawPlinth, drawSteam, drawWalls, drawWindow, fill, glow, mix, post, shade, tone, wallPoint } from '../BuildingPrimitives.js';

export function drawCanteen(graphics, state) {
    const trim = tone(CREAM, state);
    const deck = tone(PAPER_WARM, state);
    const deckLip = tone(shade(PAPER_WARM, 0.24), state);
    const wallLit = tone(CREAM, state);
    const wallShade = tone(mix(PAPER_WARM, PEACH, 0.42), state);
    const roof = tone(PAPER, state);
    const fascia = tone(CORAL, state);
    const awningLight = tone(CORAL, state);
    const awningPale = tone(CREAM, state);
    const mint = tone(MINT, state);
    const dims = { hw: 110, hh: 46, baseY: 8, height: 78 };

    drawPlinth(graphics, state, {
        hw: 132,
        hh: 58,
        cy: 10,
        top: deck,
        lip: deckLip,
        trim,
        ring: tone(CORAL, state)
    });
    drawWalls(graphics, state, dims, wallLit, wallShade, trim);

    drawWindow(graphics, state, dims, 'left', 0.08, 0.46, 0.26, 0.62, { lattice: true });
    drawWindow(graphics, state, dims, 'left', 0.54, 0.92, 0.26, 0.62, { lattice: true });
    drawWindow(graphics, state, dims, 'right', 0.06, 0.4, 0.3, 0.62, { lattice: false });

    // Serving counter under the south-east window.
    const counterA = wallPoint('right', 0.04, 0.31, dims);
    const counterB = wallPoint('right', 0.42, 0.31, dims);
    fill(graphics, [
        counterA,
        counterB,
        { x: counterB.x + 8, y: counterB.y + 7 },
        { x: counterA.x + 8, y: counterA.y + 7 }
    ], tone(PEACH, state), 1, 2);
    graphics.lineStyle(2, trim, state.active ? 0.8 : 0.4);
    graphics.moveTo(counterA.x + 2, counterA.y + 2);
    graphics.lineTo(counterB.x + 2, counterB.y + 2);

    // Low broad roof with a coral fascia.
    const left = { x: -110, y: -70 };
    const front = { x: 0, y: -24 };
    const right = { x: 110, y: -70 };
    const back = { x: 0, y: -116 };
    fill(graphics, [left, front, right, back], roof, 1, 3);
    graphics.lineStyle(3, trim, state.active ? 0.55 : 0.25);
    graphics.moveTo(back.x + 4, back.y + 8);
    graphics.lineTo(left.x + 6, left.y + 4);
    graphics.moveTo(back.x + 4, back.y + 8);
    graphics.lineTo(right.x - 6, right.y + 4);
    post(graphics, [left, front, right], fascia, 6, state.active ? 1 : 0.7);

    // Roof steam vent.
    diamond(graphics, -28, -90, 18, 8, tone(PAPER_WARM, state), 1, 2);
    diamond(graphics, -28, -98, 16, 7, trim, 1, 2);
    post(graphics, [{ x: -28, y: -98 }, { x: -28, y: -120 }], tone(WINE, state), 4);
    diamond(graphics, -28, -122, 12, 5, mint, 1, 2);
    drawSteam(graphics, state, -28, -130, 0.9);

    // Striped awning over the south-east wall.
    const mountA = wallPoint('right', -0.04, 0.94, dims);
    const mountB = wallPoint('right', 1.04, 0.94, dims);
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
        fill(graphics, [
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
    post(graphics, [
        { x: mountA.x + over.x, y: mountA.y + over.y },
        wallPoint('right', 0.03, 0.74, dims)
    ], trim, 2.5, 0.75);
    post(graphics, [
        { x: mountB.x + over.x, y: mountB.y + over.y },
        wallPoint('right', 0.97, 0.74, dims)
    ], trim, 2.5, 0.75);

    // Airlock door and the little queue step and mat.
    const step = drawAirlock(graphics, state, dims, {
        u0: 0.52,
        u1: 0.84,
        v1: 0.54,
        accent: MINT,
        stepWidth: 24,
        stepDepth: 10
    });
    const matX = step.x;
    const matY = step.y + 2;
    graphics.beginFill(tone(CORAL, state), 1);
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

export function drawTeaHouse(graphics, state) {
    const trim = tone(CREAM, state);
    const deck = tone(PAPER_WARM, state);
    const deckLip = tone(shade(PAPER_WARM, 0.24), state);
    const wallLit = tone(CREAM, state);
    const wallShade = tone(mix(PAPER_WARM, PEACH, 0.42), state);
    const roofMain = tone(ROSE, state);
    const roofShade = tone(WINE, state);
    const roofTrim = tone(PEACH, state);
    const dims = { hw: 94, hh: 40, baseY: 6, height: 96 };

    drawPlinth(graphics, state, {
        hw: 122,
        hh: 52,
        cy: 8,
        top: deck,
        lip: deckLip,
        trim,
        ring: tone(PEACH, state)
    });
    drawWalls(graphics, state, dims, wallLit, wallShade, trim);

    drawWindow(graphics, state, dims, 'left', 0.1, 0.4, 0.32, 0.64, { lattice: true });
    drawWindow(graphics, state, dims, 'left', 0.5, 0.82, 0.32, 0.64, { lattice: true });
    drawWindow(graphics, state, dims, 'right', 0.08, 0.3, 0.34, 0.64, { lattice: true });

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
    post(graphics, [{ x: 0, y: -200 }, { x: 0, y: -218 }], tone(WINE, state), 3);
    glow(graphics, 0, -220, 12, tone(MINT, state), state.active ? 0.3 : 0.08);
    graphics.beginFill(tone(MINT, state), state.active ? 1 : 0.5);
    graphics.lineStyle(1.5, INK, 1);
    graphics.drawCircle(0, -220, 4.5);
    graphics.endFill();

    // Steam cup on the lower roof shoulder.
    diamond(graphics, -88, -110, 11, 5, trim, 1, 2);
    post(graphics, [{ x: -88, y: -110 }, { x: -88, y: -126 }], tone(WINE, state), 3);
    drawSteam(graphics, state, -88, -132, 0.6);

    // Airlock door.
    drawAirlock(graphics, state, dims, {
        u0: 0.48,
        u1: 0.76,
        v1: 0.6,
        accent: MINT,
        stepWidth: 22,
        stepDepth: 9
    });

    // Hanging lanterns under the lower eaves.
    drawLantern(graphics, state, -84, -54, { radius: 9, cord: 17 });
    drawLantern(graphics, state, 84, -54, { radius: 9, cord: 17 });
}

