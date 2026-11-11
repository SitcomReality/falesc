import * as PIXI from 'pixi.js';
import { MINERAL_TYPES, MINERAL_PALETTES } from '../constants.js';
import { RockRenderer } from './RockRenderer.js';
import { CrystalRenderer } from './CrystalRenderer.js';
import { drawShadowForStructure } from './MineralUtils.js';

export class MineralRenderer {
    static initStructure(struct) {
        const palette = MINERAL_PALETTES.find(p => p.id === struct.paletteId) || MINERAL_PALETTES[0];

        // Shadow (shared helper)
        struct.shadowG.clear();
        drawShadowForStructure(struct.shadowG, struct.variation);

        // Delegate geometry to specific renderers
        if (struct.type === MINERAL_TYPES.ROCK) {
            // Clean previous mainG if present (it has no useful geometry yet).
            if (struct.mainG && struct.mainG.parent) {
                struct.mainG.parent.removeChild(struct.mainG);
                struct.mainG.destroy({ children: true });
            }
            const rockContainer = new PIXI.Container();
            rockContainer.sortableChildren = true;

            // Build rock pieces and add to container
            RockRenderer.buildRockCluster(rockContainer, struct.variation, palette);

            struct.mainG = rockContainer;
            struct.container.addChild(rockContainer);
        } else {
            // Clear crystals
            struct.clusterContainers.forEach(c => c.destroy());
            struct.clusterContainers = [];

            // Build crystals into struct.container and populate clusterContainers
            CrystalRenderer.buildCrystalCluster(struct, struct.variation, palette);
        }
    }
}