import * as PIXI from 'pixi.js';
import { SHAPES } from '../art/ShapeMetrics.js';


/**
 * Responsible for drawing individual crystals and composing clusters.
 * Exposes buildCrystalCluster which mutates the provided struct.container
 * and struct.clusterContainers array to preserve previous contract.
 */
export class CrystalRenderer {
    static buildCrystalCluster(struct, variation, palette) {
        const count = variation.peakCount;
        const rand = () => (struct.rng ? struct.rng.next() : Math.random());

        const crystals = [];
        const baseSpread = 14 * variation.clusterDensity;
        const edgeLeanFactor = 0.16 + 0.03 * Math.max(0, count - 2);
        const maxLean = 0.7;

        for (let i = 0; i < count; i++) {
            const isMain = i === 0;
            const scale = isMain ? 1.0 : (0.5 + rand() * 0.45);

            let x = 0, y = 0;
            if (isMain) {
                x = 0; y = 0;
            } else {
                if (count === 2) {
                    const side = i === 1 ? -1 : 1;
                    x = side * baseSpread * 0.6 + (rand() - 0.5) * baseSpread * 0.05;
                    y = (rand() - 0.5) * 6 * variation.clusterDensity;
                } else {
                    const t = (i - 1) / Math.max(1, count - 2);
                    const sideSpread = (t - 0.5) * 2;
                    x = sideSpread * baseSpread * 0.5 + (rand() - 0.5) * baseSpread * 0.12;
                    y = (rand() - 0.5) * 10 * variation.clusterDensity;
                }
            }

            let tilt = (rand() - 0.5) * 0.08;

            if (!isMain) {
                const normX = Math.max(-1, Math.min(1, x / (baseSpread || 1)));
                const edgeBias = Math.sign(normX) * Math.pow(Math.abs(normX), 1.5);
                const lean = edgeBias * edgeLeanFactor;
                tilt += lean;
            }

            if (count === 2 && !isMain) {
                const side = Math.sign(x) || 1;
                tilt = side * Math.min(maxLean * 0.85, Math.abs(tilt) + edgeLeanFactor);
            }

            tilt = Math.max(-maxLean, Math.min(maxLean, tilt));

            crystals.push({
                scale: scale * variation.sizeMultiplier,
                x, y,
                height: (40 + rand() * 30) * variation.heightRatio,
                tilt,
                skew: (rand() - 0.5) * 1.5,
                squish: 0.3 + rand() * 0.7
            });
        }

        crystals.sort((a, b) => a.y - b.y);

        const baseOutlineThickness = SHAPES.OUTLINE_THICKNESS * 0.5;

        crystals.forEach(d => {
            const cContainer = new PIXI.Container();
            cContainer.position.set(d.x, d.y);
            cContainer.scale.set(d.scale);
            cContainer.baseRotation = d.tilt;
            cContainer.rotation = d.tilt;

            const g = new PIXI.Graphics();

            const lineThickness = Math.max(0.5, baseOutlineThickness / d.scale);
            const highlightThickness = Math.max(0.2, baseOutlineThickness / 3 / d.scale);

            const w = 15;
            const halfW = w / 2;
            const h = d.height;

            const skewOffset = (d.skew || 0) * halfW * 0.6;
            const seamOffset = -skewOffset;

            const shoulderDrop = 3;
            const topY_center = -h;
            const topY_shoulders = -h - shoulderDrop;

            const capHeight = 6 * (d.squish || 1);
            const apexY = topY_shoulders - capHeight;

            const baseCenterDrop = 2;

            g.lineStyle(lineThickness, 0x000000, 1, 0.5);
            g.beginFill(palette.light);
            g.moveTo(-halfW, 0);
            g.lineTo(seamOffset, baseCenterDrop);
            g.lineTo(seamOffset, topY_center);
            g.lineTo(-halfW, topY_shoulders);
            g.closePath();
            g.endFill();
            g.lineStyle(0);

            g.lineStyle(lineThickness, 0x000000, 1, 0.5);
            g.beginFill(palette.dark);
            g.moveTo(seamOffset, baseCenterDrop);
            g.lineTo(halfW, 0);
            g.lineTo(halfW, topY_shoulders);
            g.lineTo(seamOffset, topY_center);
            g.closePath();
            g.endFill();
            g.lineStyle(0);

            g.lineStyle(lineThickness, 0x000000, 1, 0.5);
            g.beginFill(palette.base);
            g.moveTo(skewOffset, apexY);
            g.lineTo(halfW, topY_shoulders);
            g.lineTo(seamOffset, topY_center);
            g.lineTo(-halfW, topY_shoulders);
            g.closePath();
            g.endFill();
            g.lineStyle(0);

            g.lineStyle(highlightThickness, 0xFFFFFF, 0.3);
            g.moveTo(-halfW, topY_shoulders);
            g.lineTo(skewOffset, apexY);
            g.lineTo(halfW, topY_shoulders);
            g.lineStyle(0);

            cContainer.addChild(g);
            struct.container.addChild(cContainer);
            struct.clusterContainers.push(cContainer);
        });
    }
}