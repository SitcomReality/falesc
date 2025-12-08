import * as PIXI from 'pixi.js';
import { SHAPES } from '../constants.js';

/**
 * Responsible for drawing chunkier flat "rock pieces" and composing them into a cluster.
 * Kept minimal and focused so MineralRenderer can delegate to it.
 */
export class RockRenderer {
    static buildRockCluster(container, variation, palette) {
        const baseCount = Math.max(1, Math.floor(1 + variation.sizeMultiplier * 2));
        const jitter = Math.random() < 0.35 ? 1 : 0;
        const pieceCount = Math.min(4, baseCount + jitter);

        const spread = 10 * variation.sizeMultiplier * (0.6 + Math.random() * 0.8);

        for (let i = 0; i < pieceCount; i++) {
            const pieceG = new PIXI.Graphics();

            const pieceVar = {
                sizeMultiplier: variation.sizeMultiplier * (0.7 + Math.random() * 0.6),
                edgeRoughness: variation.edgeRoughness * (0.8 + Math.random() * 0.6),
                heightRatio: variation.heightRatio * (0.8 + Math.random() * 0.6)
            };

            RockRenderer.drawRockPiece(pieceG, pieceVar, palette);

            const angle = (i / pieceCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
            const radius = (i === 0) ? (spread * 0.25) : (spread * (0.3 + Math.random() * 0.7));
            const px = Math.cos(angle) * radius;
            const py = Math.sin(angle) * (radius * 0.35) + (Math.random() - 0.5) * 4;

            pieceG.position.set(px, py);
            pieceG.rotation = (Math.random() - 0.5) * 0.25;
            pieceG.zIndex = py;

            container.addChild(pieceG);
        }
    }

    static drawRockPiece(g, v, p) {
        const s = v.sizeMultiplier || 1;
        const baseHeight = 24 * s;
        const height = baseHeight * (0.6 + Math.random() * 0.6);
        const baseWidth = 28 * s;
        const width = baseWidth * (0.7 + Math.random() * 0.6);

        const leftFrac = 0.45 + (Math.random() - 0.5) * 0.15;
        const leftW = width * leftFrac;
        const rightW = width * (1 - leftFrac);

        const baseOutlineThickness = SHAPES.OUTLINE_THICKNESS * 0.5;

        const baseY = 0;
        const baseCenterDrop = 2 + Math.random() * 3;

        const leftBottom = { x: -leftW, y: baseY + (Math.random() - 0.5) * 2 };
        const rightBottom = { x: rightW, y: baseY + (Math.random() - 0.5) * 2 };
        const seamBottom = { x: (Math.random() - 0.5) * 4, y: baseCenterDrop + (Math.random() - 0.5) * 1.5 };

        const shoulderBaseY = -height * (0.6 + Math.random() * 0.15);
        const leftShoulder = { x: leftBottom.x + (-3 + Math.random() * 5), y: shoulderBaseY + (Math.random() - 0.5) * 4 };
        const rightShoulder = { x: rightBottom.x + (-2 + Math.random() * 5), y: shoulderBaseY + (Math.random() - 0.5) * 4 };

        const seamTop = { x: seamBottom.x + (Math.random() - 0.5) * 6, y: shoulderBaseY + (2 + Math.random() * 4) };

        const highestShoulderY = Math.min(leftShoulder.y, rightShoulder.y);
        const apex = { x: (leftShoulder.x + rightShoulder.x) * 0.5 + (Math.random() - 0.5) * 4, y: highestShoulderY - (1 + Math.random() * 3) };

        g.clear();

        g.lineStyle(baseOutlineThickness, 0x000000, 1, 0.5);
        g.beginFill(p.light);
        g.moveTo(leftBottom.x, leftBottom.y);
        g.lineTo(seamBottom.x, seamBottom.y);
        g.lineTo(seamTop.x, seamTop.y);
        g.lineTo(leftShoulder.x, leftShoulder.y);
        g.closePath();
        g.endFill();
        g.lineStyle(0);

        g.lineStyle(baseOutlineThickness, 0x000000, 1, 0.5);
        g.beginFill(p.dark);
        g.moveTo(seamBottom.x, seamBottom.y);
        g.lineTo(rightBottom.x, rightBottom.y);
        g.lineTo(rightShoulder.x, rightShoulder.y);
        g.lineTo(seamTop.x, seamTop.y);
        g.closePath();
        g.endFill();
        g.lineStyle(0);

        g.lineStyle(baseOutlineThickness, 0x000000, 1, 0.5);
        g.beginFill(p.base);
        g.moveTo(apex.x, apex.y);
        g.lineTo(rightShoulder.x, rightShoulder.y);
        g.lineTo(seamTop.x, seamTop.y);
        g.lineTo(leftShoulder.x, leftShoulder.y);
        g.closePath();
        g.endFill();
        g.lineStyle(0);
    }
}