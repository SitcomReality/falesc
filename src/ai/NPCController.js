import { ANIMATION_STATES } from '../constants.js';

// Tweakable NPC parameters (editable via host UI when available)
export const NPC_PARAMS = {
    brainSpeed: 1.0,               // How quickly the NPC decision timer scales (higher = faster decisions)
    idleDurationMin: 5,         // Idle state minimum duration (seconds)
    idleDurationMax: 15,         // Idle state maximum duration (seconds)
    bendDurationMin: 2,         // Bend/inspect state minimum duration (seconds)
    bendDurationMax: 8,         // Bend/inspect state maximum duration (seconds)
    wanderDurationMin: 5,       // Wander state minimum duration (seconds)
    wanderDurationMax: 25,      // Wander state maximum duration (seconds)
    runChance: 0.30,              // Chance to run when starting a wander (0..1)
    walkSpeed: 20,               // Movement speed multiplier when walking
    runSpeed: 40,                // Movement speed multiplier when running
    calmFactor: 2,              // Dampening applied to animation speed to make motion calmer
    decisionNoise: 0.15,          // Random noise added to timers (fraction)
    boundaryPadding: 50,          // Padding from screen edge before bouncing
    movementEnabled: true         // Master toggle — if false, NPCs won't move
};

export class NPCController {
    constructor(character, screenBounds) {
        this.character = character;
        this.bounds = screenBounds;
        
        this.timer = 0;
        this.state = 'IDLE'; 
        
        // Initial random state, scaled by brainSpeed
        this.decideNextAction();
    }

    update(dt) {
        // Scale time by brainSpeed so host UI can speed up or slow down decision pacing
        const scaledDt = dt * NPC_PARAMS.brainSpeed;
        this.timer -= scaledDt;
        
        // State transition check
        if (this.timer <= 0) {
            this.decideNextAction();
        }

        // Behavior Logic
        if (this.state === 'WANDER' && NPC_PARAMS.movementEnabled) {
            this.move(dt);
        }
    }

    decideNextAction() {
        // Add a bit of noise so NPCs don't all sync perfectly
        const roll = Math.random();
        if (roll < 0.25) {
            // Idle for a bit (longer, calmer)
            const dur = NPC_PARAMS.idleDurationMin + Math.random() * (NPC_PARAMS.idleDurationMax - NPC_PARAMS.idleDurationMin);
            this.changeState('IDLE', dur * (1 + (Math.random() - 0.5) * NPC_PARAMS.decisionNoise));
        } else if (roll < 0.40) {
            // Inspect ground (bend)
            const dur = NPC_PARAMS.bendDurationMin + Math.random() * (NPC_PARAMS.bendDurationMax - NPC_PARAMS.bendDurationMin);
            this.changeState('BEND', dur * (1 + (Math.random() - 0.5) * NPC_PARAMS.decisionNoise));
        } else {
            // Wander somewhere
            const dur = NPC_PARAMS.wanderDurationMin + Math.random() * (NPC_PARAMS.wanderDurationMax - NPC_PARAMS.wanderDurationMin);
            this.changeState('WANDER', dur * (1 + (Math.random() - 0.5) * NPC_PARAMS.decisionNoise));
        }
    }

    changeState(newState, duration) {
        this.state = newState;
        this.timer = duration;
        
        const c = this.character;

        if (newState === 'IDLE') {
            c.state = ANIMATION_STATES.IDLE;
            // Slower, gentler idle animation
            c.speed = 0.07 * NPC_PARAMS.calmFactor;
        } else if (newState === 'BEND') {
            c.state = ANIMATION_STATES.BEND;
            // Slightly slower bend animation
            c.speed = 0.07 * NPC_PARAMS.calmFactor; 
        } else if (newState === 'WANDER') {
            // Use configured run chance
            const run = Math.random() < NPC_PARAMS.runChance;
            c.state = run ? ANIMATION_STATES.RUN : ANIMATION_STATES.WALK;
            // Map to configured speeds
            c.speed = run ? NPC_PARAMS.runSpeed * 0.1 : NPC_PARAMS.walkSpeed * 0.1; 
            
            // Pick a random direction
            c.facing = Math.random() * Math.PI * 2;
        }
    }

    move(dt) {
        const c = this.character;
        
        // Determine movement speed based on animation state using configured values
        const baseSpeed = c.state === ANIMATION_STATES.RUN ? NPC_PARAMS.runSpeed : NPC_PARAMS.walkSpeed; 
        
        // Move (scale by dt to be framerate independent)
        c.x += Math.cos(c.facing) * baseSpeed * dt;
        c.y += Math.sin(c.facing) * baseSpeed * dt;

        // Bounds Checking (Bounce)
        const pad = NPC_PARAMS.boundaryPadding;
        let bounced = false;

        if (c.x < pad) {
            c.x = pad;
            c.facing = Math.PI - c.facing;
            bounced = true;
        } else if (c.x > this.bounds.width - pad) {
            c.x = this.bounds.width - pad;
            c.facing = Math.PI - c.facing;
            bounced = true;
        }

        if (c.y < pad) {
            c.y = pad;
            c.facing = -c.facing;
            bounced = true;
        } else if (c.y > this.bounds.height - pad) {
            c.y = this.bounds.height - pad;
            c.facing = -c.facing;
            bounced = true;
        }

        if (bounced) {
             // Normalize angle 0-2PI
             c.facing = (c.facing + Math.PI * 2) % (Math.PI * 2);
        }
    }
}