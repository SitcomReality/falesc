/* Housing and the shared silhouette primitives it composes. */
import { INK, WINE, ROSE, CORAL, BUBBLEGUM, PEACH, SUN, PAPER_WARM, CREAM, MINT, LAVENDER } from '../BuildingPalette.js';
import { drawAirlock, drawLantern, drawPlinth, drawWalls, drawWindow, mix, post, quadPoint, shade, tone } from '../BuildingPrimitives.js';

export function drawHousing(graphics, state) {
    const trim = tone(CREAM, state);
    const deck = tone(PAPER_WARM, state);
    const deckLip = tone(shade(PAPER_WARM, 0.24), state);
    const wallLit = tone(CREAM, state);
    const wallShade = tone(mix(PAPER_WARM, PEACH, 0.45), state);
    const roofLit = tone(PEACH, state);
    const roofShade = tone(ROSE, state);
    const warm = tone(SUN, state);
    const metal = tone(WINE, state);
    const dims = { hw: 96, hh: 42, baseY: 6, height: 112 };

    drawPlinth(graphics, state, {
        hw: 124,
        hh: 54,
        cy: 8,
        top: deck,
        lip: deckLip,
        trim,
        ring: tone(PEACH, state)
    });
    drawWalls(graphics, state, dims, wallLit, wallShade, trim);

    drawWindow(graphics, state, dims, 'left', 0.3, 0.72, 0.36, 0.68, { lattice: true });
    drawWindow(graphics, state, dims, 'left', 0.08, 0.24, 0.4, 0.62, { lattice: false });
    drawWindow(graphics, state, dims, 'right', 0.07, 0.28, 0.36, 0.66, { lattice: true });

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

    drawAirlock(graphics, state, dims, {
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
    post(graphics, [
        { x: lampX, y: 12 },
        { x: lampX, y: lampTopY },
        { x: lampX + 16, y: lampTopY - 6 }
    ], metal, 4);
    drawLantern(graphics, state, lampX + 16, lampTopY - 2, { radius: 8, cord: 0 });

    const buntStart = { x: -112, y: -100 };
    const buntControl = { x: -10, y: -58 };
    const buntEnd = { x: lampX + 16, y: lampTopY - 14 };
    graphics.lineStyle(1.5, INK, state.active ? 0.8 : 0.35);
    graphics.moveTo(buntStart.x, buntStart.y);
    graphics.quadraticCurveTo(buntControl.x, buntControl.y, buntEnd.x, buntEnd.y);
    const flags = [BUBBLEGUM, MINT, SUN, CORAL, LAVENDER];
    for (let i = 0; i < flags.length; i += 1) {
        const point = quadPoint(buntStart, buntControl, buntEnd, (i + 1) / 6);
        graphics.beginFill(tone(flags[i], state), state.active ? 1 : 0.5);
        graphics.lineStyle(1, INK, 0.8);
        graphics.moveTo(point.x - 4, point.y);
        graphics.lineTo(point.x + 6, point.y + 2);
        graphics.lineTo(point.x - 1, point.y + 9);
        graphics.closePath();
        graphics.endFill();
    }
}

