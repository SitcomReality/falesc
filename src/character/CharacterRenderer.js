import { SHAPES } from '../constants.js';

export class CharacterRenderer {
    constructor(character) {
        this.character = character;
    }

    draw() {
        const c = this.character;
        const g = c.graphics;

        // Configs
        const s = c.scale;
        const outline = SHAPES.OUTLINE_THICKNESS * s;
        const bodyW = SHAPES.BODY_WIDTH * s;
        const bodyH = SHAPES.BODY_HEIGHT * s * c.variations.bodyHeight;
        const headR = SHAPES.HEAD_RADIUS * s;
        const limbW = SHAPES.LIMB_WIDTH * s;
        const limbH = SHAPES.LIMB_HEIGHT * s;

        // --- CENTER OF CHARACTER ---
        const centerX = 0;
        const centerY = -20 * s - c.bobOffset; // Lift body up

        // --- FACING LOGIC ---
        // 0 = Front, PI/2 = Right, PI = Back, 3PI/2 = Left
        const cosA = Math.cos(c.facing);
        const sinA = Math.sin(c.facing);

        // View Factor: 1.0 = Side View, 0.0 = Front/Back View
        const viewSideFactor = Math.abs(sinA);
        const viewFrontFactor = 1.0 - viewSideFactor;

        // Limb Positioning (Sliding)
        // At Front view (cos=1), limbs are at max width (+/- bodyW/2)
        // At Side view (cos=0), limbs are centered (0)
        const armXOffset = (bodyW / 2) * cosA;
        const legXOffset = (6 * s) * cosA;

        // Z-Sorting Weights
        // Depth is proportional to sin(angle). 
        // Right side (+x) is "Near" when facing Right (sin=1).
        const depthScale = 20; // Max depth range units
        const rightLimbZ = depthScale * sinA;
        const leftLimbZ = -depthScale * sinA;
        const bodyZ = 0;

        // Apply Z-Indices
        // Base Z for body is 100 to avoid negative confusion
        c.bodyG.zIndex = 100 + bodyZ;

        // Arms slightly outside/above legs usually
        // If sinA >= 0 the right side is the near side (right limbs should be in front), 
        // so put the far-side arm behind its leg. Otherwise left side is near.
        if (sinA >= 0) {
            // right = near: right arm above right leg, left arm behind left leg
            c.rightArm.zIndex = 100 + rightLimbZ + 1;
            c.rightLeg.zIndex = 100 + rightLimbZ;
            c.leftArm.zIndex = 100 + leftLimbZ - 1;
            c.leftLeg.zIndex = 100 + leftLimbZ;
        } else {
            // left = near: left arm above left leg, right arm behind right leg
            c.leftArm.zIndex = 100 + leftLimbZ + 1;
            c.leftLeg.zIndex = 100 + leftLimbZ;
            c.rightArm.zIndex = 100 + rightLimbZ - 1;
            c.rightLeg.zIndex = 100 + rightLimbZ;
        }

        // Determine which limbs are on the far side for vertical offset
        const leftIsFar = (sinA >= 0);  // when facing right, left side is farther
        const rightIsFar = !leftIsFar;
        // Far-side limbs lift up to 2 units, scaled by character scale and side-view factor
        const farLimbLift = -2 * s * viewSideFactor;

        // --- ANIMATION PERSPECTIVE ---
        // Flatten the rotation arc when facing front (it becomes vertical movement/scaling)
        // We keep 20% rotation even at front view so it's not totally stiff
        const rotScale = 0.2 + (0.8 * viewSideFactor);

        // Shorten limbs when they swing "towards" camera in front view
        const getShortenedLen = (baseLen, angle) => {
            const swingAmt = Math.abs(angle); 
            // Shorten proportional to swing angle * frontness
            const shortenAmt = swingAmt * viewFrontFactor * 0.3;
            return baseLen * (1.0 - shortenAmt);
        };

        const rArmLen = getShortenedLen(limbH * c.variations.armLength, c.angles.rightArm);
        const lArmLen = getShortenedLen(limbH * c.variations.armLength, c.angles.leftArm);
        const rLegLen = getShortenedLen(limbH * c.variations.legLength, c.angles.rightLeg);
        const lLegLen = getShortenedLen(limbH * c.variations.legLength, c.angles.leftLeg);

        const rArmAng = c.angles.rightArm * rotScale;
        const lArmAng = c.angles.leftArm * rotScale;
        const rLegAng = c.angles.rightLeg * rotScale;
        const lLegAng = c.angles.leftLeg * rotScale;

        // Base attachment Y positions
        const legBaseY = centerY + bodyH / 2 - 2 * s;
        const armBaseY = centerY - bodyH / 4;
        const hipX = centerX;
        const hipY = legBaseY; // top of legs, bottom-center of torso

        // --- SHADOW ---
        const shadow = c.shadow;
        shadow.clear();
        // Move shadow down roughly by the leg length so it sits under the feet
        const shadowYOffset = centerY + bodyH / 2 + (limbH * c.variations.legLength) - 2 * s;
        shadow.beginFill(0x000000);
        shadow.drawEllipse(0, shadowYOffset, bodyW * 0.9, 6 * s);
        shadow.endFill();

        // --- DRAW LIMBS ---
        // Left leg
        this.drawLimbShape(
            c.leftLeg,
            centerX - legXOffset,
            legBaseY + (leftIsFar ? farLimbLift : 0),
            limbW,
            lLegLen,
            lLegAng,
            c.colors.legs,
            outline
        );

        // Right leg
        this.drawLimbShape(
            c.rightLeg,
            centerX + legXOffset,
            legBaseY + (rightIsFar ? farLimbLift : 0),
            limbW,
            rLegLen,
            rLegAng,
            c.colors.legs,
            outline
        );

        // Left arm
        this.drawLimbShape(
            c.leftArm,
            centerX - armXOffset,
            armBaseY + (leftIsFar ? farLimbLift : 0),
            limbW * 0.8,
            lArmLen,
            lArmAng,
            c.colors.arms,
            outline
        );

        // Right arm
        this.drawLimbShape(
            c.rightArm,
            centerX + armXOffset,
            armBaseY + (rightIsFar ? farLimbLift : 0),
            limbW * 0.8,
            rArmLen,
            rArmAng,
            c.colors.arms,
            outline
        );

        // --- BODY + HEAD (reuse bodyG), rotated around hip joint ---
        const bodyG = c.bodyG;
        bodyG.clear();

        // Position the body container at the hip and rotate the whole torso/head
        bodyG.position.set(hipX, hipY);
        bodyG.rotation = c.torsoTilt || 0;

        // Body
        bodyG.lineStyle(outline, 0x000000, 1, 0.5); // Outer alignment
        bodyG.beginFill(c.colors.body);
        // Draw torso so that hip is at bottom-center of this rect
        bodyG.drawRoundedRect(-bodyW / 2, -bodyH, bodyW, bodyH, 4 * s);

        // Fake Shadow under body (near the hip)
        bodyG.lineStyle(0);
        bodyG.beginFill(0x000000, 0.2); // Semi transparent shadow
        bodyG.drawRect(
            -bodyW / 2 + outline,
            -6 * s,
            bodyW - outline * 2,
            4 * s
        );
        bodyG.endFill();

        // Head
        bodyG.lineStyle(outline, 0x000000, 1, 0.5);
        bodyG.beginFill(c.colors.head);
        bodyG.drawCircle(0, -bodyH - headR + 4 * s, headR);

        // Highlight on head
        bodyG.lineStyle(0);
        bodyG.beginFill(0xFFFFFF, 0.3);
        bodyG.drawCircle(-headR / 3, -bodyH - headR, headR / 3);
        bodyG.endFill();
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
}