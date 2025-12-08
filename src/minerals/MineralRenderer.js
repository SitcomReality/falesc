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
        const baseSpread = 30 * v.clusterDensity;
        const edgeLeanFactor = 0.12 + 0.02 * (count - 2); // more crystals => stronger edge lean
        const maxLean = 0.4; // clamp so they don't topple over

        for (let i = 0; i < count; i++) {
             const isMain = i === 0;
             const scale = isMain ? 1.0 : (0.4 + Math.random() * 0.4);

             let x = 0;
             let y = 0;
             if (isMain) {
                 x = 0;
                 y = 0;
             } else {
                 // Distribute around the base with some randomness
                 const t = (i - 1) / Math.max(1, count - 2); // 0..1 across non-main crystals
                 const sideSpread = (t - 0.5) * 2;           // -1..1
                 x = sideSpread * baseSpread * 0.7 + (Math.random() - 0.5) * baseSpread * 0.25;
                 y = (Math.random() - 0.5) * 15 * v.clusterDensity;
             }

             // Base tilt: slightly angled, mostly upright
             let tilt = (Math.random() - 0.5) * 0.12;

             if (!isMain) {
                 // Edge crystals lean away from the cluster center
                 const normX = Math.max(-1, Math.min(1, x / (baseSpread || 1)));
                 const lean = normX * edgeLeanFactor;
                 tilt += lean;
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

            // Static rotation, no sway animation
            cContainer.baseRotation = d.tilt;
            cContainer.rotation = d.tilt;

            const g = new PIXI.Graphics();
            
            // Compensate line thickness for pillar scale (d.scale) 
            // so that line width remains constant relative to struct.container
            const lineThickness = Math.max(0.5, baseOutlineThickness / d.scale);
            const highlightThickness = Math.max(0.2, baseOutlineThickness / 3 / d.scale);

            const w = 15; // Base width
            const h = d.height;

            // Draw Pillar

            // Side/Shadow Facet
            g.lineStyle(lineThickness, 0x000000, 1, 0.5);
            g.beginFill(p.dark);
            g.moveTo(-w/2, 0);
            g.lineTo(w/2, 0);
            g.lineTo(w/2, -h);
            g.lineTo(-w/2, -h);
            g.closePath();
            g.endFill();
            g.lineStyle(0);

            // Front/Main Facet (Angled cut)
            g.lineStyle(lineThickness, 0x000000, 1, 0.5);
            g.beginFill(p.base);
            g.moveTo(-w/2, 0);
            g.lineTo(0, 4); // Stick out bottom slightly
            g.lineTo(w/2, 0);
            g.lineTo(w/2, -h);
            g.lineTo(-w/2, -h);
            g.closePath();
            g.endFill();
            g.lineStyle(0);

            // Top Cap (Light)
            g.lineStyle(lineThickness, 0x000000, 1, 0.5);
            g.beginFill(p.light);
            g.moveTo(-w/2, -h);
            g.lineTo(w/2, -h);
            g.lineTo(0, -h - 12); // Pointy top
            g.closePath();
            g.endFill();
            g.lineStyle(0);

            // Edge highlight
            g.lineStyle(highlightThickness, 0xFFFFFF, 0.3);
            g.moveTo(-w/2, -h);
            g.lineTo(0, -h - 12);
            g.lineTo(w/2, -h);
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