import { SHAPES } from '../constants.js';

/**
 * Draw the simple shadow ellipse for a character.
 * Returns computed shadowOffsetY used by renderer positioning.
 */
export function drawShadow(shadowG, palette, variations) {
    shadowG.clear();

    const bodyBaseH = SHAPES.BODY_HEIGHT * variations.bodyHeight;
    // baseCenterY expected by CharacterRenderer; use same default reference
    const baseCenterY = -20;
    const legBaseY = baseCenterY + bodyBaseH / 2 - 2;
    const limbHLeg = SHAPES.LIMB_HEIGHT * variations.legLength + 2;
    const shadowYOffset = legBaseY + limbHLeg; // under the feet

    const bodyW = SHAPES.BODY_WIDTH;

    shadowG.beginFill(0x000000);
    shadowG.drawEllipse(0, shadowYOffset, bodyW * 0.9, 6);
    shadowG.endFill();

    return shadowYOffset;
}