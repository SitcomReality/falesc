import { SHAPES } from '../constants.js';

/**
 * Draw head geometry and simple highlight.
 */
export function drawHead(headG, palette) {
    headG.clear();
    const headR = SHAPES.HEAD_RADIUS;
    const outline = SHAPES.OUTLINE_THICKNESS;

    headG.lineStyle(outline, 0x000000, 1, 0.5);
    headG.beginFill(palette.head);
    headG.drawCircle(0, 0, headR);
    headG.endFill();

    // Highlight on head
    headG.lineStyle(0);
    headG.beginFill(0xFFFFFF, 0.3);
    headG.drawCircle(-headR / 3, -headR / 3, headR / 3);
    headG.endFill();

    headG.position.set(0, 0);
    headG.rotation = 0;
    headG.scale.set(1, 1);

    return { headR };
}

