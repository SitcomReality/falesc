import { SHAPES } from '../constants.js';

export class CharacterRenderer {
    constructor(character) {
        this.character = character;

        // Cached geometry / palette state
        this.initialized = false;
        this.lastPaletteSignature = null;

        // Layout constants in unscaled local space
        this.baseCenterY = -20; // matches previous baseCenterY with s = 1
        this.shadowOffsetY = 0; // will be computed in init per character
    }

    getPaletteSignature() {
        const c = this.character.colors;
        return `${c.head}_${c.body}_${c.legs}_${c.arms}`;
    }

    init() {
        const c = this.character;
        const paletteSig = this.getPaletteSignature();

        // If already initialized with same palette, skip re-draw
        if (this.initialized && paletteSig === this.lastPaletteSignature) {
            return;
        }

        this.initialized = true;
        this.lastPaletteSignature = paletteSig;

        const bodyBaseH = SHAPES.BODY_HEIGHT * c.variations.bodyHeight;
        const headR = SHAPES.HEAD_RADIUS;
        const limbW = SHAPES.LIMB_WIDTH;
        const limbHArm = SHAPES.LIMB_HEIGHT * c.variations.armLength;
        const limbHLeg = SHAPES.LIMB_HEIGHT * c.variations.legLength;
        const bodyW = SHAPES.BODY_WIDTH;
        const outline = SHAPES.OUTLINE_THICKNESS;

        // Clear and draw static limb geometry once (scale 1)
        const drawLimb = (graphics, limbHeight) => {
            graphics.clear();
            graphics.lineStyle(outline, 0x000000, 1, 0.5);
            graphics.beginFill(c.colors.legs); // default; arms will be recolored
            graphics.drawRoundedRect(-limbW / 2, 0, limbW, limbHeight, limbW / 2);
            graphics.endFill();
            // Pivot at top center
            graphics.position.set(0, 0);
            graphics.rotation = 0;
            graphics.scale.set(1, 1);
        };

        // Legs use legs color
        drawLimb(c.leftLeg, limbHLeg);
        drawLimb(c.rightLeg, limbHLeg);

        // Arms use arms color (override fill)
        c.leftArm.clear();
        c.leftArm.lineStyle(outline, 0x000000, 1, 0.5);
        c.leftArm.beginFill(c.colors.arms);
        c.leftArm.drawRoundedRect(-limbW / 2, 0, limbW, limbHArm, limbW / 2);
        c.leftArm.endFill();
        c.leftArm.position.set(0, 0);
        c.leftArm.rotation = 0;
        c.leftArm.scale.set(1, 1);

        c.rightArm.clear();
        c.rightArm.lineStyle(outline, 0x000000, 1, 0.5);
        c.rightArm.beginFill(c.colors.arms);
        c.rightArm.drawRoundedRect(-limbW / 2, 0, limbW, limbHArm, limbW / 2);
        c.rightArm.endFill();
        c.rightArm.position.set(0, 0);
        c.rightArm.rotation = 0;
        c.rightArm.scale.set(1, 1);

        // Body + head geometry (drawn once at scale 1)
        const bodyG = c.bodyG;
        bodyG.clear();

        // Torso rectangle with hip at bottom center
        bodyG.lineStyle(outline, 0x000000, 1, 0.5); // Outer alignment
        bodyG.beginFill(c.colors.body);
        bodyG.drawRoundedRect(-bodyW / 2, -bodyBaseH, bodyW, bodyBaseH, 4);
        bodyG.endFill();

        // Fake shadow under body (near the hip)
        bodyG.lineStyle(0);
        bodyG.beginFill(0x000000, 0.2);
        bodyG.drawRect(
            -bodyW / 2 + outline,
            -6,
            bodyW - outline * 2,
            4
        );
        bodyG.endFill();

        // Head is its own graphic
        const headG = c.headG;
        headG.clear();
        headG.lineStyle(outline, 0x000000, 1, 0.5);
        headG.beginFill(c.colors.head);
        headG.drawCircle(0, 0, headR);
        headG.endFill();

        // Highlight on head
        headG.lineStyle(0);
        headG.beginFill(0xFFFFFF, 0.3);
        headG.drawCircle(-headR / 3, -headR / 3, headR / 3);
        headG.endFill();

        // Ensure transforms are reset; actual placement done per-frame
        bodyG.position.set(0, 0);
        bodyG.rotation = 0;
        bodyG.scale.set(1, 1);

        headG.position.set(0, 0);
        headG.rotation = 0;
        headG.scale.set(1, 1);

        // Shadow: draw once, static local geometry
        const shadow = c.shadow;
        shadow.clear();

        // Base (unscaled) center Y and leg length used to position shadow ellipse
        const baseCenterY = this.baseCenterY;
        const legBaseY = baseCenterY + bodyBaseH / 2 - 2;
        const hipY = legBaseY;
        const shadowYOffset = hipY + limbHLeg; // under the feet

        this.shadowOffsetY = shadowYOffset;

        shadow.beginFill(0x000000);
        shadow.drawEllipse(0, this.shadowOffsetY, bodyW * 0.9, 6);
        shadow.endFill();
    }

    draw() {
        const c = this.character;
        const g = c.graphics;

        // Ensure static geometry is ready and palette is up to date
        this.init();

        // Configs in unscaled local space
        const s = 1; // geometry is drawn at scale 1; world scaling is on container
        const bodyBaseH = SHAPES.BODY_HEIGHT * c.variations.bodyHeight;
        const headR = SHAPES.HEAD_RADIUS;
        const limbW = SHAPES.LIMB_WIDTH;
        const limbH = SHAPES.LIMB_HEIGHT;
        const bodyW = SHAPES.BODY_WIDTH;

        // --- CENTER OF CHARACTER ---
        const centerX = 0;
        const baseCenterY = this.baseCenterY * s;
        const centerY = baseCenterY - c.bobOffset; // Lift body up visually while keeping a ground reference

        // --- FACING LOGIC ---
        // 0 = Front, PI/2 = Right, PI = Back, 3PI/2 = Left
        const cosA = Math.cos(c.facing);
        const sinA = Math.sin(c.facing);

        // View Factor: 1.0 = Side View, 0.0 = Front/Back View
        const viewSideFactor = Math.abs(sinA);
        const viewFrontFactor = 1.0 - viewSideFactor;

        // Perspective shortening for torso when leaning and facing front/back.
        const rawTorsoTilt = c.torsoTilt || 0;
        const torsoLeanAmount = Math.abs(rawTorsoTilt);
        const torsoPerspectiveScale = 1 - torsoLeanAmount * viewFrontFactor * 0.15;

        // Limb Positioning (Sliding)
        const armXOffset = (bodyW / 2) * cosA;
        const legXOffset = (6 * s) * cosA;

        // Z-Sorting Weights
        let zFarArm = 10;
        let zFarLeg = 20;
        let zBody = 30;
        let zHead = 31; // head sits above torso
        let zNearLeg = 40;
        let zNearArm = 50;

        if (sinA >= 0) {
            // Facing Right: left limbs are visually nearer, right limbs are visually farther
            c.leftArm.zIndex = zNearArm;
            c.leftLeg.zIndex = zNearLeg;
            c.bodyG.zIndex = zBody;
            c.headG.zIndex = zHead;
            c.rightLeg.zIndex = zFarLeg;
            c.rightArm.zIndex = zFarArm;
        } else {
            // Facing Left: right limbs are visually nearer, left limbs are visually farther
            c.leftArm.zIndex = zFarArm;
            c.leftLeg.zIndex = zFarLeg;
            c.bodyG.zIndex = zBody;
            c.headG.zIndex = zHead;
            c.rightLeg.zIndex = zNearLeg;
            c.rightArm.zIndex = zNearArm;
        }

        // Determine which limbs are on the far side for vertical offset
        const leftIsFar = (sinA < 0);   // when facing Left, left side is farther
        const rightIsFar = !leftIsFar;
        const farLimbLift = -2 * s * viewSideFactor;

        // --- ANIMATION PERSPECTIVE ---
        // Flatten the rotation arc when facing front (it becomes vertical movement/scaling)
        // We keep 20% rotation even at front view so it's not totally stiff
        const rotScale = 0.2 + (0.8 * viewSideFactor);

        // Limb foreshortening handled via Y-scale rather than geometry resize
        const getShortenScale = (angle) => {
            const swingAmt = Math.abs(angle);
            const shortenAmt = swingAmt * viewFrontFactor * 0.3;
            return 1.0 - shortenAmt;
        };

        const rArmScaleY = getShortenScale(c.angles.rightArm);
        const lArmScaleY = getShortenScale(c.angles.leftArm);
        const rLegScaleY = getShortenScale(c.angles.rightLeg);
        const lLegScaleY = getShortenScale(c.angles.leftLeg);

        const rArmAng = c.angles.rightArm * rotScale;
        const lArmAng = c.angles.leftArm * rotScale;
        const rLegAng = c.angles.rightLeg * rotScale;
        const lLegAng = c.angles.leftLeg * rotScale;

        // Base attachment Y positions
        const legBaseY = centerY + bodyBaseH / 2 - 2 * s;
        const armBaseY = centerY - bodyBaseH / 4;
        const hipX = centerX;
        const hipY = legBaseY; // top of legs, bottom-center of torso

        // Calculate arm attachment Y relative to hip (bodyG pivot)
        const armRelY = armBaseY - hipY;

        // Torso Rotation Helpers
        const sideSign = sinA >= 0 ? 1 : -1;
        const visualTorsoTilt = rawTorsoTilt * viewSideFactor;
        const tTilt = visualTorsoTilt * sideSign;
        const cosT = Math.cos(tTilt);
        const sinT = Math.sin(tTilt);

        // Calculate Shoulder Positions in World Space (relative to graphics container)
        const getShoulderPos = (sideSignForShoulder) => {
            const lx = sideSignForShoulder * armXOffset;
            const ly = armRelY;

            const rx = lx * cosT - ly * sinT;
            const ry = lx * sinT + ly * cosT;

            return { x: hipX + rx, y: hipY + ry };
        };

        const lShoulder = getShoulderPos(-1);
        const rShoulder = getShoulderPos(1);

        // --- SHADOW ---
        const shadow = c.shadow;
        // Shadow shape is static; we only update groundY based on world position and scale.
        const worldScale = c.scale;
        c.groundY = c.shadow.y + this.shadowOffsetY * worldScale;

        // --- DRAW LIMBS USING TRANSFORMS ONLY ---
        // Left leg
        c.leftLeg.position.set(centerX - legXOffset, legBaseY + (leftIsFar ? farLimbLift : 0));
        c.leftLeg.rotation = lLegAng;
        c.leftLeg.scale.set(1, lLegScaleY);

        // Right leg
        c.rightLeg.position.set(centerX + legXOffset, legBaseY + (rightIsFar ? farLimbLift : 0));
        c.rightLeg.rotation = rLegAng;
        c.rightLeg.scale.set(1, rLegScaleY);

        // Left arm
        c.leftArm.position.set(lShoulder.x, lShoulder.y + (leftIsFar ? farLimbLift : 0));
        c.leftArm.rotation = lArmAng + tTilt;
        c.leftArm.scale.set(1, lArmScaleY);

        // Right arm
        c.rightArm.position.set(rShoulder.x, rShoulder.y + (rightIsFar ? farLimbLift : 0));
        c.rightArm.rotation = rArmAng + tTilt;
        c.rightArm.scale.set(1, rArmScaleY);

        // --- BODY + HEAD (reuse bodyG), rotated around hip joint ---
        const bodyG = c.bodyG;
        bodyG.position.set(hipX, hipY);
        bodyG.rotation = tTilt;
        bodyG.scale.set(1, torsoPerspectiveScale);

        // Head follows body rotation but has its own graphic for z-index / future animation
        const headG = c.headG;
        // Position head relative to hip in body space, then let container scale/rotate handle rest
        const headLocalY = -bodyBaseH - headR + 4 * s;
        // Convert body-local to world (graphics-local) via torso rotation
        const hx = 0 * cosT - headLocalY * sinT;
        const hy = 0 * sinT + headLocalY * cosT;
        headG.position.set(hipX + hx, hipY + hy);
        headG.rotation = tTilt;
    }
}