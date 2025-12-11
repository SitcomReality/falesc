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
import { MapGenerator } from './map/MapGenerator.js';
import { SeededRandom } from './map/SeededRandom.js';
import { BuildingManager } from './buildings/BuildingManager.js';
import { BuildModal } from './ui/BuildModal.js';

class GameApp {
    constructor() {
        this.characters = [];
        this.minerals = [];
        this.map = null;
        
        // Setup Pixi
        this.app = new PIXI.Application({
            resizeTo: window,
            backgroundColor: 0x1a1a2e, // Dark Space Blue
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true
        });
        document.body.appendChild(this.app.view);

        // World Container (Camera Target)
        this.worldContainer = new PIXI.Container();
        this.app.stage.addChild(this.worldContainer);

        // Containers (Layers)
        this.mapLayer = new PIXI.Container();
        this.shadowLayer = new PIXI.Container();
        this.characterLayer = new PIXI.Container();
        
        // Z-Index sorting enabled
        this.characterLayer.sortableChildren = true;

        // Add layers to World instead of Stage
        this.worldContainer.addChild(this.mapLayer);
        this.worldContainer.addChild(this.shadowLayer);
        this.worldContainer.addChild(this.characterLayer);

        // AI System
        this.crowdManager = new CrowdManager(this.app);

        // Input / Controls System
        this.inputManager = new InputManager(window);
        
        // Building System
        // Initialize AFTER characterLayer is created
        this.buildingManager = new BuildingManager(this.app, null, this.characterLayer);
        
        // UI
        this.pendingBuildLocation = null;
        this.buildModal = new BuildModal(
            (name) => this.finalizeBuild(name),
            () => { this.pendingBuildLocation = null; }
        );

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
            (x, y) => this.onWorldTap(x, y),
            this.inputManager
        );
        
        // Define world parameters based on minimum zoom (1/0.2 = 5). This is the full map size.
        this.WORLD_SCALE_FACTOR = 5;
        this.MAP_WIDTH = this.app.screen.width * this.WORLD_SCALE_FACTOR;
        this.MAP_HEIGHT = this.app.screen.height * this.WORLD_SCALE_FACTOR;

        // Initialize Camera position to the center of the large map
        this.camera.position.x = this.MAP_WIDTH / 2;
        this.camera.position.y = this.MAP_HEIGHT / 2;
        this.camera.updateTransform();

        // Listen for game start to generate world
        const originalStartGame = this.stateManager.startGame.bind(this.stateManager);
        this.stateManager.startGame = () => {
            this.initializeWorld();
            originalStartGame();
        };
        
        // Hook into turn processing
        const originalEndTurn = this.stateManager.endTurn.bind(this.stateManager);
        this.stateManager.endTurn = () => {
            originalEndTurn();
            // Process buildings during turn transition
            setTimeout(() => {
                this.buildingManager.processTurn();
            }, 1000);
        };

        // Start at menu
        this.stateManager.setState(GameState.MENU);
        
        // Game Loop
        this.app.ticker.add((delta) => this.update(delta));
    }
    
    finalizeBuild(name) {
        if (this.pendingBuildLocation) {
            const { sectorId, u, v } = this.pendingBuildLocation;
            this.buildingManager.createBuilding(sectorId, u, v, name);
            this.stateManager.actionsRemaining--;
            if (this.stateManager.activeScreen && this.stateManager.activeScreen.updateTurnDisplay) {
                this.stateManager.activeScreen.updateTurnDisplay();
            }
        }
        this.pendingBuildLocation = null;
    }
    
    onWorldTap(x, y) {
        if (this.stateManager.state !== GameState.PLAYING) return;
        if (this.stateManager.actionsRemaining <= 0) return;

        // Check against sectors
        if (!this.map) return;
        
        for (const sector of this.map.sectors) {
            const cell = sector.getGridCell(x, y);
            // Check if within grid bounds (integer check)
            if (cell.u >= 0 && cell.u < sector.gridSize &&
                cell.v >= 0 && cell.v < sector.gridSize) {
                
                // Check if cell is free
                if (!this.buildingManager.isCellOccupied(sector.id, cell.u, cell.v)) {
                    this.pendingBuildLocation = {
                        sectorId: sector.id,
                        u: cell.u,
                        v: cell.v
                    };
                    this.buildModal.show();
                    return;
                }
            }
        }
    }

    initializeWorld() {
        // Clear existing world
        this.clearWorld();
        
        // Update crowd manager bounds before spawning characters
        this.crowdManager.setWorldBounds(this.MAP_WIDTH, this.MAP_HEIGHT);

        // Generate map
        this.map = new MapGenerator(
            this.stateManager.settings.mapSeed,
            this.stateManager.settings.mapSize,
            this.MAP_WIDTH,
            this.MAP_HEIGHT
        );
        
        this.buildingManager.setMap(this.map);
        
        // Add map graphics to layer
        
        // Then sectors
        this.map.sectors.forEach(sector => {
            this.mapLayer.addChild(sector.graphics);
        });
        
        // Create seeded RNG for deterministic entity placement
        const entityRNG = new SeededRandom(this.stateManager.settings.mapSeed + 1);
        
        // Add characters on map
        const numCharacters = 15;
        for (let i = 0; i < numCharacters; i++) {
            const point = this.map.getRandomPointOnMap();
            this.addCharacter(point.x, point.y);
        }

        // Add minerals deterministically on map
        const mineralCounts = {
            small: 30,
            medium: 50,
            large: 70
        };
        
        const numMinerals = mineralCounts[this.stateManager.settings.mapSize] || 50;
        
        for (let i = 0; i < numMinerals; i++) {
            const point = this.map.getRandomMineralPoint();
            const type = entityRNG.next() > 0.5 ? MINERAL_TYPES.ROCK : MINERAL_TYPES.CRYSTAL;
            
            // Find which palette to use deterministically
            const paletteIds = type === MINERAL_TYPES.ROCK 
                ? ['ROCK_GREY', 'ROCK_BROWN']
                : ['CRYSTAL_BLUE', 'CRYSTAL_PURPLE', 'CRYSTAL_GREEN'];
            const paletteId = paletteIds[entityRNG.nextInt(0, paletteIds.length - 1)];
            
            this.addMineral(point.x, point.y, type, paletteId);
        }
    }

    clearWorld() {
        // Clear characters
        this.characters.forEach(char => char.destroy());
        this.characters = [];
        this.crowdManager.clear();
        
        // Clear minerals
        this.minerals.forEach(min => min.destroy());
        this.minerals = [];
        
        // Clear buildings
        this.buildingManager.clear();
        
        // Clear map
        if (this.map) {
            this.map.destroy();
            this.map = null;
        }
        
        // Clear layers
        this.mapLayer.removeChildren();
        this.characterLayer.removeChildren();
        this.shadowLayer.removeChildren();
    }

    addMineral(x, y, type, paletteId) {
        const mineral = new MineralStructure(x, y, type, paletteId);
        
        this.minerals.push(mineral);
        this.characterLayer.addChild(mineral.container);
        this.shadowLayer.addChild(mineral.shadowG);
        
        mineral.container.zIndex = mineral.groundY;
    }

    addCharacter(x, y) {
        // const padding = 50;
        // const cx = Math.max(padding, Math.min(this.app.screen.width - padding, x));
        // const cy = Math.max(padding, Math.min(this.app.screen.height - padding, y));

        const char = new Character(x, y);
        
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