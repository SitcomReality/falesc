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
        floorPlans = [],
        condition = 100,
        needOverride = null,
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
        this.baseProgram = program;
        this.needOverride = needOverride || null;
        this.program = applyNeedOverride(program, this.needOverride);
        this.sectorId = sectorId;
        this.u = u;
        this.v = v;
        this.name = name || program?.name || 'Service';
        this.state = state;
        this.fixed = Boolean(fixed);
        this.finish = finish || program?.finish || 'comfortable';
        this.modules = [...modules];
        this.policy = policy || { access: 'open', hours: 'as_built', vibe: program?.vibe || 'cosy', focus: 'balanced' };
        this.capacity = capacityOverride ?? program?.capacity ?? 1;
        this.level = Number(level) || 1;
        this.retrofitId = retrofitId || null;
        this.builderChapterId = builderChapterId || null;
        this.floorPlans = [...floorPlans];
        this.condition = Math.max(0, Math.min(100, Number(condition) || 100));
        this.qualityBonus = Number(qualityBonus) || 0;
        this.upkeepBonus = Number(upkeepBonus) || 0;
        this.floors = Math.max(1, Math.min(3, Number(floors) || 1));
        this.adjacencyBonus = 0;
        this.adjacencyNeighbours = 0;
        this.adjacencyChapters = [];
        this.districtId = null;
        this.districtName = null;
        this.districtBonus = 0;
        this.districtSize = 0;
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

    setNeedOverride(needId) {
        this.needOverride = needId || null;
        this.program = applyNeedOverride(this.baseProgram, this.needOverride);
        return this.program;
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
        const top = -BuildingRenderer.storeyTop(this.programId) + 10;
        for (let floor = 1; floor < this.floors; floor++) {
            const base = top - (floor - 1) * 22;
            const hw = 46;
            const hh = 17;
            const height = 20;
            const roof = base - height;
            // Top diamond.
            this.floorG.beginFill(0xFFF2D8, 1);
            this.floorG.lineStyle(2.5, 0x211225, 1);
            this.floorG.moveTo(0, roof);
            this.floorG.lineTo(hw, roof + hh);
            this.floorG.lineTo(0, roof + hh * 2);
            this.floorG.lineTo(-hw, roof + hh);
            this.floorG.closePath();
            this.floorG.endFill();
            // Left wall.
            this.floorG.beginFill(0xF3D9AE, 1);
            this.floorG.moveTo(-hw, roof + hh);
            this.floorG.lineTo(0, roof + hh * 2);
            this.floorG.lineTo(0, base + hh * 2);
            this.floorG.lineTo(-hw, base + hh);
            this.floorG.closePath();
            this.floorG.endFill();
            // Right wall.
            this.floorG.beginFill(0xFFD36E, 1);
            this.floorG.moveTo(hw, roof + hh);
            this.floorG.lineTo(0, roof + hh * 2);
            this.floorG.lineTo(0, base + hh * 2);
            this.floorG.lineTo(hw, base + hh);
            this.floorG.closePath();
            this.floorG.endFill();
            // Windows on the lit face.
            this.floorG.beginFill(0x211225, 0.75);
            for (let windowIndex = 0; windowIndex < 2; windowIndex++) {
                this.floorG.drawRect(-30 + windowIndex * 20, roof + hh + 6, 8, 5);
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
            floorPlans: [...this.floorPlans],
            condition: this.condition,
            needOverride: this.needOverride,
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

function applyNeedOverride(program, needId) {
    if (!program || !needId) return program;
    return { ...program, need: needId, secondaryNeed: null, needOverride: needId };
}
