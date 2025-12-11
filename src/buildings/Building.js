import * as PIXI from 'pixi.js';
import { BuildingRenderer } from './BuildingRenderer.js';

export class Building {
    constructor(id, sectorId, u, v, name) {
        this.id = id;
        this.sectorId = sectorId;
        this.u = u;
        this.v = v;
        this.name = name;
        this.state = 'RESERVED'; // RESERVED | ACTIVE
        
        this.container = new PIXI.Container();
        this.graphics = new PIXI.Graphics();
        this.container.addChild(this.graphics);
        
        this.updateGraphics();
    }
    
    setPosition(x, y) {
        this.container.position.set(x, y);
        // Z-index based on ground position
        this.groundY = y;
        this.container.zIndex = y; 
    }
    
    promote() {
        if (this.state === 'RESERVED') {
            this.state = 'ACTIVE';
            this.updateGraphics();
        }
    }
    
    updateGraphics() {
        BuildingRenderer.draw(this.graphics, this);
    }
    
    destroy() {
        this.container.destroy({ children: true });
    }
}

