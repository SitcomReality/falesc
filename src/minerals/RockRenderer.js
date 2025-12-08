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
        const piecesData = [];

        for (let i = 0; i < pieceCount; i++) {
            const pieceVar = {
                sizeMultiplier: variation.sizeMultiplier * (0.7 + Math.random() * 0.6),
                edgeRoughness: variation.edgeRoughness * (0.8 + Math.random() * 0.6),
                heightRatio: variation.heightRatio * (0.8 + Math.random() * 0.6)
            };
            
            // Calculate position relative to cluster center
            const angle = (i / pieceCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
            // Make non-main pieces more likely to sit further from center horizontally
            const radius = (i === 0) ? (spread * 0.25) : (spread * (0.35 + Math.random() * 0.85));
            // Base polar coords
            let px = Math.cos(angle) * radius;
            let py = Math.sin(angle) * (radius * 0.35) + (Math.random() - 0.5) * 4;
            // Add extra horizontal jitter to widen clusters (scaled by spread and piece size)
            const horizJitter = (Math.random() - 0.5) * spread * 0.6 * (i === 0 ? 0.35 : 1.0);
            px += horizJitter;

            piecesData.push({
                variation: pieceVar,
                palette: palette,
                px, py,
                rotation: (Math.random() - 0.5) * 0.25,
                // Use sizeMultiplier as the metric for size comparison
                size: pieceVar.sizeMultiplier
            });
        }
        
        // Sort pieces descending by size. Index 0 is the largest (farthest back), Index N-1 is the smallest (closest front).
        piecesData.sort((a, b) => b.size - a.size);

        // Ensure vertical stacking: guarantee that each subsequent (smaller) piece has
        // a base Y that is not higher than any larger piece (i.e. py increases with index).
        // Compute a compact base starting point and a small per-layer offset based on spread.
        const originalYs = piecesData.map(d => d.py);
        const minOriginalY = Math.min(...originalYs);
        const layerOffset = Math.max(4, Math.abs(spread) * 0.18); // pixels between layers

        // Reassign py so larger pieces (lower index) are higher/behind, smaller ones lower/in front.
        piecesData.forEach((d, i) => {
            d.py = minOriginalY + i * layerOffset;
        });

        // Render sorted pieces (now with adjusted vertical stacking)
        piecesData.forEach((data, index) => {
            const pieceG = new PIXI.Graphics();
            RockRenderer.drawRockPiece(pieceG, data.variation, data.palette);

            pieceG.position.set(data.px, data.py);
            pieceG.rotation = data.rotation;
            
            // Calculate zIndex: use relative Y position (data.py) for depth sorting,
            // but add a significant offset based on size index to ensure smaller rocks (higher index)
            // appear in front of larger rocks if they overlap.
            const sizePriorityOffset = index * 10;
            
            pieceG.zIndex = data.py + sizePriorityOffset;

            container.addChild(pieceG);
        });
    }

    /**
     * Helper: draw a closed polygon with rounded corners, using quadratic curves.
     * Points are objects: { x, y, sharp?: boolean }. Radius is a maximum; actual radius is clamped per-corner.
     */
    static drawRoundedPolygon(g, points, radius) {
        const n = points.length;
        if (n < 3) {
            // Fallback to simple polyline
            g.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < n; i++) {
                g.lineTo(points[i].x, points[i].y);
            }
            g.closePath();
            return;
        }

        const r = radius;

        const getPrev = (i) => points[(i - 1 + n) % n];
        const getNext = (i) => points[(i + 1) % n];

        // First corner: moveTo the start of its segment
        for (let i = 0; i < n; i++) {
            const p = points[i];
            const prev = getPrev(i);
            const next = getNext(i);

            if (p.sharp) {
                // If sharp, just move/line directly to the point
                if (i === 0) {
                    g.moveTo(p.x, p.y);
                } else {
                    g.lineTo(p.x, p.y);
                }
                // Since we drew directly to P, we skip the curve.
                continue;
            }

            // --- Calculation for Rounded Corner ---

            // Vectors along incoming and outgoing edges
            const vxIn = p.x - prev.x;
            const vyIn = p.y - prev.y;
            const vxOut = next.x - p.x;
            const vyOut = next.y - p.y;

            const lenIn = Math.hypot(vxIn, vyIn) || 1;
            const lenOut = Math.hypot(vxOut, vyOut) || 1;

            const maxCornerRadius = Math.min(lenIn * 0.5, lenOut * 0.5, r);
            const tIn = maxCornerRadius / lenIn;
            const tOut = maxCornerRadius / lenOut;

            const startX = p.x - vxIn * tIn;
            const startY = p.y - vyIn * tIn;
            const endX = p.x + vxOut * tOut;
            const endY = p.y + vyOut * tOut;

            // Start of rounded segment
            if (i === 0) {
                g.moveTo(startX, startY);
            } else {
                g.lineTo(startX, startY);
            }

            // Corner curve (p.x, p.y is the control point)
            g.quadraticCurveTo(p.x, p.y, endX, endY);
        }

        g.closePath();
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
        const seamBottom = { x: (Math.random() - 0.5) * 4, y: baseCenterDrop + (Math.random() - 0.5) * 1.5, sharp: true };

        const shoulderBaseY = -height * (0.6 + Math.random() * 0.15);
        const leftShoulder = { x: leftBottom.x + (-3 + Math.random() * 5), y: shoulderBaseY + (Math.random() - 0.5) * 4 };
        const rightShoulder = { x: rightBottom.x + (-2 + Math.random() * 5), y: shoulderBaseY + (Math.random() - 0.5) * 4 };

        // Ensure the top face (span between leftShoulder.x and rightShoulder.x) is not wider than
        // the bottom face (span between leftBottom.x and rightBottom.x). If it is, scale the
        // shoulder x positions toward their center so topWidth <= bottomWidth.
        const bottomWidth = Math.abs(rightBottom.x - leftBottom.x);
        const topWidth = Math.abs(rightShoulder.x - leftShoulder.x);
        if (topWidth > bottomWidth && topWidth > 0) {
            const centerX = (leftShoulder.x + rightShoulder.x) * 0.5;
            const scale = bottomWidth / topWidth;
            leftShoulder.x = centerX + (leftShoulder.x - centerX) * scale;
            rightShoulder.x = centerX + (rightShoulder.x - centerX) * scale;
        }

        const seamTop = { x: seamBottom.x + (Math.random() - 0.5) * 6, y: shoulderBaseY + (2 + Math.random() * 4), sharp: true };

        const highestShoulderY = Math.min(leftShoulder.y, rightShoulder.y);
        const apex = { x: (leftShoulder.x + rightShoulder.x) * 0.5 + (Math.random() - 0.5) * 4, y: highestShoulderY - (1 + Math.random() * 3) };

        // Global corner roundness: scale with rock size but keep modest so shapes stay crisp.
        const baseRadius = 4 * s;
        const cornerRadius = Math.max(1.5, Math.min(baseRadius, width * 0.15));

        g.clear();

        // Light face (left)
        g.lineStyle(baseOutlineThickness, 0x000000, 1, 0.5);
        g.beginFill(p.light);
        RockRenderer.drawRoundedPolygon(g, [
            leftBottom,
            seamBottom,
            seamTop,
            leftShoulder
        ], cornerRadius);
        g.endFill();
        g.lineStyle(0);

        // Dark face (right)
        g.lineStyle(baseOutlineThickness, 0x000000, 1, 0.5);
        g.beginFill(p.dark);
        RockRenderer.drawRoundedPolygon(g, [
            seamBottom,
            rightBottom,
            rightShoulder,
            seamTop
        ], cornerRadius);
        g.endFill();
        g.lineStyle(0);

        // Top face
        g.lineStyle(baseOutlineThickness, 0x000000, 1, 0.5);
        g.beginFill(p.base);
        RockRenderer.drawRoundedPolygon(g, [
            apex,
            rightShoulder,
            seamTop,
            leftShoulder
        ], cornerRadius);
        g.endFill();
        g.lineStyle(0);
    }
}