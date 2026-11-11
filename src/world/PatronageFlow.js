import * as PIXI from 'pixi.js';

/**
 * World-space "who goes where" overlay. Each resident's last recorded choice
 * is drawn as a chapter-coloured arc from their home door to the service door
 * that earned their heart. It is a read-only explanation layer, not simulation.
 */
export class PatronageFlow {
    constructor({ layer }) {
        this.layer = layer;
        this.graphics = new PIXI.Graphics();
        this.graphics.visible = false;
        this.layer.addChild(this.graphics);
        this.charter = null;
        this.visible = false;
        this.lineCount = 0;
    }

    setCharter(charter) {
        this.charter = charter;
        this.refresh();
    }

    toggle() {
        this.visible = !this.visible;
        this.graphics.visible = this.visible;
        this.refresh();
        return this.visible;
    }

    show() {
        this.visible = true;
        this.graphics.visible = true;
        this.refresh();
    }

    hide() {
        this.visible = false;
        this.graphics.visible = false;
        this.refresh();
    }

    refresh() {
        if (!this.graphics.parent && this.layer) this.layer.addChild(this.graphics);
        this.graphics.clear();
        this.lineCount = 0;
        if (!this.visible || !this.charter) return;
        for (const resident of this.charter.activeResidents) {
            const choice = resident.memory.lastChoice;
            if (!choice) continue;
            const service = this.charter.allServices.find((entry) => entry.id === choice.serviceId);
            const home = this.charter.homeFor(resident);
            if (!service || !home || !service.entrance || !home.entrance) continue;
            const from = home.entranceWorldPoint;
            const to = service.entranceWorldPoint;
            const colour = Number.parseInt(String(service.chapterColour || '#FF6B5E').replace('#', ''), 16) || 0xff6b5e;
            const midX = (from.x + to.x) / 2 + (from.y - to.y) * 0.16;
            const midY = (from.y + to.y) / 2 - Math.abs(from.x - to.x) * 0.05 - 40;
            this.graphics.lineStyle(5, colour, 0.38);
            this.graphics.moveTo(from.x, from.y);
            this.graphics.quadraticCurveTo(midX, midY, to.x, to.y);
            this.graphics.beginFill(colour, 0.9);
            this.graphics.drawCircle(from.x, from.y, 7);
            this.graphics.drawCircle(to.x, to.y, 9);
            this.graphics.endFill();
            this.lineCount += 1;
        }
    }
}
