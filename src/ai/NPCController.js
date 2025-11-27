import { ANIMATION_STATES } from '../constants.js';

export class NPCController {
    constructor(character, screenBounds) {
        this.character = character;
        this.bounds = screenBounds;
        
        this.timer = 0;
        this.state = 'IDLE'; 
        
        // Initial random state
        this.decideNextAction();
    }

    update(dt) {
        this.timer -= dt;
        
        // State transition check
        if (this.timer <= 0) {
            this.decideNextAction();
        }

        // Behavior Logic
        if (this.state === 'WANDER') {
            this.move(dt);
        }
    }

    decideNextAction() {
        const roll = Math.random();
        
        if (roll < 0.25) {
            // Idle for a bit
            this.changeState('IDLE', 1.5 + Math.random() * 2.0);
        } else if (roll < 0.40) {
            // Inspect ground
            this.changeState('BEND', 1.0 + Math.random() * 1.5);
        } else {
            // Wander somewhere
            this.changeState('WANDER', 2.0 + Math.random() * 4.0);
        }
    }

    changeState(newState, duration) {
        this.state = newState;
        this.timer = duration;
        
        const c = this.character;

        if (newState === 'IDLE') {
            c.state = ANIMATION_STATES.IDLE;
            c.speed = 0.1; // Slow animation speed for breathing
        } else if (newState === 'BEND') {
            c.state = ANIMATION_STATES.BEND;
            c.speed = 0.1; 
        } else if (newState === 'WANDER') {
            // 30% chance to Run, 70% walk
            const run = Math.random() > 0.7;
            c.state = run ? ANIMATION_STATES.RUN : ANIMATION_STATES.WALK;
            // Set Animation Speed
            c.speed = run ? 0.25 : 0.15; 
            
            // Pick a random direction
            c.facing = Math.random() * Math.PI * 2;
        }
    }

    move(dt) {
        const c = this.character;
        
        // Determine movement speed based on animation state
        // Base pixels per frame (approx)
        const baseSpeed = c.state === ANIMATION_STATES.RUN ? 5 : 2; 
        
        // Move
        c.x += Math.cos(c.facing) * baseSpeed;
        c.y += Math.sin(c.facing) * baseSpeed;

        // Bounds Checking (Bounce)
        const pad = 50;
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