/**
 * Small utility helpers for mineral rendering.
 */

export function drawShadowForStructure(g, variation) {
    g.clear();
    g.beginFill(0x000000, 0.2);
    const w = 40 * variation.sizeMultiplier;
    g.drawEllipse(0, w * 0.1, w * 0.6, w * 0.25);
    g.endFill();
}

export function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
}