import * as PIXI from 'pixi.js';
import { programNeed, footprintCells } from '../design/programs.js';
import { BuildingRenderer } from '../buildings/BuildingRenderer.js';
import { projectGridToWorld } from '../map/GridUtils.js';
import { TILE_WIDTH, TILE_HEIGHT } from '../constants.js';

let nextServiceNumber = 1;

/**
 * A service building: model data plus its Pixi silhouette. Services are
 * destinations with a door, capacity, visits and hearts — not income tiles.
 */
export class ServiceBuilding {
    constructor({
        id = null,
        chapter = null,
        programId,
        program,
        sectorId,
        u,
        v,
        name,
        state = 'PENDING',
        entrance = null,
        capacityOverride = null,
        fixed = false,
        finish = null,
        modules = [],
        policy = null,
        level = 1,
        retrofitId = null,
        builderChapterId = null,
        qualityBonus = 0,
        upkeepBonus = 0,
        floors = 1,
        visits = 0,
        hearts = 0,
        closed = false,
        constructionDays = null
    }) {
        this.id = id || `client-s${nextServiceNumber++}`;
        this.chapter = chapter;
        this.chapterId = chapter?.id || 'player';
        this.chapterName = chapter?.name || 'Home Chapter';
        this.chapterColour = chapter?.colour || '#FF6B5E';
        this.isPlayerService = chapter?.isPlayer ?? true;
        this.programId = programId;
        this.program = program;
        this.sectorId = sectorId;
        this.u = u;
        this.v = v;
        this.name = name || program?.name || 'Service';
        this.state = state;
        this.fixed = Boolean(fixed);
        this.finish = finish || program?.finish || 'comfortable';
        this.modules = [...modules];
        this.policy = policy || { access: 'open', hours: 'as_built', vibe: program?.vibe || 'cosy' };
        this.capacity = capacityOverride ?? program?.capacity ?? 1;
        this.level = Number(level) || 1;
        this.retrofitId = retrofitId || null;
        this.builderChapterId = builderChapterId || null;
        this.qualityBonus = Number(qualityBonus) || 0;
        this.upkeepBonus = Number(upkeepBonus) || 0;
        this.floors = Math.max(1, Math.min(3, Number(floors) || 1));
        this.entrance = entrance;
        this.visits = Number(visits) || 0;
        this.hearts = Number(hearts) || 0;
        this.closed = Boolean(closed);
        this.constructionDays = constructionDays ?? program?.constructionDays ?? 1;
        this.daysRemaining = this.state === 'PENDING' ? this.constructionDays : 0;

        this.queue = [];
        this.occupants = [];
        this.dailyVisits = 0;

        this.container = new PIXI.Container();
        this.graphics = new PIXI.Graphics();
        this.floorG = new PIXI.Graphics();
        this.bannerG = new PIXI.Graphics();
        this.container.addChild(this.graphics, this.floorG, this.bannerG);
        this.container.sortableChildren = false;
        this.pulseTime = 0;
        this.sector = null;
        this.refreshGraphics();
    }

    get cells() {
        return footprintCells(this.program, this.u, this.v);
    }

    get needId() {
        return programNeed(this.program);
    }

    get capacityUsed() {
        return this.occupants.length;
    }

    get hasSpace() {
        return this.occupants.length < this.capacity;
    }

    get queueLength() {
        return this.queue.length;
    }

    setSector(sector) {
        this.sector = sector;
    }

    setEntrance(entrance) {
        this.entrance = entrance;
    }

    setPosition(sector) {
        if (!sector) return;
        this.sector = sector;
        const width = this.program?.footprint?.w || 1;
        const height = this.program?.footprint?.h || 1;
        const position = projectGridToWorld(
            this.u + width / 2,
            this.v + height / 2,
            sector.centerX,
            sector.centerY,
            sector.gridSize,
            TILE_WIDTH,
            TILE_HEIGHT
        );
        this.container.position.set(position.x, position.y);
        this.groundY = position.y;
        this.container.zIndex = position.y;
    }

    get entranceWorldPoint() {
        if (!this.sector || !this.entrance) return { x: this.container.x, y: this.container.y + 30 };
        return this.sector._project(this.entrance.u + 0.5, this.entrance.v + 0.5);
    }

    refreshGraphics() {
        BuildingRenderer.draw(this.graphics, this);
        this.drawFloorTabs();
        this.drawChapterBanner();
        this.container.alpha = this.closed ? 0.62 : this.state === 'PENDING' ? 0.72 : 1;
    }

    drawFloorTabs() {
        this.floorG.clear();
        for (let floor = 1; floor < this.floors; floor++) {
            const y = -104 - (floor - 1) * 13;
            this.floorG.beginFill(0xFFF8EA, 0.94);
            this.floorG.lineStyle(2, 0x211225, 0.9);
            this.floorG.drawRoundedRect(-25, y, 50, 9, 3);
            this.floorG.endFill();
            this.floorG.beginFill(0x59E3C2, 0.95);
            for (let windowIndex = 0; windowIndex < 3; windowIndex++) {
                this.floorG.drawCircle(-13 + windowIndex * 13, y + 4.5, 2.1);
            }
            this.floorG.endFill();
        }
    }

    drawChapterBanner() {
        this.bannerG.clear();
        const colour = Number.parseInt(String(this.chapterColour).replace('#', ''), 16) || 0xff6b5e;
        const x = 72;
        this.bannerG.lineStyle(3, 0x211225, 0.95);
        this.bannerG.moveTo(x, -4);
        this.bannerG.lineTo(x, -150);
        this.bannerG.beginFill(colour, 1);
        this.bannerG.lineStyle(2, 0x211225, 1);
        this.bannerG.moveTo(x + 1, -148);
        this.bannerG.lineTo(x + 36, -138);
        this.bannerG.lineTo(x + 1, -112);
        this.bannerG.closePath();
        this.bannerG.endFill();
    }

    promote() {
        if (this.state !== 'PENDING') return this.state;
        this.daysRemaining = Math.max(0, this.daysRemaining - 1);
        if (this.daysRemaining <= 0) {
            this.state = 'ACTIVE';
        }
        this.refreshGraphics();
        return this.state;
    }

    close() {
        this.closed = true;
        this.queue = [];
        this.occupants = [];
        this.refreshGraphics();
    }

    reopen() {
        this.closed = false;
        this.refreshGraphics();
    }

    recordVisit(hearts = 0) {
        this.visits += 1;
        this.dailyVisits += 1;
        this.hearts = Math.round((this.hearts + hearts) * 100) / 100;
    }

    resetDaily() {
        this.dailyVisits = 0;
        this.queue = [];
        this.occupants = [];
    }

    update(dt) {
        if (this.state === 'PENDING') {
            this.pulseTime += dt;
            this.container.alpha = 0.68 + Math.sin(this.pulseTime * 4) * 0.07;
        } else {
            this.container.alpha = this.closed ? 0.62 : 1;
        }
    }

    get retrofits() {
        const fromModules = (this.modules || [])
            .filter((entry) => entry.startsWith('retrofit:'))
            .map((entry) => entry.slice('retrofit:'.length));
        if (fromModules.length === 0 && this.retrofitId) return [this.retrofitId];
        return fromModules;
    }

    toJSON() {
        return {
            id: this.id,
            chapterId: this.chapterId,
            programId: this.programId,
            sectorId: this.sectorId,
            u: this.u,
            v: this.v,
            name: this.name,
            state: this.state,
            entrance: this.entrance,
            capacity: this.capacity,
            level: this.level,
            retrofitId: this.retrofitId,
            builderChapterId: this.builderChapterId,
            qualityBonus: this.qualityBonus,
            upkeepBonus: this.upkeepBonus,
            floors: this.floors,
            fixed: this.fixed,
            finish: this.finish,
            modules: [...this.modules],
            policy: { ...this.policy },
            visits: this.visits,
            hearts: this.hearts,
            closed: this.closed,
            constructionDays: this.constructionDays,
            daysRemaining: this.daysRemaining
        };
    }

    destroy() {
        this.container.destroy({ children: true });
    }
}
