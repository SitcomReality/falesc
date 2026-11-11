import * as PIXI from 'pixi.js';
import { Character } from './Character.js';
import { MineralStructure } from './minerals/MineralStructure.js';
import { MINERAL_TYPES } from './constants.js';
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
import { BuildingRenderer } from './buildings/BuildingRenderer.js';
import { drawSettlementPaths } from './map/SettlementPaths.js';
import { ChatterManager } from './ui/ChatterManager.js';
import { BLUEPRINT_BY_ID, BEACON_ID, DEFAULT_BLUEPRINT_ID, AFFINITY_RANGE, effectiveCost } from './buildings/blueprints.js';
import { BuildModal } from './ui/BuildModal.js';
import { StructureModal } from './ui/StructureModal.js';
import { Minimap } from './ui/Minimap.js';
import { SaveManager } from './persistence/SaveManager.js';

class GameApp {
    constructor() {
        this.characters = [];
        this.minerals = [];
        this.map = null;
        this.frameCount = 0;
        this.tideMood = -1;

        // Setup Pixi. The canvas is transparent: the illustrated Glass Sea
        // backdrop lives in the DOM behind it.
        this.app = new PIXI.Application({
            resizeTo: window,
            backgroundColor: 0x1c0d24,
            backgroundAlpha: 0,
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
        this.pathLayer = new PIXI.Container();
        this.pathG = new PIXI.Graphics();
        this.pathLayer.addChild(this.pathG);
        this.shadowLayer = new PIXI.Container();
        this.interactionLayer = new PIXI.Container();
        this.characterLayer = new PIXI.Container();
        this.overlayLayer = new PIXI.Container();

        // Z-Index sorting enabled
        this.characterLayer.sortableChildren = true;

        // A single-cell hover marker and a ghost of the armed structure.
        this.hoverG = new PIXI.Graphics();
        this.hoverGhostG = new PIXI.Graphics();
        this.hoverGhost = new PIXI.Container();
        this.hoverGhost.addChild(this.hoverGhostG);
        this.hoverGhost.visible = false;
        this.hoverCellKey = null;
        this.interactionLayer.addChild(this.hoverG, this.hoverGhost);

        this.worldContainer.addChild(this.mapLayer);
        this.worldContainer.addChild(this.pathLayer);
        this.worldContainer.addChild(this.shadowLayer);
        this.worldContainer.addChild(this.interactionLayer);
        this.worldContainer.addChild(this.characterLayer);
        this.worldContainer.addChild(this.overlayLayer);

        // AI System
        this.crowdManager = new CrowdManager(this.app);
        this.crowdManager.setGame(this);

        // Input / Controls System
        this.inputManager = new InputManager(window);

        // Building System
        this.buildingManager = new BuildingManager(this.app, null, this.characterLayer);

        // UI
        this.pendingBuildLocation = null;
        this.pendingBuildBonus = 0;
        this.buildModal = new BuildModal({
            onBuild: (name) => this.finalizeBuild(name),
            onCancel: () => {
                this.pendingBuildLocation = null;
                this.pendingBuildBonus = 0;
            },
            inputManager: this.inputManager
        });
        this.structureModal = new StructureModal({
            onDemolish: (building) => this.demolishBuilding(building),
            inputManager: this.inputManager
        });

        // Game State Manager
        this.stateManager = new GameStateManager(this.app);
        this.saveManager = new SaveManager();

        // Initialize Screens
        this.stateManager.registerScreen(GameState.MENU, new MenuScreen(this.stateManager, this));
        this.stateManager.registerScreen(GameState.LOBBY, new LobbyScreen(this.stateManager));
        this.stateManager.registerScreen(GameState.PLAYING, new GameScreen(this.stateManager, this));
        this.stateManager.registerScreen(GameState.INTERSTITIAL, new InterstitialScreen(this.stateManager));
        this.stateManager.registerScreen(GameState.END, new EndScreen(this.stateManager, this));

        // Leaving active play must close the build prompt; otherwise it can sit
        // on top of the interstitial/end screen and accept a stale build.
        const originalSetState = this.stateManager.setState.bind(this.stateManager);
        this.stateManager.setState = (newState) => {
            if (newState !== GameState.PLAYING) {
                this.buildModal.hide();
                this.structureModal.hide();
                this.clearHover();
            }
            if (newState === GameState.MENU || newState === GameState.LOBBY || newState === GameState.END) {
                this.stateManager.cancelPendingTurn();
            }
            if (newState === GameState.END) this.saveManager.clear();
            originalSetState(newState);
        };

        // The state manager owns turn timing; App supplies the settlement
        // simulation step and the victory/defeat check.
        this.stateManager.onTideResolve = () => this.resolveTide();
        this.stateManager.onTideStart = () => this.previewTide();
        this.stateManager.onStateSettled = () => {
            this.saveGame();
            const summary = this.stateManager.lastTideSummary;
            if (summary && this.stateManager.state === GameState.PLAYING) {
                const message = summary.income > 0
                    ? `Tide ${this.stateManager.currentTurn}: +${summary.income} lumen`
                    : summary.message || `Tide ${this.stateManager.currentTurn} begins`;
                this.stateManager.activeScreen?.toast?.(message, summary.income > 0 ? 'sun' : 'mint');
            }
        };

        // Camera System
        this.camera = new Camera(
            this.app,
            this.worldContainer,
            (x, y) => this.onWorldTap(x, y),
            this.inputManager,
            (x, y) => this.onWorldHover(x, y)
        );

        // Minimap (2D canvas overlay)
        this.minimap = new Minimap(this);

        // Ambient speech bubbles live above the world but below DOM chrome.
        this.chatter = new ChatterManager(this.overlayLayer, this);

        // Keep the camera centred on the same world point when the window resizes.
        this.app.renderer.on('resize', () => {
            this.camera.updateTransform();
            this.camera.clampToWorld?.();
        });

        // Define world parameters based on minimum zoom (1/0.2 = 5). This is the
        // initial map size; MapGenerator may replace these with tighter bounds.
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
            this.saveManager.clear();
            this.initializeWorld();
            originalStartGame();
            this.saveGame();
        };

        window.addEventListener('beforeunload', () => this.saveGame());

        // Start at menu
        this.stateManager.setState(GameState.MENU);

        // Debug surface for browser smoke tests and manual console poking.
        this.exposeDebugApi();

        // Game Loop
        this.app.ticker.add((delta) => this.update(delta));
    }

    exposeDebugApi() {
        const game = this;
        window.__falesc = {
            app: game,
            get ready() {
                return window.__APP_READY__ === true;
            },
            snapshot() {
                const buildings = game.buildingManager.buildings;
                return {
                    ready: window.__APP_READY__ === true,
                    frame: game.frameCount,
                    state: game.stateManager.state,
                    turn: game.stateManager.currentTurn,
                    day: game.stateManager.currentTurn,
                    dayLimit: game.stateManager.dayLimit,
                    actionsRemaining: game.stateManager.actionsRemaining,
                    lumen: game.stateManager.lumen,
                    income: buildings
                        .filter((building) => building.state === 'ACTIVE')
                        .reduce((total, building) => total + (building.income ?? (BLUEPRINT_BY_ID[building.blueprintId]?.income || 0)), 0),
                    selectedBlueprint: game.stateManager.selectedBlueprint,
                    seed: game.stateManager.settings.mapSeed,
                    mapSize: game.stateManager.settings.mapSize,
                    characters: game.characters.length,
                    minerals: game.minerals.length,
                    buildings: buildings.length,
                    buildingStates: buildings.map((building) => building.state),
                    buildingBlueprints: buildings.map((building) => building.blueprintId),
                    sectors: game.map ? game.map.sectors.length : 0,
                    buildModalOpen: game.buildModal.isOpen,
                    endResult: game.stateManager.endResult,
                    camera: {
                        x: game.camera.position.x,
                        y: game.camera.position.y,
                        zoom: game.camera.zoom
                    }
                };
            },
            /** First grid cell that has no building, plus its world position. */
            findFreeCell() {
                if (!game.map) return null;
                for (const sector of game.map.sectors) {
                    for (let v = 0; v < sector.gridSize; v++) {
                        for (let u = 0; u < sector.gridSize; u++) {
                            if (!game.buildingManager.isCellOccupied(sector.id, u, v)) {
                                const pos = sector._project(u + 0.5, v + 0.5);
                                return { sectorId: sector.id, u, v, x: pos.x, y: pos.y };
                            }
                        }
                    }
                }
                return null;
            },
            /** Convert a world position to CSS pixel coordinates on the canvas. */
            worldToScreen(x, y) {
                const cx = game.app.screen.width / 2;
                const cy = game.app.screen.height / 2;
                return {
                    x: cx + (x - game.camera.position.x) * game.camera.zoom,
                    y: cy + (y - game.camera.position.y) * game.camera.zoom
                };
            },
            selectBlueprint(id) {
                return game.selectBlueprint(id);
            },
            saveGame() {
                return game.saveGame();
            },
            continueGame() {
                return game.continueGame();
            }
        };
    }

    saveGame() {
        if (!this.map) return false;
        if (this.stateManager.state !== GameState.PLAYING) return false;
        const camera = this.camera;
        return this.saveManager.write({
            settings: {
                mapSeed: this.stateManager.settings.mapSeed,
                mapSize: this.stateManager.settings.mapSize
            },
            turn: this.stateManager.currentTurn,
            dayLimit: this.stateManager.dayLimit,
            actionsRemaining: this.stateManager.actionsRemaining,
            lumen: this.stateManager.lumen,
            selectedBlueprint: this.stateManager.selectedBlueprint,
            hintDismissed: this.stateManager.hintDismissed,
            buildings: this.buildingManager.buildings.map((building) => ({
                sectorId: building.sectorId,
                u: building.u,
                v: building.v,
                name: building.name,
                blueprintId: building.blueprintId,
                bonusIncome: building.bonusIncome || 0,
                state: building.state
            })),
            camera: {
                x: camera.position.x,
                y: camera.position.y,
                zoom: camera.zoom
            }
        });
    }

    continueGame() {
        const save = this.saveManager.read();
        if (!save) return false;

        this.stateManager.settings.mapSeed = save.settings.mapSeed;
        this.stateManager.settings.mapSize = save.settings.mapSize;
        this.initializeWorld();
        this.buildingManager.restore(save.buildings || []);
        this.rebuildPaths();
        this.stateManager.restoreRun(save);

        if (this.map) {
            this.camera.setBounds(this.map.bounds);
            if (save.camera && Number.isFinite(save.camera.x) && Number.isFinite(save.camera.y)) {
                this.camera.position.x = save.camera.x;
                this.camera.position.y = save.camera.y;
                this.camera.zoom = Math.max(this.camera.minZoom, Math.min(this.camera.maxZoom, save.camera.zoom || 0.5));
            }
            this.camera.updateTransform();
        }
        this.stateManager.activeScreen?.updateTurnDisplay?.(true);
        this.saveGame();
        return true;
    }

    /** How many crystals are within reach of a plot, for harvest blueprints. */
    crystalAffinity(x, y, blueprint) {
        if (!blueprint?.affinityBonus) return 0;
        for (const mineral of this.minerals) {
            if (mineral.type !== 'CRYSTAL') continue;
            if (Math.hypot(mineral.x - x, mineral.y - y) <= AFFINITY_RANGE) {
                return blueprint.affinityBonus;
            }
        }
        return 0;
    }

    selectBlueprint(id) {
        if (!BLUEPRINT_BY_ID[id]) return false;
        const state = this.stateManager;
        if (state.state !== GameState.PLAYING || state.actionsRemaining <= 0) return false;

        const blueprint = BLUEPRINT_BY_ID[id];
        const buildings = this.buildingManager.buildings;
        if (blueprint.unique && buildings.some((building) => building.blueprintId === id)) return false;
        if (effectiveCost(blueprint, buildings) > state.lumen) return false;

        state.selectedBlueprint = id;
        this.hoverCellKey = null;
        this.stateManager.activeScreen?.updateTurnDisplay?.(true);
        return true;
    }

    /** Remove the hover highlight and ghost preview. */
    rebuildPaths() {
        if (!this.map) {
            this.pathG.clear();
            return;
        }
        drawSettlementPaths(this.pathG, this.map, this.buildingManager.buildings);
    }

    clearHover() {
        if (!this.hoverG) return;
        this.hoverG.clear();
        this.hoverGhostG.clear();
        this.hoverGhost.visible = false;
        this.hoverCellKey = null;
    }

    /**
     * Draw a single-cell highlight under the mouse. Valid plots are mint;
     * occupied or unaffordable plots are coral. The armed blueprint is shown as
     * a translucent ghost so placement is not a blind click.
     */
    onWorldHover(point) {
        if (!point || this.stateManager.state !== GameState.PLAYING || !this.map) {
            this.clearHover();
            return;
        }
        if (this.buildModal.isOpen || this.stateManager.actionsRemaining <= 0) {
            this.clearHover();
            return;
        }

        const blueprintId = this.stateManager.selectedBlueprint || DEFAULT_BLUEPRINT_ID;
        const blueprint = BLUEPRINT_BY_ID[blueprintId];
        if (!blueprint) {
            this.clearHover();
            return;
        }

        let target = null;
        for (const sector of this.map.sectors) {
            const cell = sector.getGridCell(point.x, point.y);
            if (cell.u >= 0 && cell.u < sector.gridSize && cell.v >= 0 && cell.v < sector.gridSize) {
                target = { sector, u: Math.floor(cell.u), v: Math.floor(cell.v) };
                break;
            }
        }

        if (!target) {
            this.clearHover();
            return;
        }

        const occupied = this.buildingManager.isCellOccupied(target.sector.id, target.u, target.v);
        const uniqueBlocked = blueprint.unique && this.buildingManager.buildings.some((building) => building.blueprintId === blueprintId);
        const affordable = effectiveCost(blueprint, this.buildingManager.buildings) <= this.stateManager.lumen;
        const valid = !occupied && !uniqueBlocked && affordable;
        const key = `${target.sector.id}:${target.u}:${target.v}:${blueprintId}:${valid}`;
        if (key === this.hoverCellKey) return;
        this.hoverCellKey = key;

        const { sector, u, v } = target;
        const corners = [
            sector._project(u, v),
            sector._project(u + 1, v),
            sector._project(u + 1, v + 1),
            sector._project(u, v + 1)
        ];
        const ink = 0x211225;
        this.hoverG.clear();
        this.hoverG.beginFill(valid ? 0x59e3c2 : 0xff6b5e, valid ? 0.22 : 0.16);
        this.hoverG.lineStyle(3, ink, 0.9);
        this.hoverG.moveTo(corners[0].x, corners[0].y);
        for (let i = 1; i < corners.length; i++) this.hoverG.lineTo(corners[i].x, corners[i].y);
        this.hoverG.closePath();
        this.hoverG.endFill();

        this.hoverGhostG.clear();
        if (valid) {
            const pos = sector._project(u + 0.5, v + 0.5);
            this.hoverGhost.position.set(pos.x, pos.y);
            BuildingRenderer.draw(this.hoverGhostG, { blueprintId, state: 'PENDING' });
            this.hoverGhost.alpha = 0.3;
            this.hoverGhost.visible = true;
        } else {
            this.hoverGhost.visible = false;
        }
    }

    finalizeBuild(name) {
        const state = this.stateManager;
        if (!this.pendingBuildLocation) {
            return { ok: false, error: 'Choose a free plot first.' };
        }
        if (state.state !== GameState.PLAYING) {
            return { ok: false, error: 'The tide has already turned.' };
        }
        if (state.actionsRemaining <= 0) {
            return { ok: false, error: 'No builds left this tide.' };
        }

        const blueprintId = state.selectedBlueprint || DEFAULT_BLUEPRINT_ID;
        const blueprint = BLUEPRINT_BY_ID[blueprintId];
        if (!blueprint) return { ok: false, error: 'Unknown blueprint.' };

        const buildings = this.buildingManager.buildings;
        if (blueprint.unique && buildings.some((building) => building.blueprintId === blueprintId)) {
            return { ok: false, error: 'The Beacon is already standing.' };
        }

        const cost = effectiveCost(blueprint, buildings);
        if (cost > state.lumen) {
            return { ok: false, error: `Need ${cost - state.lumen} more lumen.` };
        }

        const { sectorId, u, v } = this.pendingBuildLocation;
        const bonus = this.pendingBuildBonus || 0;
        const building = this.buildingManager.createBuilding(sectorId, u, v, name, blueprintId, bonus);
        if (!building) {
            return { ok: false, error: 'That plot cannot be built on.' };
        }

        state.spendLumen(cost);
        state.actionsRemaining -= 1;
        state.hintDismissed = true;
        this.pendingBuildLocation = null;
        this.pendingBuildBonus = 0;
        this.clearHover();
        // Keep the same blueprint armed for the next tide, but refresh the HUD
        // immediately so the cost, action count and affordability are correct.
        this.rebuildPaths();
        this.stateManager.activeScreen?.updateTurnDisplay?.(true);
        const affinityCopy = bonus > 0 ? ' Crystal affinity +1.' : '';
        this.stateManager.activeScreen?.toast?.(`${building.name} reserved — ${blueprint.name} takes 2 tides to work.${affinityCopy}`, 'mint');
        this.saveGame();
        return { ok: true };
    }

    onWorldTap(x, y) {
        const state = this.stateManager;
        if (state.state !== GameState.PLAYING) return;
        if (this.buildModal.isOpen || this.structureModal.isOpen) return;
        if (!this.map) return;

        const buildings = this.buildingManager.buildings;

        for (const sector of this.map.sectors) {
            const cell = sector.getGridCell(x, y);
            if (cell.u < 0 || cell.u >= sector.gridSize || cell.v < 0 || cell.v >= sector.gridSize) continue;

            const iu = Math.floor(cell.u);
            const iv = Math.floor(cell.v);
            const existing = buildings.find(
                (building) => building.sectorId === sector.id && building.u === iu && building.v === iv
            );

            if (existing) {
                this.clearHover();
                const refund = this.demolitionRefund(existing);
                this.structureModal.show(existing, refund);
                return;
            }

            if (state.actionsRemaining <= 0) return;
            const blueprintId = state.selectedBlueprint || DEFAULT_BLUEPRINT_ID;
            const blueprint = BLUEPRINT_BY_ID[blueprintId];
            if (!blueprint) return;
            if (blueprint.unique && buildings.some((building) => building.blueprintId === blueprintId)) return;
            if (effectiveCost(blueprint, buildings) > state.lumen) return;

            this.pendingBuildLocation = { sectorId: sector.id, u: iu, v: iv };
            const pos = sector._project(iu + 0.5, iv + 0.5);
            this.pendingBuildBonus = this.crystalAffinity(pos.x, pos.y, blueprint);
            this.clearHover();
            this.buildModal.show(blueprint, state.lumen, buildings, this.pendingBuildBonus);
            return;
        }
    }

    demolitionRefund(building) {
        const blueprint = BLUEPRINT_BY_ID[building.blueprintId];
        if (!blueprint) return 0;
        const cost = effectiveCost(blueprint, this.buildingManager.buildings);
        return Math.max(0, Math.floor(cost * 0.5));
    }

    demolishBuilding(building) {
        const state = this.stateManager;
        if (state.state !== GameState.PLAYING) return { ok: false, error: 'The tide has already turned.' };
        if (!this.buildingManager.buildings.includes(building)) {
            return { ok: false, error: 'That structure is already gone.' };
        }
        const blueprint = BLUEPRINT_BY_ID[building.blueprintId];
        const refund = this.demolitionRefund(building);
        if (!this.buildingManager.removeBuilding(building)) {
            return { ok: false, error: 'That structure could not be dismantled.' };
        }
        state.addLumen(refund);
        if (building.blueprintId === BEACON_ID) state.hintDismissed = false;
        this.rebuildPaths();
        this.clearHover();
        state.activeScreen?.updateTurnDisplay?.(true);
        state.activeScreen?.toast?.(`${building.name} dismantled — +${refund} lumen returned.`, 'sun');
        this.saveGame();
        return { ok: true, refund, blueprint: blueprint?.id };
    }

    previewTide() {
        const buildings = this.buildingManager.buildings;
        const active = buildings.filter((building) => building.state === 'ACTIVE');
        const underConstruction = buildings.filter((building) => building.state !== 'ACTIVE');
        const income = active.reduce((total, building) => total + (building.income ?? (BLUEPRINT_BY_ID[building.blueprintId]?.income || 0)), 0);
        return {
            income,
            active: active.length,
            start: underConstruction.length,
            message: underConstruction.length
                ? 'The water moves. Something is taking shape.'
                : 'The lamps are lit. The water is moving.'
        };
    }

    resolveTide() {
        const summary = this.buildingManager.resolveTide();
        this.stateManager.addLumen(summary.income);

        const buildings = this.buildingManager.buildings;
        const beacon = buildings.find((building) => building.blueprintId === BEACON_ID && building.state === 'ACTIVE');
        const nextDay = this.stateManager.currentTurn + 1;
        let outcome = null;
        let message = 'The lamps are lit. The water is moving.';

        if (beacon) {
            outcome = 'victory';
            message = 'The Aurora Beacon catches the last light.';
        } else if (nextDay > this.stateManager.dayLimit) {
            outcome = 'defeat';
            message = 'The water reached the lamps.';
        } else if (summary.promoted.length > 0) {
            message = `${summary.promoted.map((entry) => entry.name).join(', ')} ${summary.promoted.length === 1 ? 'is' : 'are'} taking shape.`;
        }

        return { ...summary, outcome, message, nextDay };
    }

    initializeWorld() {
        // Recompute the map size from the current window so a resize while
        // sitting in the lobby does not leave a stale world size behind.
        this.MAP_WIDTH = this.app.screen.width * this.WORLD_SCALE_FACTOR;
        this.MAP_HEIGHT = this.app.screen.height * this.WORLD_SCALE_FACTOR;

        // Clear existing world
        this.clearWorld();

        // Generate map. The generator owns the final world rectangle, which is
        // derived from the packed island cluster rather than the viewport.
        this.map = new MapGenerator(
            this.stateManager.settings.mapSeed,
            this.stateManager.settings.mapSize,
            this.MAP_WIDTH,
            this.MAP_HEIGHT
        );
        this.MAP_WIDTH = this.map.worldWidth;
        this.MAP_HEIGHT = this.map.worldHeight;
        this.crowdManager.setWorldBounds(this.MAP_WIDTH, this.MAP_HEIGHT);

        this.buildingManager.setMap(this.map);
        this.chatter.reseed(this.stateManager.settings.mapSeed);
        this.chatter.clear();
        this.stateManager.selectedBlueprint = DEFAULT_BLUEPRINT_ID;
        this.stateManager.hintDismissed = false;

        // Open on the home island at a readable scale, not on an empty corner
        // of a five-viewport map. The clamp keeps the camera inside the cluster.
        const home = this.map.homeSector || this.map.sectors[0];
        this.camera.setBounds(this.map.bounds);
        const view = this.app.screen;
        const fit = Math.min(
            view.width / Math.max(1, home.radius * 2.6),
            view.height / Math.max(1, home.radius * 1.7)
        );
        this.camera.zoom = Math.max(0.34, Math.min(0.68, fit * 1.35));
        this.camera.position.x = home.centerX;
        this.camera.position.y = home.centerY;
        this.camera.updateTransform();

        // Add map graphics to layer.
        this.map.sectors.forEach(sector => {
            this.mapLayer.addChild(sector.graphics);
        });

        // Create seeded RNG for deterministic entity placement
        const entityRNG = new SeededRandom(this.stateManager.settings.mapSeed + 1);

        // Add characters on map. Keep a reference to their home island so the
        // NPC controller can eventually stay on connected land.
        const numCharacters = 15;
        const baseSeed = this.stateManager.settings.mapSeed;
        for (let i = 0; i < numCharacters; i++) {
            const sector = this.map.getRandomSector();
            const point = sector.getRandomPoint(entityRNG);
            this.addCharacter(point.x, point.y, sector, new SeededRandom(baseSeed + 5000 + i * 131));
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

            const paletteIds = type === MINERAL_TYPES.ROCK
                ? ['ROCK_GREY', 'ROCK_BROWN']
                : ['CRYSTAL_BLUE', 'CRYSTAL_PURPLE', 'CRYSTAL_GREEN'];
            const paletteId = paletteIds[entityRNG.nextInt(0, paletteIds.length - 1)];

            this.addMineral(point.x, point.y, type, paletteId, new SeededRandom(baseSeed + 9000 + i * 197));
        }

        this.stateManager.activeScreen?.updateTurnDisplay?.(true);
    }

    clearWorld() {
        this.characters.forEach(char => char.destroy());
        this.characters = [];
        this.crowdManager.clear();

        this.minerals.forEach(min => min.destroy());
        this.minerals = [];

        this.buildingManager.clear();
        this.chatter.clear();

        if (this.map) {
            this.map.destroy();
            this.map = null;
        }

        this.mapLayer.removeChildren();
        this.characterLayer.removeChildren();
        this.shadowLayer.removeChildren();
        this.pathG.clear();
    }

    addMineral(x, y, type, paletteId, rng = null) {
        const mineral = new MineralStructure(x, y, type, paletteId, rng);

        this.minerals.push(mineral);
        this.characterLayer.addChild(mineral.container);
        this.shadowLayer.addChild(mineral.shadowG);

        mineral.container.zIndex = mineral.groundY;
    }

    addCharacter(x, y, sector = null, rng = null) {
        const char = new Character(x, y, rng);
        char.homeSector = sector;

        this.characters.push(char);
        this.crowdManager.register(char, sector);

        this.characterLayer.addChild(char.graphics);
        this.shadowLayer.addChild(char.shadow);

        char.graphics.zIndex = char.groundY ?? char.y;
    }

    update(delta) {
        const dtSeconds = delta / 60;
        const state = this.stateManager.state;
        const simulating = state === GameState.PLAYING && !document.hidden;

        // Camera is always responsive so the menu/lobby can sit over a living
        // scene without the world simulation running behind it.
        this.camera.update(dtSeconds);

        if (simulating) {
            this.crowdManager.update(dtSeconds);

            this.minerals.forEach(min => {
                min.update(dtSeconds);
                min.container.zIndex = min.groundY;
            });

            this.characters.forEach(char => {
                char.update(dtSeconds);
                char.graphics.zIndex = typeof char.groundY === 'number' ? char.groundY : char.y;
            });

            this.buildingManager.update(dtSeconds);
            this.chatter.update(dtSeconds);

            const shouldSort = Math.floor(this.app.ticker.lastTime / (1000 / 60)) % 10 === 0;
            if (shouldSort) this.characterLayer.sortChildren();
        }

        // Keep the survey chart painted even before a world exists: it gives
        // the menu a quiet "no survey" card and ensures the 2D surface the test
        // harness samples is never a blank canvas on first load.
        // Let the Glass Sea move toward dusk as the charter's tide limit nears.
        // This is a single CSS custom property and a slow filter transition, so
        // it costs nothing per frame after the value changes.
        const mood = [GameState.PLAYING, GameState.INTERSTITIAL, GameState.END].includes(state)
            ? Math.min(1, Math.max(0, (this.stateManager.currentTurn - 1) / Math.max(1, this.stateManager.dayLimit - 1)))
            : 0;
        if (Math.abs(mood - this.tideMood) > 0.001) {
            this.tideMood = mood;
            document.documentElement.style.setProperty('--tide-progress', mood.toFixed(3));
        }

        if (this.frameCount % 3 === 0) {
            this.minimap.update();
        }

        if (state === GameState.PLAYING && this.stateManager.activeScreen?.updateTurnDisplay) {
            this.stateManager.activeScreen.updateTurnDisplay();
        }

        this.frameCount += 1;
        if (this.frameCount === 1) {
            window.__APP_READY__ = true;
            window.dispatchEvent(new CustomEvent('app-ready'));
        }
    }
}

// Start app
new GameApp();
