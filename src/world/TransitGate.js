import * as PIXI from 'pixi.js';

/**
 * The shuttle link between the home shard and the outer commons isle. This is a
 * read-only overlay: two pads and a dashed line across the void. The simulation
 * owns the route; this only makes it legible.
 */
export class TransitGate {
    constructor({ layer }) {
        this.layer = layer;
        this.charter = null;
        this.graphics = new PIXI.Graphics();
        layer.addChild(this.graphics);
    }

    setCharter(charter) {
        this.charter = charter;
        this.refresh();
    }

    refresh() {
        if (!this.graphics.parent && this.layer) this.layer.addChild(this.graphics);
        this.graphics.clear();
        const transit = this.charter?.transit;
        const map = this.charter?.map;
        if (!transit?.home || !transit?.commons || !map) return;
        const homeSector = map.sectors.find((sector) => sector.id === transit.home.sectorId);
        const commonsSector = map.sectors.find((sector) => sector.id === transit.commons.sectorId);
        if (!homeSector || !commonsSector) return;
        const home = homeSector._project(transit.home.u + 0.5, transit.home.v + 0.5);
        const commons = commonsSector._project(transit.commons.u + 0.5, transit.commons.v + 0.5);

        // Dashed shuttle line.
        const steps = 26;
        this.graphics.lineStyle(2.5, 0xFFD36E, 0.55);
        for (let index = 0; index < steps; index += 2) {
            const t0 = index / steps;
            const t1 = Math.min(1, (index + 1) / steps);
            this.graphics.moveTo(home.x + (commons.x - home.x) * t0, home.y + (commons.y - home.y) * t0);
            this.graphics.lineTo(home.x + (commons.x - home.x) * t1, home.y + (commons.y - home.y) * t1);
        }

        for (const point of [home, commons]) {
            this.graphics.beginFill(0x59E3C2, 0.2);
            this.graphics.lineStyle(3, 0x211225, 0.9);
            this.graphics.drawEllipse(point.x, point.y, 42, 18);
            this.graphics.endFill();
            this.graphics.beginFill(0xFFF2D8, 0.9);
            this.graphics.lineStyle(2, 0x211225, 1);
            this.graphics.drawEllipse(point.x, point.y - 2, 26, 10);
            this.graphics.endFill();
            this.graphics.lineStyle(3, 0x59E3C2, 0.9);
            this.graphics.moveTo(point.x - 12, point.y - 10);
            this.graphics.lineTo(point.x, point.y - 30);
            this.graphics.lineTo(point.x + 12, point.y - 10);
        }
    }

    clear() {
        this.charter = null;
        this.graphics.clear();
    }
}
