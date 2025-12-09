import * as PIXI from 'pixi.js';
import { Character } from './Character.js';
import { MineralStructure } from './minerals/MineralStructure.js';
import { ANIMATION_STATES, MINERAL_TYPES } from './constants.js';
import { CrowdManager } from './ai/CrowdManager.js';
import { Camera } from './Camera.js';
import { InputManager } from './controls/InputManager.js';
import { GameStateManager, GameState } from './GameStateManager.js';
import { MenuScreen } from './screens/MenuScreen.js';
import { LobbyScreen } from './screens/LobbyScreen.js';
import { GameScreen } from './screens/GameScreen.js';
import { InterstitialScreen } from './screens/InterstitialScreen.js';
import { EndScreen } from './screens/EndScreen.js';

class GameApp {
    constructor() {
        this.characters = [];
        this.minerals = [];
        
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

        // Input / Controls System
        this.inputManager = new InputManager(window);

        // Game State Manager
        this.stateManager = new GameStateManager(this.app);
        
        // Initialize Screens
        this.stateManager.registerScreen(GameState.MENU, new MenuScreen(this.stateManager));
        this.stateManager.registerScreen(GameState.LOBBY, new LobbyScreen(this.stateManager));
        this.stateManager.registerScreen(GameState.PLAYING, new GameScreen(this.stateManager));
        this.stateManager.registerScreen(GameState.INTERSTITIAL, new InterstitialScreen(this.stateManager));
        this.stateManager.registerScreen(GameState.END, new EndScreen(this.stateManager));

        // Camera System
        this.camera = new Camera(
            this.app, 
            this.worldContainer, 
            (x, y) => {}, // No tap handler for now
            this.inputManager
        );

        // Initialize game world (populate with random entities)
        this.initializeWorld();

        // Start at menu
        this.stateManager.setState(GameState.MENU);
        
        // Game Loop
        this.app.ticker.add((delta) => this.update(delta));
    }

    initializeWorld() {
        // Add random characters with AI enabled
        const numCharacters = 15;
        for (let i = 0; i < numCharacters; i++) {
            const x = Math.random() * window.innerWidth;
            const y = Math.random() * window.innerHeight;
            this.addCharacter(x, y);
        }

        // Add random minerals
        const numMinerals = 20;
        for (let i = 0; i < numMinerals; i++) {
            const x = Math.random() * window.innerWidth;
            const y = Math.random() * window.innerHeight;
            const type = Math.random() > 0.5 ? MINERAL_TYPES.ROCK : MINERAL_TYPES.CRYSTAL;
            this.addMineral(x, y, type);
        }
    }

    addMineral(x, y, type) {
        const mineral = new MineralStructure(x, y, type);
        
        this.minerals.push(mineral);
        this.characterLayer.addChild(mineral.container);
        this.shadowLayer.addChild(mineral.shadowG);
        
        mineral.container.zIndex = mineral.groundY;
    }

    addCharacter(x, y) {
        const padding = 50;
        const cx = Math.max(padding, Math.min(this.app.screen.width - padding, x));
        const cy = Math.max(padding, Math.min(this.app.screen.height - padding, y));

        const char = new Character(cx, cy);
        
        this.characters.push(char);
        this.crowdManager.register(char);

        this.characterLayer.addChild(char.graphics);
        this.shadowLayer.addChild(char.shadow);
        
        char.graphics.zIndex = char.groundY || char.y;
    }

    update(delta) {
        const dtSeconds = delta / 60;

        // Update Camera
        this.camera.update(dtSeconds);

        // AI Update (always enabled)
        this.crowdManager.update(dtSeconds);

        // Sort by Y for depth
        const shouldSort = Math.floor(this.app.ticker.lastTime / (1000 / 60)) % 10 === 0;

        // Update Minerals
        this.minerals.forEach(min => {
            min.update(dtSeconds);
            min.container.zIndex = min.groundY;
        });

        // Update Characters
        this.characters.forEach(char => {
            char.update(dtSeconds);
            char.graphics.zIndex = typeof char.groundY === 'number' ? char.groundY : char.y;
        });

        if (shouldSort) {
            this.characterLayer.sortChildren();
        }

        // Update active game screen if in PLAYING state
        if (this.stateManager.state === GameState.PLAYING && this.stateManager.activeScreen) {
            this.stateManager.activeScreen.updateTurnDisplay();
        }
    }
}

// Start app
new GameApp();