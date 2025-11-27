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

        // Pixi Graphics
        this.graphics = new PIXI.Graphics();
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
        g.clear();
        g.removeChildren(); // remove previous limb children so we don't leak graphics

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
        shadow.beginFill(0x000000);
        shadow.drawEllipse(0, SHAPES.LIMB_HEIGHT * s + 15 * s, bodyW, 6 * s);
        shadow.endFill();

        // --- DRAWING CHARACTER ---
        // Center of character logic
        const centerX = 0;
        const centerY = -20 * s - this.bobOffset; // Lift body up

        // Determine which side is "far" based on facing direction.
        // direction: 1 = facing right (far side = right), -1 = facing left (far side = left)
        const farIsLeft = this.direction === -1;

        // Draw far-side limbs first so they appear behind the body.
        if (farIsLeft) {
            // Far: Left Leg & Left Arm
            this.drawLimb(g, centerX - 6 * s, centerY + bodyH/2, limbW, limbH * this.variations.legLength, this.angles.leftLeg, this.colors.legs, outline);
            this.drawLimb(g, centerX - bodyW/2, centerY - bodyH/4, limbW * 0.8, limbH * this.variations.armLength, this.angles.leftArm, this.colors.arms, outline);
        } else {
            // Far: Right Leg & Right Arm
            this.drawLimb(g, centerX + 6 * s, centerY + bodyH/2, limbW, limbH * this.variations.legLength, this.angles.rightLeg, this.colors.legs, outline);
            this.drawLimb(g, centerX + bodyW/2, centerY - bodyH/4, limbW * 0.8, limbH * this.variations.armLength, this.angles.rightArm, this.colors.arms, outline);
        }

        // --- BODY ---
        g.lineStyle(outline, 0x000000, 1, 0.5); // Outer alignment
        g.beginFill(this.colors.body);
        g.drawRoundedRect(centerX - bodyW/2, centerY - bodyH/2, bodyW, bodyH, 4 * s);

        // Fake Shadow under body
        g.lineStyle(0);
        g.beginFill(0x000000, 0.2); // Semi transparent shadow
        g.drawRect(centerX - bodyW/2 + outline, centerY + bodyH/2 - 6*s, bodyW - outline*2, 4*s);
        g.endFill();

        // Draw near-side limbs after the body so they appear in front.
        if (farIsLeft) {
            // Near: Right Leg & Right Arm
            this.drawLimb(g, centerX + 6 * s, centerY + bodyH/2, limbW, limbH * this.variations.legLength, this.angles.rightLeg, this.colors.legs, outline);
            this.drawLimb(g, centerX + bodyW/2, centerY - bodyH/4, limbW * 0.8, limbH * this.variations.armLength, this.angles.rightArm, this.colors.arms, outline);
        } else {
            // Near: Left Leg & Left Arm
            this.drawLimb(g, centerX - 6 * s, centerY + bodyH/2, limbW, limbH * this.variations.legLength, this.angles.leftLeg, this.colors.legs, outline);
            this.drawLimb(g, centerX - bodyW/2, centerY - bodyH/4, limbW * 0.8, limbH * this.variations.armLength, this.angles.leftArm, this.colors.arms, outline);
        }

        // --- HEAD ---
        g.lineStyle(outline, 0x000000, 1, 0.5);
        g.beginFill(this.colors.head);
        g.drawCircle(centerX, centerY - bodyH/2 - headR + 4*s, headR);

        // Highlight on head
        g.lineStyle(0);
        g.beginFill(0xFFFFFF, 0.3);
        g.drawCircle(centerX - headR/3, centerY - bodyH/2 - headR, headR/3);
        g.endFill();
    }

    drawLimb(g, x, y, w, h, angle, color, outline) {
        // Create a temporary Graphics for limb so we can set position/rotation independently.
        const limbG = new PIXI.Graphics();
        limbG.position.set(x, y);
        limbG.rotation = angle;

        limbG.lineStyle(outline, 0x000000, 1, 0.5);
        limbG.beginFill(color);
        // Pivot is top center of limb: draw from ( -w/2, 0 )
        limbG.drawRoundedRect(-w/2, 0, w, h, w/2);
        limbG.endFill();

        // Add as a child of the main graphics container so it inherits global transforms/position
        g.addChild(limbG);
    }

    destroy() {
        this.graphics.destroy();
        this.shadow.destroy();
    }
}