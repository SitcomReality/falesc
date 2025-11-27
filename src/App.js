import * as PIXI from 'pixi.js';
import { Character } from './Character.js';
import { SandboxUI } from './UI.js';
import { ANIMATION_STATES } from './constants.js';

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

        // Containers (Layers)
        this.shadowLayer = new PIXI.Container();
        this.characterLayer = new PIXI.Container();
        
        // Z-Index sorting enabled
        this.characterLayer.sortableChildren = true;

        this.app.stage.addChild(this.shadowLayer);
        this.app.stage.addChild(this.characterLayer);

        // Sandbox Settings
        this.settings = {
            count: 0,
            animationState: ANIMATION_STATES.WALK,
            globalSpeed: 1.0,
            globalScale: 1.0,
        };

        // Initialize UI
        this.ui = new SandboxUI(this);

        // Initial Character
        this.addCharacter(window.innerWidth / 2, window.innerHeight / 2);

        // Event Listeners
        this.app.view.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        
        // Game Loop
        this.app.ticker.add((delta) => this.update(delta));
    }

    addCharacter(x, y) {
        // Clamp to screen bounds slightly
        const padding = 50;
        const cx = Math.max(padding, Math.min(this.app.screen.width - padding, x));
        const cy = Math.max(padding, Math.min(this.app.screen.height - padding, y));

        const char = new Character(cx, cy);
        
        // Apply current settings
        char.scale = this.settings.globalScale;
        
        this.characters.push(char);
        this.characterLayer.addChild(char.graphics);
        this.shadowLayer.addChild(char.shadow);
        
        this.settings.count = this.characters.length;
    }

    removeCharacters(amount) {
        for(let i=0; i<amount; i++) {
            if(this.characters.length === 0) break;
            const char = this.characters.pop();
            this.characterLayer.removeChild(char.graphics);
            this.shadowLayer.removeChild(char.shadow);
            char.destroy();
        }
        this.settings.count = this.characters.length;
    }

    clearAll() {
        this.removeCharacters(this.characters.length);
    }

    randomizeAllColors() {
        this.characters.forEach(char => {
            char.colors = char.getRandomPalette();
        });
    }

    onPointerDown(e) {
        // Only add if not interacting with UI (simplified check)
        // If clicking on canvas, add a character
        this.addCharacter(e.clientX, e.clientY);
    }

    update(delta) {
        // Ticker delta is in frames (1 = 60fps). 
        
        // Sort by Y for simple depth effect
        // Only sort every 10 frames to save perf if we have many characters
        if (this.app.ticker.lastTime % 10 === 0) {
            this.characterLayer.children.sort((a, b) => a.y - b.y);
        }

        this.characters.forEach(char => {
            // Apply Global settings dynamically
            char.scale = this.settings.globalScale;
            char.update(delta, this.settings.globalSpeed, this.settings.animationState);
        });
    }
}

// Start app
new GameApp();