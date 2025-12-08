import * as PIXI from 'pixi.js';
import { MINERAL_PALETTES, MINERAL_TYPES } from '../constants.js';
import { Random } from '../util/Random.js'; 
import {
    drawCrystalClusterBody,
    drawRockClusterBody,
    drawShadowEllipse,
} from './MineralRenderHelpers.js';

export class MineralCluster {
    constructor(options) {
        const {
            type = MINERAL_TYPES.CRYSTAL,
            paletteKey = 'CRYSTAL_GREEN',
            seed = Math.random() * 1e9,
            size = 1,
            variantParams = {},
        } = options;

        this.type = type;
        this.paletteKey = paletteKey;
        this.size = size;
        this.variantParams = variantParams;
        this.seed = seed;

        this.x = 0;
        this.y = 0;
        this.facing = 0;
        this.groundY = 0;

        this.graphics = new PIXI.Container();
        this.graphics.sortableChildren = true;

        this.bodyG = new PIXI.Graphics();
        this.graphics.addChild(this.bodyG);

        this.shadowG = new PIXI.Graphics();

        this._paletteSig = '';
        this._variantSig = '';
        this._approxRadius = 1;
        this._approxHeight = 1;

        this.setScale(size);

        this.refreshGeometry();
    }

    get palette() {
        return MINERAL_PALETTES[this.paletteKey] || MINERAL_PALETTES.CRYSTAL_GREEN;
    }

    // API parity with Character
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.groundY = y;

        this.graphics.position.set(x, y);
        this.shadowG.position.set(x, y + 4); // small down offset for shadow

        this.graphics.zIndex = this.groundY;
        this.shadowG.zIndex = this.groundY - 1;
    }

    setScale(s) {
        this.size = s;
        this.graphics.scale.set(s);
        this.shadowG.scale.set(s, s * 0.6); // extra flatten
    }

    setFacing(rad) {
        this.facing = rad;
        // If you ever want to skew shading vs. camera, you can pass facing into draw funcs.
    }

    update(dtSeconds) {
        // optional: tiny idle shimmer, slow color shift, etc.
    }

    _computeVariantSignature() {
        return JSON.stringify({
            type: this.type,
            seed: this.seed,
            variantParams: this.variantParams,
        });
    }

    refreshGeometry() {
        const paletteSig = this.paletteKey;
        const variantSig = this._computeVariantSignature();

        if (paletteSig === this._paletteSig && variantSig === this._variantSig) {
            return; // nothing changed
        }

        this._paletteSig = paletteSig;
        this._variantSig = variantSig;

        const palette = this.palette;
        const rng = new Random(this.seed);

        this.bodyG.clear();

        if (this.type === MINERAL_TYPES.CRYSTAL) {
            this._approxRadius = this.variantParams.baseRadius ?? 0.9;
            this._approxHeight = (this.variantParams.heightRange?.[1] ?? 3.5) * this.size;
            drawCrystalClusterBody(this.bodyG, palette, this.variantParams, rng);
        } else {
            this._approxRadius = this.variantParams.baseRadius ?? 1.4;
            this._approxHeight = (this.variantParams.heightRange?.[1] ?? 1.4) * this.size;
            drawRockClusterBody(this.bodyG, palette, this.variantParams, rng);
        }

        // Scale shadow radius by character/world scale (which is applied to container)
        // But shadowG is also scaled by container. 
        // We draw shadow at unit scale * approxRadius.
        drawShadowEllipse(this.shadowG, palette, this._approxRadius * 16); 
        // Note: The helpers use unit coordinates (approx 1 unit ~ 10-20 pixels?). 
        // Character limb width is 10. 
        // Mineral helpers use width ~0.4 - 2.0. 
        // So minerals are "small" if 1 unit = 1 pixel. 
        // We probably need to scale them up in drawing or external scale. 
        // SHAPES.BODY_WIDTH is 20. 
        // Mineral helpers use width ~1.0. So minerals are tiny (1px).
        // Let's apply a base scale multiplier in the draw routines or here.

        // CORRECTION: The prompt says "All of this is very friendly to procedural vector drawing... at unit scale."
        // And "scale: 1" in CharacterRenderer corresponds to pixels.
        // If rock width is 1.0, that's 1 pixel. That's too small.
        // Character limbs are ~10-20px. 
        // I will interpret the prompt's "unit scale" as abstract units, and I should scale up the graphics container.
        // However, `drawShadowEllipse` takes a radius. 
        // Let's multiply the abstract units by a constant `UNIT_TO_PIXEL = 20` inside the drawing to match character sizes.

        const UNIT = 20; 
        this.bodyG.scale.set(UNIT); 
        // Shadow is drawn separately, so scale it too logic wise.
        // Actually simpler to just scale the container children.
        this.shadowG.scale.set(UNIT, UNIT * 0.6);

        // Wait, `this.setScale` sets `this.graphics.scale`.
        // So if I scale `bodyG` by 20, and `graphics` by 1, total is 20.
        // This seems correct to match SHAPES constants where "1 unit" was implicitly a pixel.
        // Here "1 unit" is an abstract dimension.
    }
}