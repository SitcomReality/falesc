import { ANIMATION_STATES } from '../constants.js';

export class CharacterAnimation {
    constructor(character) {
        this.character = character;
    }

    update(deltaTime, globalSpeed, globalState) {
        const c = this.character;

        // Update state timer
        c.stateTime += deltaTime * globalSpeed;

        // Update frame counter
        const stateSpeedMultiplier = globalState === ANIMATION_STATES.RUN ? 2.0 : 1.0;
        c.frame += (c.speed * globalSpeed * stateSpeedMultiplier) * deltaTime;

        // Update animation state driven by global state
        this.updateAnimation(globalState);
    }

    updateAnimation(state) {
        const c = this.character;
        const t = c.frame;

        // Calculate baseline IDLE parameters based on current time 't'
        const idleBob = Math.sin(t * 0.05) * 2;
        const idleLArm = Math.sin(t * 0.05) * 0.1;
        const idleRArm = Math.cos(t * 0.05) * 0.1;

        if (state === ANIMATION_STATES.IDLE) {
            // Breathing / Bobbing
            c.bobOffset = idleBob;
            c.torsoTilt = 0;
            c.angles.leftLeg = 0;
            c.angles.rightLeg = 0;
            c.angles.leftArm = idleLArm;
            c.angles.rightArm = idleRArm;
        } 
        else if (state === ANIMATION_STATES.WALK) {
            c.bobOffset = Math.abs(Math.sin(t * 0.5)) * 4; // Bob up and down
            c.torsoTilt = 0;

            // Walk Cycle
            const legAmp = 0.8;
            const armAmp = 0.6;
            const freq = 0.5; // Increased from 0.2 to reduce sliding look

            c.angles.leftLeg = Math.sin(t * freq) * legAmp;
            c.angles.rightLeg = Math.sin(t * freq + Math.PI) * legAmp;

            c.angles.leftArm = Math.sin(t * freq + Math.PI) * armAmp;
            c.angles.rightArm = Math.sin(t * freq) * armAmp;
        } 
        else if (state === ANIMATION_STATES.RUN) {
            c.bobOffset = Math.abs(Math.sin(t * 0.3)) * 6;
            c.torsoTilt = 0;

            // Run Cycle (More aggressive angles)
            const legAmp = 1.2;
            const armAmp = 0.9;

            c.angles.leftLeg = Math.sin(t * 0.3) * legAmp;
            c.angles.rightLeg = Math.sin(t * 0.3 + Math.PI) * legAmp;

            c.angles.leftArm = Math.sin(t * 0.3 + Math.PI) * armAmp;
            c.angles.rightArm = Math.sin(t * 0.3) * armAmp;
        } 
        else if (state === ANIMATION_STATES.BEND) {
            // Bend forward to pick something up, torso rotates from hips
            
            // Calculate cycle from stateTime (0 -> PI) based on c.speed
            // c.speed must be set to (PI / duration) by the controller
            const phase = c.stateTime * c.speed;
            
            // Clamp phase so we don't loop or bounce incorrectly if we overshoot duration
            // But allow it to hold the end pose if needed (though it goes back to 0)
            const clampedPhase = Math.max(0, Math.min(Math.PI, phase));
            
            const cycle = Math.sin(clampedPhase); // 0 -> 1 -> 0
            
            const maxTilt = 0.9; // radians, about 50 degrees forward
            
            // Interpolate from IDLE bob (idleBob) to 0 (at max bend)
            c.bobOffset = idleBob * (1 - cycle);

            c.torsoTilt = cycle * maxTilt;

            // Slight knee bend (Interpolate from 0 to target bend)
            const legBendBase = 0.3;
            // Use stateTime for oscillation to ensure it's smooth
            const legBendOsc = 0.1 * Math.sin(c.stateTime * 4); 
            const targetLegAngleL = legBendBase + legBendOsc;
            const targetLegAngleR = legBendBase - legBendOsc;
            
            c.angles.leftLeg = targetLegAngleL * cycle;
            c.angles.rightLeg = targetLegAngleR * cycle;

            // Arms reaching down toward the ground (Interpolate from IDLE arm swing to BEND arm swing)
            const reachBase = -0.6; // arms mostly down and forward relative to tilted torso
            const reachSwing = 0.2 * Math.sin(c.stateTime * 4 + Math.PI);
            const targetArmAngleL = reachBase + reachSwing;
            const targetArmAngleR = reachBase - reachSwing;
            
            c.angles.leftArm = idleLArm * (1 - cycle) + targetArmAngleL * cycle;
            c.angles.rightArm = idleRArm * (1 - cycle) + targetArmAngleR * cycle;
        } 
        else {
            // Fallback to idle-like behavior for unknown states
            c.bobOffset = 0;
            c.torsoTilt = 0;
        }
    }
}