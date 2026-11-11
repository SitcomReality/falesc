import * as PIXI from 'pixi.js';
import { Camera } from '../Camera.js';
import { InputManager } from '../controls/InputManager.js';
import { MapGenerator } from '../map/MapGenerator.js';
import { SeededRandom } from '../map/SeededRandom.js';
import { MineralStructure } from '../minerals/MineralStructure.js';
import { MINERAL_TYPES, MINERAL_PALETTES } from '../constants.js';
import { drawSettlementPaths } from '../map/SettlementPaths.js';

const MINERAL_COUNTS = { small: 46, medium: 64, large: 82 };
const WORLD_SCALE_FACTOR = 5;

/**
 * The Pixi scene: transparent canvas, layered world containers, camera, input,
 * generated map and vacuum scenery. The charter and simulation never import
 * Pixi; they are attached to this scene by the app.
 */
export class World {
    constructor({ onTap, onHover } = {}) {
        this.app = new PIXI.Application({
            resizeTo: window,
            backgroundColor: 0x1c0d24,
            backgroundAlpha: 0,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true
        });
        document.body.appendChild(this.app.view);

        this.worldContainer = new PIXI.Container();
        this.app.stage.addChild(this.worldContainer);

        this.mapLayer = new PIXI.Container();
        this.pathLayer = new PIXI.Container();
        this.pathG = new PIXI.Graphics();
        this.pathLayer.addChild(this.pathG);
        this.shadowLayer = new PIXI.Container();
        this.interactionLayer = new PIXI.Container();
        this.objectLayer = new PIXI.Container();
        this.objectLayer.sortableChildren = true;
        this.overlayLayer = new PIXI.Container();

        this.hoverG = new PIXI.Graphics();
        this.hoverGhostG = new PIXI.Graphics();
        this.hoverGhost = new PIXI.Container();
        this.hoverGhost.addChild(this.hoverGhostG);
        this.hoverGhost.visible = false;
        this.hoverCellKey = null;
        this.interactionLayer.addChild(this.hoverG, this.hoverGhost);

        this.worldContainer.addChild(
            this.mapLayer,
            this.pathLayer,
            this.shadowLayer,
            this.interactionLayer,
            this.objectLayer,
            this.overlayLayer
        );

        this.input = new InputManager(window);
        this.camera = new Camera(this.app, this.worldContainer, onTap, this.input, onHover);
        this.map = null;
        this.minerals = [];
        this.MAP_WIDTH = this.app.screen.width * WORLD_SCALE_FACTOR;
        this.MAP_HEIGHT = this.app.screen.height * WORLD_SCALE_FACTOR;
        this.camera.position.x = this.MAP_WIDTH / 2;
        this.camera.position.y = this.MAP_HEIGHT / 2;
        this.camera.updateTransform();

        this.app.renderer.on('resize', () => {
            this.camera.updateTransform();
            this.camera.clampToWorld?.();
        });
    }

    get homeSector() {
        return this.map?.homeSector || null;
    }

    get bounds() {
        return this.map?.bounds || null;
    }

    generate({ seed, size }) {
        this.clear();
        this.MAP_WIDTH = this.app.screen.width * WORLD_SCALE_FACTOR;
        this.MAP_HEIGHT = this.app.screen.height * WORLD_SCALE_FACTOR;
        this.map = new MapGenerator(seed, size, this.MAP_WIDTH, this.MAP_HEIGHT);
        this.MAP_WIDTH = this.map.worldWidth;
        this.MAP_HEIGHT = this.map.worldHeight;

        this.map.sectors.forEach((sector) => this.mapLayer.addChild(sector.graphics));

        const entityRng = new SeededRandom(seed + 1);
        const count = MINERAL_COUNTS[size] || MINERAL_COUNTS.medium;
        for (let index = 0; index < count; index++) {
            const point = this.map.getRandomMineralPoint();
            const type = entityRng.next() > 0.56 ? MINERAL_TYPES.ROCK : MINERAL_TYPES.CRYSTAL;
            const paletteIds = type === MINERAL_TYPES.ROCK
                ? ['ROCK_GREY', 'ROCK_BROWN']
                : ['CRYSTAL_BLUE', 'CRYSTAL_PURPLE', 'CRYSTAL_GREEN'];
            const paletteId = paletteIds[entityRng.nextInt(0, paletteIds.length - 1)];
            const palette = MINERAL_PALETTES.find((entry) => entry.id === paletteId);
            const mineral = new MineralStructure(
                point.x,
                point.y,
                type,
                paletteId,
                new SeededRandom(seed + 9000 + index * 197)
            );
            mineral.palette = palette;
            this.minerals.push(mineral);
            this.objectLayer.addChild(mineral.container);
            this.shadowLayer.addChild(mineral.shadowG);
            mineral.container.zIndex = mineral.groundY;
        }

        const home = this.homeSector || this.map.sectors[0];
        this.camera.setBounds(this.map.bounds);
        const view = this.app.screen;
        const fit = Math.min(
            view.width / Math.max(1, home.radius * 2.55),
            view.height / Math.max(1, home.radius * 1.7)
        );
        this.camera.zoom = Math.max(0.36, Math.min(0.72, fit * 1.42));
        this.camera.position.x = home.centerX;
        this.camera.position.y = home.centerY;
        this.camera.updateTransform();
        return this.map;
    }

    rebuildPaths(services) {
        this.pathG.clear();
        if (!this.map) return;
        drawSettlementPaths(this.pathG, this.map, services);
    }

    clearHover() {
        this.hoverG.clear();
        this.hoverGhostG.clear();
        this.hoverGhost.visible = false;
        this.hoverCellKey = null;
    }

    clear() {
        this.minerals.forEach((mineral) => mineral.destroy());
        this.minerals = [];
        if (this.map) {
            this.map.destroy();
            this.map = null;
        }
        this.mapLayer.removeChildren();
        this.shadowLayer.removeChildren();
        this.objectLayer.removeChildren();
        this.overlayLayer.removeChildren();
        this.pathG.clear();
    }

    update(dt) {
        this.camera.update(dt);
        this.minerals.forEach((mineral) => {
            mineral.update(dt);
            mineral.container.zIndex = mineral.groundY;
        });
    }

    worldToScreen(x, y) {
        const cx = this.app.screen.width / 2;
        const cy = this.app.screen.height / 2;
        return {
            x: cx + (x - this.camera.position.x) * this.camera.zoom,
            y: cy + (y - this.camera.position.y) * this.camera.zoom
        };
    }
}
