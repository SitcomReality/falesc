/* Clinic, bathhouse, workshop, amphitheatre and creche silhouettes. */
import { INK, ROSE, SUN, PAPER, PAPER_WARM, CREAM, MINT } from '../BuildingPalette.js';
import { drawHousing } from '../art/HousingArt.js';
import { drawPlinth, shade, tone } from '../BuildingPrimitives.js';
import { drawTeaHouse } from '../art/FoodArt.js';

export function drawClinic(graphics, state) {
    drawHousing(graphics, state);
    const ink = tone(INK, state);
    const cream = tone(CREAM, state);
    const mint = tone(MINT, state);
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

export function drawBathhouse(graphics, state) {
    drawTeaHouse(graphics, state);
    const trim = tone(CREAM, state);
    const water = tone(0x9fe8ff, state);
    const deep = tone(0x4fb8c9, state);

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

export function drawWorkshop(graphics, state) {
    drawHousing(graphics, state);
    const gold = tone(0xFFD36E, state);
    const ink = tone(INK, state);
    graphics.beginFill(gold, 1);
    graphics.lineStyle(2, ink, 1);
    graphics.drawRect(-46, -76, 22, 14);
    graphics.endFill();
    graphics.beginFill(0xC9B6FF, 1);
    graphics.drawRect(22, -76, 22, 14);
    graphics.endFill();
    graphics.lineStyle(2, ink, 1);
    graphics.moveTo(-42, -62);
    graphics.lineTo(-28, -62);
    graphics.moveTo(26, -62);
    graphics.lineTo(40, -62);
}

export function drawAmphitheatre(graphics, state) {
    const trim = tone(CREAM, state);
    const deck = tone(PAPER_WARM, state);
    const deckLip = tone(shade(PAPER_WARM, 0.24), state);
    const stone = tone(PAPER, state);
    const rose = tone(ROSE, state);
    const warm = tone(SUN, state);
    const mint = tone(MINT, state);
    const ink = tone(INK, state);

    drawPlinth(graphics, state, {
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

export function drawCreche(graphics, state) {
    drawHousing(graphics, state);
    const pink = tone(0xFFB3C7, state);
    const ink = tone(INK, state);
    graphics.beginFill(pink, 1);
    graphics.lineStyle(2, ink, 1);
    graphics.drawPolygon([-26, -104, 26, -104, 0, -128]);
    graphics.endFill();
    graphics.beginFill(0xFFD36E, 1);
    graphics.drawCircle(46, -64, 6);
    graphics.endFill();
    graphics.lineStyle(2, ink, 1);
    graphics.moveTo(46, -58);
    graphics.lineTo(46, -38);
}

