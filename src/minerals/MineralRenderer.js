import * as PIXI from 'pixi.js';
import { MINERAL_TYPES, MINERAL_PALETTES } from '../constants.js';
import { SHAPES } from '../constants.js';
import { RockRenderer } from './RockRenderer.js';
import { CrystalRenderer } from './CrystalRenderer.js';
import { drawShadowForStructure } from './MineralUtils.js';

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

        // Shadow (shared helper)
        struct.shadowG.clear();
        drawShadowForStructure(struct.shadowG, struct.variation);

        // Delegate geometry to specific renderers
        if (struct.type === MINERAL_TYPES.ROCK) {
            // Clean previous mainG if present
            if (struct.mainG && struct.mainG.parent) {
                struct.mainG.parent.removeChild(struct.mainG);
            }
            const rockContainer = new PIXI.Container();
            rockContainer.sortableChildren = true;

            // Build rock pieces and add to container
            RockRenderer.buildRockCluster(rockContainer, struct.variation, palette);

            struct.mainG = rockContainer;
            struct.container.addChild(rockContainer);

            // Cache a reference for identical parameters (note: randomness inside RockRenderer is mild)
            this.cache.set(cacheKey, rockContainer);
        } else {
            // Clear crystals
            struct.clusterContainers.forEach(c => c.destroy());
            struct.clusterContainers = [];

            // Build crystals into struct.container and populate clusterContainers
            CrystalRenderer.buildCrystalCluster(struct, struct.variation, palette);
        }
    }
}