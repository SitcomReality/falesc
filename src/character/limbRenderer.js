import { SHAPES } from '../constants.js';

/**
 * Draw static limb geometry and provide helpers for arms/legs.
 */
export function drawLimbGraphics(graphics, limbHeight, color, outline) {
    graphics.clear();
    graphics.lineStyle(outline, 0x000000, 1, 0.5);
    graphics.beginFill(color);
    const limbW = SHAPES.LIMB_WIDTH;
    graphics.drawRoundedRect(-limbW / 2, 0, limbW, limbHeight, limbW / 2);
    graphics.endFill();
    graphics.position.set(0, 0);
    graphics.rotation = 0;
    graphics.scale.set(1, 1);
}

export function drawArmGraphics(graphics, armHeight, color, outline) {
    // Arms reuse similar rect but are always drawn with arms color.
    drawLimbGraphics(graphics, armHeight, color, outline);
}

