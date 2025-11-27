import * as PIXI from 'pixi.js';
import { PALETTES, SHAPES, ANIMATION_STATES } from './constants.js';

export class Character {
    constructor(x, y) {
        // Core position
        this.x = x;
        this.y = y;

        // Visual properties
        this.scale = 1;
        this.direction = 1; // 1 = right, -1 = left
        this.colors = this.getRandomPalette();

        // Animation State
        this.state = ANIMATION_STATES.IDLE;
        this.frame = Math.random() * 100; // Random start frame for variety
        this.speed = 0.1;
        this.bobOffset = 0;

        // Procedural Variation (slight differences in limb lengths)
        this.variations = {
            armLength: 1 + (Math.random() * 0.4 - 0.2),
            legLength: 1 + (Math.random() * 0.4 - 0.2),
            bodyHeight: 1 + (Math.random() * 0.2 - 0.1)
        };

        // Limb Angles (radians)
        this.angles = { leftLeg: 0, rightLeg: 0, leftArm: 0, rightArm: 0 };

        // Pixi container for character parts
        this.graphics = new PIXI.Container();
        this.graphics.x = x;
        this.graphics.y = y;
        // Enable internal child sorting so we can control draw order with zIndex
        this.graphics.sortableChildren = true;

        // Pre-create limb and body graphics so we can reuse them each frame
        this.leftLeg = new PIXI.Graphics();
        this.rightLeg = new PIXI.Graphics();
        this.leftArm = new PIXI.Graphics();
        this.rightArm = new PIXI.Graphics();
        this.bodyG = new PIXI.Graphics();

        this.graphics.addChild(this.leftLeg);
        this.graphics.addChild(this.rightLeg);
        this.graphics.addChild(this.leftArm);
        this.graphics.addChild(this.rightArm);
        this.graphics.addChild(this.bodyG);

        // Shadow (simple ellipse texture could be faster, but we'll draw it)
        this.shadow = new PIXI.Graphics();
        this.shadow.alpha = 0.3;
        this.shadow.x = x;
        this.shadow.y = y;
    }

    getRandomPalette() {
        const p = PALETTES[Math.floor(Math.random() * PALETTES.length)];
        // Clone to allow individual tweaking if needed later
        return { ...p };
    }

    // Helper to darken a hex color for "fake" shading
    darken(color, percent) {
        const num = color;
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255));
    }

    update(deltaTime, globalSpeed, globalState) {
        // Update frame counter
        const stateSpeedMultiplier = globalState === 'RUN' ? 2.0 : 1.0;
        this.frame += (this.speed * globalSpeed * stateSpeedMultiplier) * deltaTime;

        // Update Logic
        this.updateAnimation(globalState);
        this.draw();
    }

    updateAnimation(state) {
        const t = this.frame;

        if (state === ANIMATION_STATES.IDLE) {
            // Breathing / Bobbing
            this.bobOffset = Math.sin(t * 0.05) * 2;
            this.angles.leftLeg = 0;
            this.angles.rightLeg = 0;
            this.angles.leftArm = Math.sin(t * 0.05) * 0.1;
            this.angles.rightArm = Math.cos(t * 0.05) * 0.1;
        } 
        else if (state === ANIMATION_STATES.WALK) {
            this.bobOffset = Math.abs(Math.sin(t * 0.2)) * 4; // Bob up and down

            // Walk Cycle
            const legAmp = 0.6;
            const armAmp = 0.4;

            this.angles.leftLeg = Math.sin(t * 0.2) * legAmp;
            this.angles.rightLeg = Math.sin(t * 0.2 + Math.PI) * legAmp;

            this.angles.leftArm = Math.sin(t * 0.2 + Math.PI) * armAmp;
            this.angles.rightArm = Math.sin(t * 0.2) * armAmp;
        } 
        else if (state === ANIMATION_STATES.RUN) {
             this.bobOffset = Math.abs(Math.sin(t * 0.3)) * 6;

             // Run Cycle (More aggressive angles)
             const legAmp = 1.2;
             const armAmp = 0.9;

             this.angles.leftLeg = Math.sin(t * 0.3) * legAmp;
             this.angles.rightLeg = Math.sin(t * 0.3 + Math.PI) * legAmp;

             this.angles.leftArm = Math.sin(t * 0.3 + Math.PI) * armAmp;
             this.angles.rightArm = Math.sin(t * 0.3) * armAmp;
        }
    }

    draw() {
        const g = this.graphics;

        // Configs
        const s = this.scale;
        const outline = SHAPES.OUTLINE_THICKNESS * s;
        const bodyW = SHAPES.BODY_WIDTH * s;
        const bodyH = SHAPES.BODY_HEIGHT * s * this.variations.bodyHeight;
        const headR = SHAPES.HEAD_RADIUS * s;
        const limbW = SHAPES.LIMB_WIDTH * s;
        const limbH = SHAPES.LIMB_HEIGHT * s;

        // --- CENTER OF CHARACTER ---
        const centerX = 0;
        const centerY = -20 * s - this.bobOffset; // Lift body up

        // --- SHADOW ---
        const shadow = this.shadow;
        shadow.clear();
        // Move shadow down roughly by the leg length so it sits under the feet
        const shadowYOffset = centerY + bodyH / 2 + (limbH * this.variations.legLength) + 2 * s;
        shadow.beginFill(0x000000);
        shadow.drawEllipse(0, shadowYOffset, bodyW * 0.9, 6 * s);
        shadow.endFill();

        // --- LIMBS: reuse existing graphics objects ---

        // Left leg
        this.drawLimbShape(
            this.leftLeg,
            centerX - 6 * s,
            centerY + bodyH / 2 - 2 * s,
            limbW,
            limbH * this.variations.legLength,
            this.angles.leftLeg,
            this.colors.legs,
            outline
        );

        // Right leg
        this.drawLimbShape(
            this.rightLeg,
            centerX + 6 * s,
            centerY + bodyH / 2 - 2 * s,
            limbW,
            limbH * this.variations.legLength,
            this.angles.rightLeg,
            this.colors.legs,
            outline
        );

        // Left arm
        this.drawLimbShape(
            this.leftArm,
            centerX - bodyW / 2,
            centerY - bodyH / 4,
            limbW * 0.8,
            limbH * this.variations.armLength,
            this.angles.leftArm,
            this.colors.arms,
            outline
        );

        // Right arm
        this.drawLimbShape(
            this.rightArm,
            centerX + bodyW / 2,
            centerY - bodyH / 4,
            limbW * 0.8,
            limbH * this.variations.armLength,
            this.angles.rightArm,
            this.colors.arms,
            outline
        );

        // --- BODY + HEAD (reuse bodyG) ---
        const bodyG = this.bodyG;
        bodyG.clear();

        // Body
        bodyG.lineStyle(outline, 0x000000, 1, 0.5); // Outer alignment
        bodyG.beginFill(this.colors.body);
        bodyG.drawRoundedRect(centerX - bodyW / 2, centerY - bodyH / 2, bodyW, bodyH, 4 * s);

        // Fake Shadow under body
        bodyG.lineStyle(0);
        bodyG.beginFill(0x000000, 0.2); // Semi transparent shadow
        bodyG.drawRect(
            centerX - bodyW / 2 + outline,
            centerY + bodyH / 2 - 6 * s,
            bodyW - outline * 2,
            4 * s
        );
        bodyG.endFill();

        // Head
        bodyG.lineStyle(outline, 0x000000, 1, 0.5);
        bodyG.beginFill(this.colors.head);
        bodyG.drawCircle(centerX, centerY - bodyH / 2 - headR + 4 * s, headR);

        // Highlight on head
        bodyG.lineStyle(0);
        bodyG.beginFill(0xFFFFFF, 0.3);
        bodyG.drawCircle(centerX - headR / 3, centerY - bodyH / 2 - headR, headR / 3);
        bodyG.endFill();

        // --- LAYERING BASED ON FACING DIRECTION USING zIndex ---
        // 1 = facing right: right limbs are "far"; -1 = facing left: left limbs are "far"
        if (this.direction === -1) {
            // Facing left: left side is farther, draw behind body
            this.leftLeg.zIndex = 0;   // far leg behind body
            this.leftArm.zIndex = 1;   // far arm behind body
            bodyG.zIndex = 2;          // torso + head
            this.rightLeg.zIndex = 3;  // near leg in front
            this.rightArm.zIndex = 4;  // near arm in front
        } else {
            // Facing right (default): right side is farther
            this.rightLeg.zIndex = 0;  // far leg behind body
            this.rightArm.zIndex = 1;  // far arm behind body
            bodyG.zIndex = 2;          // torso + head
            this.leftLeg.zIndex = 3;   // near leg in front
            this.leftArm.zIndex = 4;   // near arm in front
        }
    }

    drawLimbShape(graphics, x, y, w, h, angle, color, outline) {
        graphics.clear();
        graphics.position.set(x, y);
        graphics.rotation = angle;

        graphics.lineStyle(outline, 0x000000, 1, 0.5);
        graphics.beginFill(color);
        // Pivot is top center of limb: draw from ( -w/2, 0 )
        graphics.drawRoundedRect(-w / 2, 0, w, h, w / 2);
        graphics.endFill();
    }

    destroy() {
        // Destroy the container and all child graphics to free GPU/CPU resources
        this.graphics.destroy({ children: true });
        this.shadow.destroy();
        this.leftLeg = null;
        this.rightLeg = null;
        this.leftArm = null;
        this.rightArm = null;
        this.bodyG = null;
    }
}