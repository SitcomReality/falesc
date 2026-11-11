import * as PIXI from 'pixi.js';
import { BuildingRenderer } from './BuildingRenderer.js';

export class Building {
    constructor(id, sectorId, u, v, name, blueprintId = 'prism_rig') {
        this.id = id;
        this.sectorId = sectorId;
        this.u = u;
        this.v = v;
        this.name = name;
        this.blueprintId = blueprintId;
        // Three-phase lifecycle:
        // PENDING (ephemeral placeholder) -> RESERVED (ghost) -> ACTIVE (solid)
        this.state = 'PENDING';
        
        this.container = new PIXI.Container();
        this.graphics = new PIXI.Graphics();
        this.container.addChild(this.graphics);

        // Time accumulator for pulsing effect while PENDING
        this.pulseTime = 0;
        
        this.updateGraphics();
    }
    
    setPosition(x, y) {
        this.container.position.set(x, y);
        // Z-index based on ground position
        this.groundY = y;
        this.container.zIndex = y; 
    }
    
    promote() {
        if (this.state === 'PENDING') {
            this.state = 'RESERVED';
        } else if (this.state === 'RESERVED') {
            this.state = 'ACTIVE';
        }
        this.updateGraphics();
        return this.state;
    }
    
    updateGraphics() {
        BuildingRenderer.draw(this.graphics, this);
    }

    update(dt) {
        // Ephemeral placeholder pulses; other states are solid alpha
        if (this.state === 'PENDING') {
            this.pulseTime += dt;
            const base = 0.62;
            const amp = 0.12;
            // Pulse between roughly 0.5 and 0.74 alpha: transparent enough to
            // read as a plan, solid enough that the silhouette is always visible.
            this.container.alpha = base + Math.sin(this.pulseTime * 4) * amp;
        } else if (this.state === 'RESERVED') {
            this.container.alpha = 0.72;
        } else {
            this.container.alpha = 1.0;
        }
    }
    
    destroy() {
        this.container.destroy({ children: true });
    }
}

