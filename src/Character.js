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
        // Container: remove previous parts
        g.removeChildren();

        // Configs
        const s = this.scale;
        const outline = SHAPES.OUTLINE_THICKNESS * s;
        const bodyW = SHAPES.BODY_WIDTH * s;
        const bodyH = SHAPES.BODY_HEIGHT * s * this.variations.bodyHeight;
        const headR = SHAPES.HEAD_RADIUS * s;
        const limbW = SHAPES.LIMB_WIDTH * s;
        const limbH = SHAPES.LIMB_HEIGHT * s;

        // --- SHADOW ---
        const shadow = this.shadow;
        shadow.clear();
        // Position shadow under the character's feet using the same centerY/bodyH used for drawing the body,
        // so the shadow follows bobbing and scale correctly.
        const shadowYOffset = centerY + bodyH / 2 + 4 * s; // just below the bottom of the body
        shadow.beginFill(0x000000);
        shadow.drawEllipse(0, shadowYOffset, bodyW * 0.9, 6 * s);
        shadow.endFill();

        // --- CENTER OF CHARACTER ---
        const centerX = 0;
        const centerY = -20 * s - this.bobOffset; // Lift body up

        // Pre-create limb graphics so we can control draw order
        const leftLeg = this.drawLimb(
            centerX - 6 * s,
            centerY + bodyH / 2 - 2 * s,
            limbW,
            limbH * this.variations.legLength,
            this.angles.leftLeg,
            this.colors.legs,
            outline
        );

        const rightLeg = this.drawLimb(
            centerX + 6 * s,
            centerY + bodyH / 2 - 2 * s,
            limbW,
            limbH * this.variations.legLength,
            this.angles.rightLeg,
            this.colors.legs,
            outline
        );

        const leftArm = this.drawLimb(
            centerX - bodyW / 2,
            centerY - bodyH / 4,
            limbW * 0.8,
            limbH * this.variations.armLength,
            this.angles.leftArm,
            this.colors.arms,
            outline
        );

        const rightArm = this.drawLimb(
            centerX + bodyW / 2,
            centerY - bodyH / 4,
            limbW * 0.8,
            limbH * this.variations.armLength,
            this.angles.rightArm,
            this.colors.arms,
            outline
        );

        // --- BODY + HEAD AS ONE GRAPHICS ---
        const bodyG = new PIXI.Graphics();

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

        // --- LAYERING BASED ON FACING DIRECTION ---
        // 1 = facing right: right limbs are "far"; -1 = facing left: left limbs are "far"
        if (this.direction === -1) {
            // Facing left: left side is farther, draw behind body
            g.addChild(leftLeg);   // far leg behind body
            g.addChild(leftArm);   // far arm behind body
            g.addChild(bodyG);     // torso + head
            g.addChild(rightLeg);  // near leg in front
            g.addChild(rightArm);  // near arm in front
        } else {
            // Facing right (default): right side is farther
            g.addChild(rightLeg);  // far leg behind body
            g.addChild(rightArm);  // far arm behind body
            g.addChild(bodyG);     // torso + head
            g.addChild(leftLeg);   // near leg in front
            g.addChild(leftArm);   // near arm in front
        }
    }

    drawLimb(x, y, w, h, angle, color, outline) {
        // Create a Graphics for this limb
        const limbG = new PIXI.Graphics();
        limbG.position.set(x, y);
        limbG.rotation = angle;

        limbG.lineStyle(outline, 0x000000, 1, 0.5);
        limbG.beginFill(color);
        // Pivot is top center of limb: draw from ( -w/2, 0 )
        limbG.drawRoundedRect(-w / 2, 0, w, h, w / 2);
        limbG.endFill();

        // Return limb graphics so caller can decide layering order
        return limbG;
    }

    destroy() {
        this.graphics.destroy();
        this.shadow.destroy();
    }
}