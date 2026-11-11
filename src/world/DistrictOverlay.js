import * as PIXI from 'pixi.js';

/**
 * Read-only world labels for named service districts. The charter computes the
 * groups; this layer only writes their names over the connected doors.
 */
export class DistrictOverlay {
    constructor({ layer }) {
        this.layer = layer;
        this.charter = null;
        this.labels = [];
    }

    setCharter(charter) {
        this.charter = charter;
        this.refresh();
    }

    refresh() {
        for (const label of this.labels) label.destroy();
        this.labels = [];
        if (!this.charter?.districtGroups?.length) return;
        for (const district of this.charter.districtGroups) {
            const text = new PIXI.Text(district.name, {
                fontFamily: 'Space Mono, monospace',
                fontSize: 11,
                letterSpacing: 1,
                fill: 0x211225,
                stroke: 0xFFF2D8,
                strokeThickness: 4,
                align: 'center'
            });
            text.anchor.set(0.5, 1);
            text.position.set(district.x, district.y - 34);
            text.alpha = 0.92;
            this.layer.addChild(text);
            this.labels.push(text);
        }
    }

    clear() {
        for (const label of this.labels) label.destroy();
        this.labels = [];
        this.charter = null;
    }
}
