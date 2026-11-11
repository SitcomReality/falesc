import * as PIXI from 'pixi.js';
import { MineralRenderer } from './MineralRenderer.js';
import { MINERAL_TYPES, MINERAL_PALETTES } from './MineralCatalog.js';

export class MineralStructure {
    constructor(x, y, type = MINERAL_TYPES.ROCK, paletteId, rng = null) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.rng = rng;
        const rand = () => (this.rng ? this.rng.next() : Math.random());

        // Auto-pick palette if missing
        if (!paletteId) {
            const filter = type === MINERAL_TYPES.ROCK ? 'ROCK' : 'CRYSTAL';
            const options = MINERAL_PALETTES.filter(p => p.id.includes(filter));
            this.paletteId = options[Math.floor(rand() * options.length)].id;
        } else {
            this.paletteId = paletteId;
        }

        this.scale = 1;
        this.facing = 0;
        
        // Procedural Variations
        this.variation = {
            sizeMultiplier: 0.8 + rand() * 0.8,
            peakCount: type === MINERAL_TYPES.CRYSTAL ? Math.floor(rand() * 3) + 2 : 1,
            edgeRoughness: 0.1 + rand() * 0.2,
            clusterDensity: 0.8 + rand() * 0.5,
            heightRatio: 0.8 + rand() * 0.6
        };

        // Graphics Containers
        this.container = new PIXI.Container();
        this.container.sortableChildren = true;
        
        // Main graphic for rocks
        this.mainG = new PIXI.Graphics();
        this.container.addChild(this.mainG);

        // Shadow is separate so it can go into shadow layer
        this.shadowG = new PIXI.Graphics();

        // Children for crystals
        this.clusterContainers = [];

        // Animation System (removed — minerals are static)
        // this.animation = new MineralAnimation(this);

        // Initialize Geometry
        MineralRenderer.initStructure(this);
        
        this.setPosition(x, y);
    }

    setPosition(x, y) {
        this.x = x;
        this.y = y;
        
        this.container.position.set(x, y);
        this.shadowG.position.set(x, y);
        
        // Calc GroundY for sorting
        // Add subtle offset +0.1 to be behind characters at same Y
        const baseH = 20 * this.variation.sizeMultiplier;
        this.groundY = y + (baseH * this.scale * 0.2) + 0.1;
    }

    update(dt) {
        // Animation removed: minerals are static scenery
        // this.animation.update(dt);
        
        // Propagate Scale
        this.container.scale.set(this.scale);
        this.shadowG.scale.set(this.scale);

        // Update groundY in case scale changed
        this.setPosition(this.x, this.y);
    }

    destroy() {
        this.container.destroy({ children: true });
        this.shadowG.destroy();
    }
}