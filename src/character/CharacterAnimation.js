import { ANIMATION_STATES } from '../constants.js';

export class CharacterAnimation {
    constructor(character) {
        this.character = character;
    }

    update(deltaTime, globalSpeed, globalState) {
        const c = this.character;

        // Update frame counter
        const stateSpeedMultiplier = globalState === ANIMATION_STATES.RUN ? 2.0 : 1.0;
        c.frame += (c.speed * globalSpeed * stateSpeedMultiplier) * deltaTime;

        // Update animation state driven by global state
        this.updateAnimation(globalState);
    }

    updateAnimation(state) {
        const c = this.character;
        const t = c.frame;

        if (state === ANIMATION_STATES.IDLE) {
            // Breathing / Bobbing
            c.bobOffset = Math.sin(t * 0.05) * 2;
            c.angles.leftLeg = 0;
            c.angles.rightLeg = 0;
            c.angles.leftArm = Math.sin(t * 0.05) * 0.1;
            c.angles.rightArm = Math.cos(t * 0.05) * 0.1;
        } 
        else if (state === ANIMATION_STATES.WALK) {
            c.bobOffset = Math.abs(Math.sin(t * 0.2)) * 4; // Bob up and down

            // Walk Cycle
            const legAmp = 0.6;
            const armAmp = 0.4;

            c.angles.leftLeg = Math.sin(t * 0.2) * legAmp;
            c.angles.rightLeg = Math.sin(t * 0.2 + Math.PI) * legAmp;

            c.angles.leftArm = Math.sin(t * 0.2 + Math.PI) * armAmp;
            c.angles.rightArm = Math.sin(t * 0.2) * armAmp;
        } 
        else if (state === ANIMATION_STATES.RUN) {
            c.bobOffset = Math.abs(Math.sin(t * 0.3)) * 6;

            // Run Cycle (More aggressive angles)
            const legAmp = 1.2;
            const armAmp = 0.9;

            c.angles.leftLeg = Math.sin(t * 0.3) * legAmp;
            c.angles.rightLeg = Math.sin(t * 0.3 + Math.PI) * legAmp;

            c.angles.leftArm = Math.sin(t * 0.3 + Math.PI) * armAmp;
            c.angles.rightArm = Math.sin(t * 0.3) * armAmp;
        } else {
            // Fallback to idle-like behavior for unknown states
            c.bobOffset = 0;
        }
    }
}