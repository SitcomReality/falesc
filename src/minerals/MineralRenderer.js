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
        const radius = 20 * s;

        // 3 Layers for "Fake 3D" look

        // 1. Shadow/Base layer (Dark)
        g.lineStyle(Math.max(1, SHAPES.OUTLINE_THICKNESS * 0.5), 0x000000, 1, 0.5);
        g.beginFill(p.dark);
        this.drawJaggedPoly(g, 2, 2, radius, v.edgeRoughness, 7);
        g.endFill();
        g.lineStyle(0);

        // 2. Main Body (Base Color)
        g.lineStyle(Math.max(1, SHAPES.OUTLINE_THICKNESS * 0.5), 0x000000, 1, 0.5);
        g.beginFill(p.base);
        this.drawJaggedPoly(g, 0, -5 * s, radius * 0.9, v.edgeRoughness, 8);
        g.endFill();
        g.lineStyle(0);

        // 3. Highlight/Top (Light)
        g.lineStyle(Math.max(1, SHAPES.OUTLINE_THICKNESS * 0.5), 0x000000, 1, 0.5);
        g.beginFill(p.light);
        this.drawJaggedPoly(g, -5, -12 * s, radius * 0.5, v.edgeRoughness, 6);
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
                 tilt
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

            // Static rotation, with a little extra random twist so crystals don't all match
            const twist = (Math.random() - 0.5) * 0.12; // subtle extra variation
            cContainer.baseRotation = d.tilt;
            cContainer.rotation = d.tilt + twist;

            const g = new PIXI.Graphics();
            
            // Compensate line thickness for pillar scale (d.scale) 
            // so that line width remains constant relative to struct.container
            const lineThickness = Math.max(0.5, baseOutlineThickness / d.scale);
            const highlightThickness = Math.max(0.2, baseOutlineThickness / 3 / d.scale);

            const w = 15; // Base width
            const h = d.height;

            // Draw Pillar
            // Two side faces for the main body: lighter on the left, darker on the right.
            const halfW = w / 2;
            const topY = -h;

            // Vary the top cap height and horizontal tip skew per-crystal
            const diamondHeight = (8 + Math.random() * 6) * (0.7 + Math.random() * 0.6);
            const tipOffset = (Math.random() * 2 - 1) * halfW * 0.7; // lean tip left/right
            const tipX = tipOffset;

            // Place the light/dark division opposite the tip offset
            // If the tip is close to the left edge, the divide moves toward the right, and vice versa.
            const ridgeRatio = 0.85; // how strongly the divide mirrors the tip offset
            const divideX = -tipOffset * ridgeRatio;

            // Y positions for where the side faces meet the top cap
            const joinInnerY = topY + diamondHeight * 0.25;
            const joinOuterY = topY + diamondHeight * 0.55;

            // Left face (lighter side)
            g.lineStyle(lineThickness, 0x000000, 1, 0.5);
            g.beginFill(p.light);
            g.moveTo(-halfW, 0);                 // bottom-left
            g.lineTo(divideX, 2);                // bottom inner near divide
            g.lineTo(divideX, joinInnerY);       // inner top near ridge
            g.lineTo(-halfW, joinOuterY);        // outer top, slightly lower for skew
            g.closePath();
            g.endFill();
            g.lineStyle(0);

            // Right face (darker / shaded side)
            g.lineStyle(lineThickness, 0x000000, 1, 0.5);
            g.beginFill(p.dark);
            g.moveTo(divideX, 2);               // bottom inner
            g.lineTo(halfW, 0);                 // bottom-right
            g.lineTo(halfW, joinOuterY);        // outer top
            g.lineTo(divideX, joinInnerY);      // inner top at ridge
            g.closePath();
            g.endFill();
            g.lineStyle(0);

            // Top cap as a rotated, oblong diamond whose tip can skew left/right
            g.lineStyle(lineThickness, 0x000000, 1, 0.5);
            g.beginFill(p.base);
            g.moveTo(tipX, topY - diamondHeight);           // top tip, skewed horizontally
            g.lineTo(halfW, joinOuterY);                    // right shoulder
            g.lineTo(divideX, topY + diamondHeight * 0.15); // mid valley along ridge
            g.lineTo(-halfW, joinOuterY);                   // left shoulder
            g.closePath();
            g.endFill();
            g.lineStyle(0);

            // Edge highlight along the ridge opposite the tip lean
            g.lineStyle(highlightThickness, 0xFFFFFF, 0.3);
            g.moveTo(-halfW, joinOuterY);
            g.lineTo(divideX, topY - diamondHeight * 0.1);
            g.lineTo(halfW, joinOuterY);
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