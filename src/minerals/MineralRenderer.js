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
        // Render rocks as short, flat "thick crystal" prisms using three faces:
        // left (light), right (dark), and a top cap. Shapes are intentionally
        // irregular by varying edge lengths and slight offsets.
        const s = v.sizeMultiplier || 1;

        // Base geometry parameters (rock is squat compared to crystals)
        const baseWidth = 18 * s;
        const baseDepth = 10 * s; // how "thick" it looks front-to-back
        const height = (18 + Math.random() * 12) * (v.heightRatio || 1) * s;

        // Random variation for asymmetric outer edges
        const leftEdgeExtra = (Math.random() - 0.4) * 6 * (v.edgeRoughness || 0.15);
        const rightEdgeExtra = (Math.random() - 0.4) * 6 * (v.edgeRoughness || 0.15);

        // Offsets to make base bottom uneven
        const bottomShift = (Math.random() - 0.5) * 4 * s;

        // Seam X (center seam between left & right faces) is slightly off-center
        const seamX = (Math.random() - 0.3) * 3;

        // Points (local space, origin at base center)
        const halfWLeft = baseWidth * 0.5 + leftEdgeExtra;
        const halfWRight = baseWidth * 0.5 + rightEdgeExtra;

        const bottomY = 0 + bottomShift;
        const shoulderY = -Math.max(6, height * 0.55); // where sides meet the top cap
        const centerTopY = -height * 0.9; // center seam top
        const capApexY = shoulderY - Math.max(4, height * 0.12);

        // Outline thickness consistent with crystals (half character outline)
        const baseOutlineThickness = SHAPES.OUTLINE_THICKNESS * 0.5;
        const lineThickness = Math.max(0.6, baseOutlineThickness);

        // LEFT FACE (lighter)
        g.lineStyle(lineThickness, 0x000000, 1, 0.5);
        g.beginFill(p.light);
        g.moveTo(-halfWLeft, bottomY);           // bottom-left
        g.lineTo(seamX, bottomY - baseDepth * 0.2); // bottom-center (slightly inset for thickness)
        g.lineTo(seamX, centerTopY);             // top-center seam
        g.lineTo(-halfWLeft, shoulderY);         // top-left shoulder
        g.closePath();
        g.endFill();
        g.lineStyle(0);

        // RIGHT FACE (darker)
        g.lineStyle(lineThickness, 0x000000, 1, 0.5);
        g.beginFill(p.dark);
        g.moveTo(seamX, bottomY - baseDepth * 0.2); // bottom-center
        g.lineTo(halfWRight, bottomY);            // bottom-right
        g.lineTo(halfWRight, shoulderY);          // top-right shoulder
        g.lineTo(seamX, centerTopY);              // top-center seam
        g.closePath();
        g.endFill();
        g.lineStyle(0);

        // TOP CAP (diamond / oblong)
        g.lineStyle(lineThickness, 0x000000, 1, 0.5);
        g.beginFill(p.base);
        // Make the cap irregular by nudging left/right points
        const leftShoulderX = -halfWLeft + (Math.random() - 0.5) * 2;
        const rightShoulderX = halfWRight + (Math.random() - 0.5) * 2;
        const centerSeamX = seamX + (Math.random() - 0.5) * 1.5;
        const apexX = centerSeamX + (Math.random() - 0.5) * 2.5; // tip skew
        g.moveTo(apexX, capApexY);                    // apex
        g.lineTo(rightShoulderX, shoulderY);         // right shoulder
        g.lineTo(centerSeamX, centerTopY);           // center seam top
        g.lineTo(leftShoulderX, shoulderY);          // left shoulder
        g.closePath();
        g.endFill();
        g.lineStyle(0);

        // Subtle top highlight along ridge
        const highlightThickness = Math.max(0.2, baseOutlineThickness / 3);
        g.lineStyle(highlightThickness, 0xFFFFFF, 0.25);
        g.moveTo(leftShoulderX, shoulderY);
        g.lineTo(apexX, capApexY);
        g.lineTo(rightShoulderX, shoulderY);
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