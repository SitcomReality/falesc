import * as PIXI from 'pixi.js';
import { MINERAL_TYPES, MINERAL_PALETTES } from '../constants.js';
import { SHAPES } from '../constants.js';

export class MineralRenderer {
    // Cache for reuse of static geometry (Graphics clones)
    static cache = new Map();

    static getPaletteSignature(paletteId) {
        return paletteId;
    }

    static initStructure(struct) {
        const variationKey = JSON.stringify(struct.variation);
        const cacheKey = `${struct.type}_${struct.paletteId}_${variationKey}`;
        const palette = MINERAL_PALETTES.find(p => p.id === struct.paletteId) || MINERAL_PALETTES[0];

        // --- SHADOW ---
        // Simple static shadow for all types
        struct.shadowG.clear();
        struct.shadowG.beginFill(0x000000, 0.2);
        const w = 40 * struct.variation.sizeMultiplier;
        // Offset Y slightly positive to be "under" the base
        struct.shadowG.drawEllipse(0, w * 0.1, w * 0.6, w * 0.25);
        struct.shadowG.endFill();

        // --- GEOMETRY ---
        // For Rocks: Single Main Graphics
        if (struct.type === MINERAL_TYPES.ROCK) {
            // Check Cache
            if (this.cache.has(cacheKey)) {
                // Remove old if exists
                if(struct.mainG.parent) struct.mainG.parent.removeChild(struct.mainG);

                // Clone cached geometry
                struct.mainG = this.cache.get(cacheKey).clone();
                struct.container.addChild(struct.mainG);
            } else {
                // Draw Fresh
                struct.mainG.clear();
                this.drawRock(struct.mainG, struct.variation, palette);

                // Cache a clone
                this.cache.set(cacheKey, struct.mainG.clone());
            }
        } 
        // For Crystals: Multiple Child Containers (Dynamic)
        else {
            // Clear existing children
            struct.clusterContainers.forEach(c => c.destroy());
            struct.clusterContainers = [];

            // We don't cache the whole crystal cluster because we need individual containers for sway animation.
            // But we could cache the pillar geometry. For now, drawing is cheap enough for init-only.
            this.drawCrystalCluster(struct, struct.variation, palette);
        }
    }

    static drawRock(g, v, p) {
        const s = v.sizeMultiplier || 1;

        // Base dimensions: shorter and broader than crystals to feel "flat" and chunky
        const baseHeight = 24 * s;
        const height = baseHeight * (0.6 + Math.random() * 0.6); // moderate height variations
        const baseWidth = 28 * s;
        const width = baseWidth * (0.7 + Math.random() * 0.6);   // some width variation

        // Split width into slightly asymmetric left/right halves
        const leftFrac = 0.45 + (Math.random() - 0.5) * 0.15; // 0.375..0.525
        const rightFrac = 1 - leftFrac;
        const leftW = width * leftFrac;
        const rightW = width * rightFrac;

        // Outline thickness: half of character outline, same as crystals
        const baseOutlineThickness = SHAPES.OUTLINE_THICKNESS * 0.5;

        // Random bottom offsets to avoid perfectly straight base
        const baseY = 0;
        const baseCenterDrop = 2 + Math.random() * 3;

        const leftBottom = {
            x: -leftW,
            y: baseY + (Math.random() - 0.5) * 2
        };
        const rightBottom = {
            x: rightW,
            y: baseY + (Math.random() - 0.5) * 2
        };
        const seamBottom = {
            x: (Math.random() - 0.5) * 4,
            y: baseCenterDrop + (Math.random() - 0.5) * 1.5
        };

        // Top "shoulders" for left/right faces with individual lean/height
        const shoulderBaseY = -height * (0.6 + Math.random() * 0.15);
        const leftShoulder = {
            x: leftBottom.x + (-3 + Math.random() * 5), // lean in or out a bit
            y: shoulderBaseY + (Math.random() - 0.5) * 4
        };
        const rightShoulder = {
            x: rightBottom.x + (-2 + Math.random() * 5),
            y: shoulderBaseY + (Math.random() - 0.5) * 4
        };

        // Center seam top: slightly higher than shoulders, with its own skew
        const seamTop = {
            x: seamBottom.x + (Math.random() - 0.5) * 6,
            y: shoulderBaseY - (2 + Math.random() * 4)
        };

        // Top "cap" apex: still has a clear top face, but with a bit of skew
        const highestShoulderY = Math.min(leftShoulder.y, rightShoulder.y, seamTop.y);
        const apex = {
            x: (leftShoulder.x + rightShoulder.x) * 0.5 + (Math.random() - 0.5) * 4,
            y: highestShoulderY - (3 + Math.random() * 4)
        };

        g.clear();

        // Left face (lighter side)
        g.lineStyle(baseOutlineThickness, 0x000000, 1, 0.5);
        g.beginFill(p.light);
        g.moveTo(leftBottom.x, leftBottom.y);      // Bottom Left
        g.lineTo(seamBottom.x, seamBottom.y);      // Bottom Center
        g.lineTo(seamTop.x, seamTop.y);            // Top Center
        g.lineTo(leftShoulder.x, leftShoulder.y);  // Top Left
        g.closePath();
        g.endFill();
        g.lineStyle(0);

        // Right face (darker / shaded side)
        g.lineStyle(baseOutlineThickness, 0x000000, 1, 0.5);
        g.beginFill(p.dark);
        g.moveTo(seamBottom.x, seamBottom.y);      // Bottom Center
        g.lineTo(rightBottom.x, rightBottom.y);    // Bottom Right
        g.lineTo(rightShoulder.x, rightShoulder.y);// Top Right
        g.lineTo(seamTop.x, seamTop.y);            // Top Center
        g.closePath();
        g.endFill();
        g.lineStyle(0);

        // Top cap (flattened diamond / oblong top face)
        g.lineStyle(baseOutlineThickness, 0x000000, 1, 0.5);
        g.beginFill(p.base);
        g.moveTo(apex.x, apex.y);                  // Apex / Top
        g.lineTo(rightShoulder.x, rightShoulder.y);// Right Shoulder
        g.lineTo(seamTop.x, seamTop.y);            // Inner seam
        g.lineTo(leftShoulder.x, leftShoulder.y);  // Left Shoulder
        g.closePath();
        g.endFill();
        g.lineStyle(0);
    }

    static drawCrystalCluster(struct, v, p) {
        const count = v.peakCount;

        // Generate crystal data
        const crystals = [];
        // Reduce baseSpread so bases sit much closer and tend to touch.
        // Use clusterDensity but shrink the multiplier to pack crystals tightly.
        const baseSpread = 14 * v.clusterDensity;
        // Increase edge lean and make it grow slightly with more crystals
        const edgeLeanFactor = 0.16 + 0.03 * Math.max(0, count - 2);
        const maxLean = 0.7; // clamp so they don't topple over

        for (let i = 0; i < count; i++) {
             const isMain = i === 0;
             const scale = isMain ? 1.0 : (0.5 + Math.random() * 0.45);

             let x = 0;
             let y = 0;
             if (isMain) {
                 x = 0;
                 y = 0;
             } else {
                 if (count === 2) {
                     // For exactly two crystals, place them symmetrically close and lean away
                     const side = i === 1 ? -1 : 1; // single other crystal will be i===1
                     x = side * baseSpread * 0.6 + (Math.random() - 0.5) * baseSpread * 0.05;
                     y = (Math.random() - 0.5) * 6 * v.clusterDensity;
                 } else {
                     // Distribute non-main crystals tightly around the base with low randomness so bases can touch
                     const t = (i - 1) / Math.max(1, count - 2); // 0..1 across non-main crystals
                     const sideSpread = (t - 0.5) * 2;           // -1..1
                     // Use a smaller multiplier so crystals are near each other
                     x = sideSpread * baseSpread * 0.5 + (Math.random() - 0.5) * baseSpread * 0.12;
                     y = (Math.random() - 0.5) * 10 * v.clusterDensity;
                 }
             }

             // Base tilt: slightly angled, mostly upright
             let tilt = (Math.random() - 0.5) * 0.08;

             if (!isMain) {
                 // Edge crystals lean away from the cluster center
                 const normX = Math.max(-1, Math.min(1, x / (baseSpread || 1)));
                 const lean = normX * edgeLeanFactor;
                 tilt += lean;
             }

             // Special-case: two-crystal cluster should visibly lean away from each other
             if (count === 2 && !isMain) {
                 // Ensure noticeable opposite tilts
                 tilt = Math.sign(x) * Math.abs(tilt || edgeLeanFactor * 1.5);
             }

             // Clamp final tilt
             if (tilt > maxLean) tilt = maxLean;
             if (tilt < -maxLean) tilt = -maxLean;

             crystals.push({
                 scale: scale * v.sizeMultiplier,
                 x,
                 y,
                 height: (40 + Math.random() * 30) * v.heightRatio,
                 tilt,
                 skew: (Math.random() - 0.5) * 1.5, // -0.75 to 0.75
                 squish: 0.3 + Math.random() * 0.7 // Factor for how flat the top is
             });
        }

        // Sort by Y so back crystals draw first
        crystals.sort((a, b) => a.y - b.y);

        // Base mineral outline thickness is half of character outline (1.5 units)
        const baseOutlineThickness = SHAPES.OUTLINE_THICKNESS * 0.5;

        crystals.forEach(d => {
            const cContainer = new PIXI.Container();
            cContainer.position.set(d.x, d.y);
            cContainer.scale.set(d.scale);

            // Static rotation, no sway animation
            cContainer.baseRotation = d.tilt;
            cContainer.rotation = d.tilt;

            const g = new PIXI.Graphics();
            
            // Compensate line thickness for pillar scale (d.scale) 
            // so that line width remains constant relative to struct.container
            const lineThickness = Math.max(0.5, baseOutlineThickness / d.scale);
            const highlightThickness = Math.max(0.2, baseOutlineThickness / 3 / d.scale);

            const w = 15; // Base width
            const halfW = w / 2;
            const h = d.height;
            
            // Dynamic Geometry Parameters
            const skewOffset = (d.skew || 0) * halfW * 0.6; // Tip Skew X
            const seamOffset = -skewOffset; // Seam Skew X (Opposite)
            
            const shoulderDrop = 3; // How much lower the center seam is compared to shoulders
            const topY_center = -h; // Center seam top
            const topY_shoulders = -h - shoulderDrop; // Shoulders are higher (more negative)
            
            const capHeight = 6 * (d.squish || 1); // Flatter tops
            const apexY = topY_shoulders - capHeight;

            const baseCenterDrop = 2; // Bottom V shape

            // Left face (lighter side)
            g.lineStyle(lineThickness, 0x000000, 1, 0.5);
            g.beginFill(p.light);
            g.moveTo(-halfW, 0); // Bottom Left
            g.lineTo(seamOffset, baseCenterDrop); // Bottom Center
            g.lineTo(seamOffset, topY_center); // Top Center
            g.lineTo(-halfW, topY_shoulders); // Top Left
            g.closePath();
            g.endFill();
            g.lineStyle(0);

            // Right face (darker / shaded side)
            g.lineStyle(lineThickness, 0x000000, 1, 0.5);
            g.beginFill(p.dark);
            g.moveTo(seamOffset, baseCenterDrop); // Bottom Center
            g.lineTo(halfW, 0); // Bottom Right
            g.lineTo(halfW, topY_shoulders); // Top Right
            g.lineTo(seamOffset, topY_center); // Top Center
            g.closePath();
            g.endFill();
            g.lineStyle(0);

            // Top cap (Diamond / Kite shape)
            g.lineStyle(lineThickness, 0x000000, 1, 0.5);
            g.beginFill(p.base);
            g.moveTo(skewOffset, apexY); // Apex (Tip)
            g.lineTo(halfW, topY_shoulders); // Right Shoulder
            g.lineTo(seamOffset, topY_center); // Bottom (Seam Top)
            g.lineTo(-halfW, topY_shoulders); // Left Shoulder
            g.closePath();
            g.endFill();
            g.lineStyle(0);

            // Edge highlight along the top ridge (Apex to Shoulders)
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

    static drawJaggedPoly(g, x, y, radius, roughness, segments) {
        const points = [];
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            // Add randomness to radius
            const r = radius * (1 + (Math.random() - 0.5) * (roughness * 2));
            points.push(x + Math.cos(angle) * r);
            points.push(y + Math.sin(angle) * r);
        }
        g.drawPolygon(points);
    }
}