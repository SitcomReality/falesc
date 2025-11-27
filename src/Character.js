import * as PIXI from 'pixi.js';
import { PALETTES } from './constants.js';
import { CharacterAnimation } from './character/CharacterAnimation.js';
import { CharacterRenderer } from './character/CharacterRenderer.js';

export class Character {
    constructor(x, y) {
        // Core position
        this.x = x;
        this.y = y;

        // Visual properties
        this.scale = 1;
        this.facing = Math.PI / 2; // Radians. 0 = Front, PI/2 = Right
        this.colors = this.getRandomPalette();

        // Animation State
        this.state = null; // Global state comes from outside (GameApp)
        this.frame = Math.random() * 100; // Random start frame for variety
        this.speed = 0.1;
        this.bobOffset = 0;
        this.torsoTilt = 0; // Radians, rotation of torso around hip joint

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
        this.graphics.addChild(this.leftArm); // Restore arms to root graphics container
        this.graphics.addChild(this.rightArm); // Restore arms to root graphics container
        this.graphics.addChild(this.bodyG);

        // Arms are children of bodyG so they rotate with the torso tilt
        // REVERT: We manually calculate rotation/position now to allow for Z-ordering flexibility
        // this.bodyG.sortableChildren = true;
        // this.bodyG.addChild(this.leftArm);
        // this.bodyG.addChild(this.rightArm);

        // Shadow (simple ellipse texture could be faster, but we'll draw it)
        this.shadow = new PIXI.Graphics();
        this.shadow.alpha = 0.3;
        this.shadow.x = x;
        this.shadow.y = y;

        // Helper modules
        this.animation = new CharacterAnimation(this);
        this.renderer = new CharacterRenderer(this);
    }

    getRandomPalette() {
        const p = PALETTES[Math.floor(Math.random() * PALETTES.length)];
        // Clone to allow individual tweaking if needed later
        return { ...p };
    }

    update(deltaTime, globalSpeed, globalState) {
        // Delegate to animation module for time-based updates
        this.animation.update(deltaTime, globalSpeed, globalState);
        // Delegate to renderer module for drawing
        this.renderer.draw();
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

        this.animation = null;
        this.renderer = null;
    }
}