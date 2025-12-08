import * as PIXI from 'pixi.js';
import { Character } from './Character.js';
import { MineralStructure } from './minerals/MineralStructure.js';
import { SandboxUI } from './UI.js';
import { ANIMATION_STATES, MINERAL_TYPES } from './constants.js';
import { CrowdManager } from './ai/CrowdManager.js';
import { Camera } from './Camera.js';
import { InputManager } from './controls/InputManager.js';

class GameApp {
    constructor() {
        this.characters = [];
        
        // Setup Pixi
        this.app = new PIXI.Application({
            resizeTo: window,
            backgroundColor: 0xdddddd,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true
        });
        document.body.appendChild(this.app.view);

        // World Container (Camera Target)
        this.worldContainer = new PIXI.Container();
        this.app.stage.addChild(this.worldContainer);

        // Containers (Layers)
        this.shadowLayer = new PIXI.Container();
        this.characterLayer = new PIXI.Container();
        
        // Z-Index sorting enabled
        this.characterLayer.sortableChildren = true;

        // Add layers to World instead of Stage
        this.worldContainer.addChild(this.shadowLayer);
        this.worldContainer.addChild(this.characterLayer);

        // AI System
        this.crowdManager = new CrowdManager(this.app);
        
        this.minerals = [];

        // Input / Controls System
        this.inputManager = new InputManager(window);

        // Sandbox Settings
        this.settings = {
            count: 0,
            useAI: false,
            animationState: ANIMATION_STATES.WALK,
            globalSpeed: 1.0,
            globalScale: 1.0,
            globalRotation: Math.PI / 2, // Default side view
        };

        // Initialize UI
        this.ui = new SandboxUI(this);

        // Camera System
        this.camera = new Camera(
            this.app, 
            this.worldContainer, 
            (x, y) => this.addCharacter(x, y), // On Tap Handler
            this.inputManager
        );

        // Initial Character
        this.addCharacter(window.innerWidth / 2, window.innerHeight / 2);

        // Initial Minerals
        for(let i=0; i<8; i++) {
            const mx = Math.random() * window.innerWidth;
            const my = Math.random() * window.innerHeight;
            const type = Math.random() > 0.4 ? MINERAL_TYPES.ROCK : MINERAL_TYPES.CRYSTAL;
            this.addMineral(mx, my, type);
        }
        
        // Game Loop
        this.app.ticker.add((delta) => this.update(delta));
    }

    addMineral(x, y, type) {
        const mineral = new MineralStructure(x, y, type);
        mineral.scale = this.settings.globalScale;
        
        this.minerals.push(mineral);
        this.characterLayer.addChild(mineral.container);
        this.shadowLayer.addChild(mineral.shadowG);
        
        // Set initial Z for sorting
        mineral.container.zIndex = mineral.groundY;
    }

    addCharacter(x, y) {
        // Clamp to screen bounds slightly (World Bounds)
        // Note: With camera, we treat the initial screen size as the "World Size"
        // characters are clamped to this area so they don't wander off into infinity.
        const padding = 50;
        const cx = Math.max(padding, Math.min(this.app.screen.width - padding, x));
        const cy = Math.max(padding, Math.min(this.app.screen.height - padding, y));

        const char = new Character(cx, cy);
        
        // Apply current settings
        char.scale = this.settings.globalScale;
        
        this.characters.push(char);
        this.crowdManager.register(char);

        this.characterLayer.addChild(char.graphics);
        this.shadowLayer.addChild(char.shadow);
        
        // Ensure initial zIndex exists so sortChildren can use it
        char.graphics.zIndex = char.groundY || char.y;

        this.settings.count = this.characters.length;
    }

    removeCharacters(amount) {
        for(let i=0; i<amount; i++) {
            if(this.characters.length === 0) break;
            const char = this.characters.pop();
            
            this.crowdManager.unregister(char);

            this.characterLayer.removeChild(char.graphics);
            this.shadowLayer.removeChild(char.shadow);
            char.destroy();
        }
        this.settings.count = this.characters.length;
    }

    clearAll() {
        this.removeCharacters(this.characters.length);
        
        // Clear minerals too
        this.minerals.forEach(m => {
            this.characterLayer.removeChild(m.container);
            this.shadowLayer.removeChild(m.shadowG);
            m.destroy();
        });
        this.minerals = [];
    }

    randomizeAllColors() {
        this.characters.forEach(char => {
            char.colors = char.getRandomPalette();
        });
    }

    update(delta) {
        // Convert ticker delta (frames) to seconds for consistent timing across systems
        const dtSeconds = delta / 60;

        // Update Camera
        this.camera.update(dtSeconds);

        // AI Update
        if (this.settings.useAI) {
            this.crowdManager.update(dtSeconds);
        }

        // Sort by Y for simple depth effect
        // We throttle sortChildren to every ~10 frames for perf.
        const shouldSort = Math.floor(this.app.ticker.lastTime / (1000 / 60)) % 10 === 0;

        // Update Minerals
        this.minerals.forEach(min => {
            // Apply global scale to minerals as well
            min.scale = this.settings.globalScale;
            min.update(dtSeconds);
            min.container.zIndex = min.groundY;
        });

        // Update Characters
        this.characters.forEach(char => {
            // Apply Global settings dynamically ONLY if AI is disabled
            // If AI is enabled, the AI Controller handles state/speed/facing logic
            
            if (!this.settings.useAI) {
                // Manual Override Mode
                char.facing = this.settings.globalRotation;
                char.state = this.settings.animationState;
                char.speed = 0.1 * this.settings.globalSpeed;
            } 
            
            char.scale = this.settings.globalScale;

            // Pass seconds to character update
            char.update(dtSeconds);

            // Use the renderer-computed groundY as zIndex
            char.graphics.zIndex = typeof char.groundY === 'number' ? char.groundY : char.y;
        });

        if (shouldSort) {
            this.characterLayer.sortChildren();
        }
    }
}

// Start app
new GameApp();