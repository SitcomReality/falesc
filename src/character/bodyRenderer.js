import { SHAPES } from '../constants.js';

/**
 * Draw torso geometry (bodyG) at scale 1 and provide body metrics.
 */
export function drawBody(bodyG, palette, variations) {
    bodyG.clear();
    const bodyBaseH = SHAPES.BODY_HEIGHT * variations.bodyHeight;
    const bodyW = SHAPES.BODY_WIDTH;
    const outline = SHAPES.OUTLINE_THICKNESS;

    bodyG.lineStyle(outline, 0x000000, 1, 0.5);
    bodyG.beginFill(palette.body);
    bodyG.drawRoundedRect(-bodyW / 2, -bodyBaseH, bodyW, bodyBaseH, 4);
    bodyG.endFill();

    // Fake shadow under body (near the hip)
    bodyG.lineStyle(0);
    bodyG.beginFill(0x000000, 0.2);
    bodyG.drawRect(
        -bodyW / 2 + outline,
        -6,
        bodyW - outline * 2,
        4
    );
    bodyG.endFill();

    bodyG.position.set(0, 0);
    bodyG.rotation = 0;
    bodyG.scale.set(1, 1);

    return {
        bodyBaseH,
        bodyW
    };
}