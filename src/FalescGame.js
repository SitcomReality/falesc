import { World } from './world/World.js';
import { PatronageFlow } from './world/PatronageFlow.js';
import { Charter } from './charter/Charter.js';
import { ResidentCrowd } from './residents/ResidentCrowd.js';
import { ScreenStateMachine } from './state/ScreenStateMachine.js';
import { GamePhase } from './state/GamePhase.js';
import { MenuScreen } from './screens/MenuScreen.js';
import { LobbyScreen } from './screens/LobbyScreen.js';
import { GameScreen } from './screens/GameScreen.js';
import { DayScreen } from './screens/DayScreen.js';
import { ReportScreen } from './screens/ReportScreen.js';
import { ConfluenceScreen } from './screens/ConfluenceScreen.js';
import { EndScreen } from './screens/EndScreen.js';
import { BuildModal } from './ui/BuildModal.js';
import { ServiceCardModal } from './ui/ServiceCardModal.js';
import { BulletinModal } from './ui/BulletinModal.js';
import { CampaignModal } from './ui/CampaignModal.js';
import { ResidentCardModal } from './ui/ResidentCardModal.js';
import { OverlayManager } from './ui/OverlayManager.js';
import { Minimap } from './ui/Minimap.js';
import { ChatterManager } from './ui/ChatterManager.js';
import { SaveManager } from './persistence/SaveManager.js';
import { BUILDABLE_PROGRAMS, PROGRAM_BY_ID } from './design/programs.js';
import { DAY_PHASES, BALANCE } from './design/balance.js';
import { BuildingRenderer } from './buildings/BuildingRenderer.js';

/** The dock opens on the Canteen: the first unmet need in a new charter. */
function defaultProgramId() {
    return 'canteen';
}

/**
 * Application coordinator: wires the scene, charter model, screens and day
 * playback together. Entry point only — rules live in charter/, services/,
 * residents/, simulation/ and economy/.
 */
export class FalescGame {
    constructor() {
        this.settings = {
            mapSeed: Math.floor(Math.random() * 1000000),
            mapSize: 'medium',
            mode: 'first-light'
        };
        this.charter = null;
        this.world = new World({
            onTap: (x, y) => this.onWorldTap(x, y),
            onHover: (point) => this.onWorldHover(point)
        });
        this.crowd = new ResidentCrowd({
            objectLayer: this.world.objectLayer,
            shadowLayer: this.world.shadowLayer
        });
        this.patronageFlow = new PatronageFlow({ layer: this.world.overlayLayer });
        this.saveManager = new SaveManager();
        this.screenStateMachine = new ScreenStateMachine();

        this.selectedProgramId = defaultProgramId();
        this.pendingBuildLocation = null;
        this.hintDismissed = false;
        this.frameCount = 0;
        this.tideMood = -1;
        this.playback = null;
        this.playbackSpeed = 1;
        this.endResult = null;
        this.overlays = new OverlayManager({ inputManager: this.world.input });

        this.buildModal = new BuildModal({
            onBuild: (name) => this.finalizeBuild(name),
            onCancel: () => { this.pendingBuildLocation = null; },
            overlays: this.overlays
        });
        this.serviceCard = new ServiceCardModal({
            game: this,
            onDemolish: (service) => this.dismantleService(service),
            onReopen: (service) => this.reopenService(service),
            overlays: this.overlays
        });
        this.bulletinModal = new BulletinModal({
            overlays: this.overlays
        });
        this.residentCard = new ResidentCardModal({
            game: this,
            overlays: this.overlays
        });
        this.campaignModal = new CampaignModal({
            onChoose: (pledgeId) => this.chooseCampaignPledge(pledgeId),
            overlays: this.overlays
        });

        this.gameScreen = new GameScreen(this.screenStateMachine, this);
        this.dayScreen = new DayScreen(this);
        this.reportScreen = new ReportScreen(this);
        this.confluenceScreen = new ConfluenceScreen(this);
        this.screenStateMachine.registerScreen(GamePhase.MENU, new MenuScreen(this.screenStateMachine, this));
        this.screenStateMachine.registerScreen(GamePhase.LOBBY, new LobbyScreen(this.screenStateMachine, this));
        this.screenStateMachine.registerScreen(GamePhase.PLAYING, this.gameScreen);
        this.screenStateMachine.registerScreen(GamePhase.DAY, this.dayScreen);
        this.screenStateMachine.registerScreen(GamePhase.REPORT, this.reportScreen);
        this.screenStateMachine.registerScreen(GamePhase.CONFLUENCE, this.confluenceScreen);
        this.screenStateMachine.registerScreen(GamePhase.END, new EndScreen(this.screenStateMachine, this));

        this.minimap = new Minimap(this);
        this.chatter = new ChatterManager(this.world.overlayLayer, this);

        this.screenStateMachine.onChange((phase, previous) => this.onPhaseChanged(phase, previous));
        this.screenStateMachine.setState(GamePhase.MENU);

        window.addEventListener('beforeunload', () => this.saveGame());
        this.exposeDebugApi();
        this.world.app.ticker.add((delta) => this.update(delta));
    }

    /* ------------------------------------------------------------------ */
    /* Charter lifecycle                                                   */
    /* ------------------------------------------------------------------ */

    startCharter() {
        const seed = Number.isInteger(this.settings.mapSeed) ? this.settings.mapSeed : 1;
        const size = this.settings.mapSize || 'medium';
        this.initializeWorld(seed, size);
        this.charter = new Charter({
            seed,
            mapSize: size,
            mode: this.settings.mode || 'first-light',
            map: this.world.map,
            parentContainer: this.world.objectLayer
        });
        this.crowd.setCharter(this.charter);
        this.patronageFlow.setCharter(this.charter);
        this.gameScreen?.setPatronageState?.(false);
        this.crowd.sync();
        this.syncViews();
        this.selectedProgramId = defaultProgramId();
        this.hintDismissed = false;
        this.endResult = null;
        this.chatter.reseed(seed);
        this.screenStateMachine.setState(GamePhase.PLAYING);
        this.showBulletin();
        this.saveGame();
        return true;
    }

    continueCharter() {
        const save = this.saveManager.read();
        if (!save?.charter) return false;
        this.settings.mapSeed = save.charter.seed;
        this.settings.mapSize = save.charter.mapSize;
        this.settings.mode = save.charter.mode || 'first-light';
        this.initializeWorld(save.charter.seed, save.charter.mapSize);
        this.charter = Charter.fromSave({
            saved: save.charter,
            map: this.world.map,
            parentContainer: this.world.objectLayer
        });
        this.crowd.setCharter(this.charter);
        this.patronageFlow.setCharter(this.charter);
        this.gameScreen?.setPatronageState?.(false);
        this.crowd.sync();
        this.syncViews();
        this.selectedProgramId = defaultProgramId();
        this.chatter.reseed(this.charter.seed);
        if (save.camera && Number.isFinite(save.camera.x) && Number.isFinite(save.camera.y)) {
            this.world.camera.position.x = save.camera.x;
            this.world.camera.position.y = save.camera.y;
            this.world.camera.zoom = Math.max(0.15, Math.min(4, save.camera.zoom || 0.5));
            this.world.camera.updateTransform();
        }
        const restorePhase = save.phase === GamePhase.REPORT && this.charter.lastReport
            ? GamePhase.REPORT
            : GamePhase.PLAYING;
        this.screenStateMachine.setState(restorePhase);
        if (restorePhase === GamePhase.PLAYING) {
            this.gameScreen.toast('Charter restored. The day is yours.', 'mint');
        }
        this.saveGame();
        return true;
    }

    initializeWorld(seed, size) {
        this.disposeCharter();
        this.world.generate({ seed, size });
        this.crowd.setCharter(null);
        this.selectedProgramId = defaultProgramId();
        this.pendingBuildLocation = null;
        this.world.clearHover();
        this.world.rebuildPaths([]);
    }

    disposeCharter() {
        this.playback = null;
        this.crowd.clear();
        if (this.charter) {
            this.charter.services.clear();
            this.charter.rivals.forEach((rival) => rival.services.clear());
            this.charter = null;
        }
        this.patronageFlow.hide();
        this.patronageFlow.setCharter(null);
        this.gameScreen?.setPatronageState?.(false);
        this.chatter?.clear();
        this.buildModal.hide(false);
        this.serviceCard.hide();
        this.bulletinModal.hide();
        this.residentCard.hide();
        this.campaignModal.hide();
    }

    syncViews() {
        if (!this.charter) return;
        this.crowd.sync();
        this.world.rebuildPaths(this.charter.allServices);
        this.patronageFlow.refresh();
        this.gameScreen.updateHud(true);
    }

    togglePatronage() {
        if (!this.charter) return false;
        const visible = this.patronageFlow.toggle();
        this.gameScreen?.setPatronageState?.(visible);
        if (this.gameScreen?.toast) {
            this.gameScreen.toast(
                visible ? 'Patronage flows on — each arc is a last choice.' : 'Patronage flows off.',
                'mint',
                1800
            );
        }
        return visible;
    }

    showCampaign() {
        if (!this.charter?.campaign?.active) return false;
        this.campaignModal.show(this.charter.campaign, this.charter);
        return true;
    }

    chooseCampaignPledge(pledgeId) {
        if (!this.charter) return { ok: false };
        const result = this.charter.setCampaignPledge(pledgeId);
        if (!result.ok) return result;
        this.campaignModal.hide();
        this.gameScreen.updateHud(true);
        this.gameScreen.toast(`Campaign promise: ${this.charter.campaign.playerPledgeName}.`, 'mint', 2200);
        this.saveGame();
        return result;
    }

    /* ------------------------------------------------------------------ */
    /* Planning                                                            */
    /* ------------------------------------------------------------------ */

    selectProgram(programId) {
        const program = PROGRAM_BY_ID[programId];
        const charter = this.charter;
        if (!program || !charter || this.screenStateMachine.state !== GamePhase.PLAYING) return false;
        if (!program.buildable) return false;
        if (charter.works <= 0) return false;
        if (charter.lumen < program.cost) return false;
        if (programId === this.selectedProgramId) return true;
        this.selectedProgramId = programId;
        this.pendingBuildLocation = null;
        this.world.clearHover();
        this.gameScreen.updateHud(true);
        return true;
    }

    onWorldHover(point) {
        if (!point || !this.charter || this.screenStateMachine.state !== GamePhase.PLAYING) {
            this.world.clearHover();
            return;
        }
        if (this.hasBlockingModal()) {
            this.world.clearHover();
            return;
        }
        const program = PROGRAM_BY_ID[this.selectedProgramId];
        if (!program) {
            this.world.clearHover();
            return;
        }
        const target = this.findGridTarget(point.x, point.y);
        if (!target) {
            this.world.clearHover();
            return;
        }
        const check = this.charter.services.canPlace(program.id, target.sector.id, target.u, target.v);
        const key = `${target.sector.id}:${target.u}:${target.v}:${program.id}:${check.ok}`;
        if (key === this.world.hoverCellKey) return;
        this.world.hoverCellKey = key;

        const width = program.footprint.w;
        const height = program.footprint.h;
        this.world.hoverG.clear();
        for (let dv = 0; dv < height; dv++) {
            for (let du = 0; du < width; du++) {
                this.drawCellHighlight(target.sector, target.u + du, target.v + dv, check.ok);
            }
        }

        this.world.hoverGhostG.clear();
        if (check.ok) {
            const center = target.sector._project(target.u + width / 2, target.v + height / 2);
            this.world.hoverGhost.position.set(center.x, center.y);
            BuildingRenderer.draw(this.world.hoverGhostG, {
                programId: program.id,
                blueprintId: program.id,
                state: 'PENDING'
            });
            this.world.hoverGhost.alpha = 0.34;
            this.world.hoverGhost.visible = true;
        } else {
            this.world.hoverGhost.visible = false;
        }
    }

    drawCellHighlight(sector, u, v, valid) {
        if (u < 0 || v < 0 || u >= sector.gridSize || v >= sector.gridSize) return;
        const corners = [
            sector._project(u, v),
            sector._project(u + 1, v),
            sector._project(u + 1, v + 1),
            sector._project(u, v + 1)
        ];
        this.world.hoverG.beginFill(valid ? 0x59e3c2 : 0xff6b5e, valid ? 0.2 : 0.14);
        this.world.hoverG.lineStyle(2.5, 0x211225, 0.9);
        this.world.hoverG.moveTo(corners[0].x, corners[0].y);
        for (let index = 1; index < corners.length; index++) {
            this.world.hoverG.lineTo(corners[index].x, corners[index].y);
        }
        this.world.hoverG.closePath();
        this.world.hoverG.endFill();
    }

    findGridTarget(x, y) {
        const home = this.world.homeSector;
        if (!home) return null;
        const cell = home.getGridCell(x, y);
        if (cell.u < 0 || cell.v < 0 || cell.u >= home.gridSize || cell.v >= home.gridSize) return null;
        return { sector: home, u: Math.floor(cell.u), v: Math.floor(cell.v) };
    }

    onWorldTap(x, y) {
        if (!this.charter || this.screenStateMachine.state !== GamePhase.PLAYING) return;
        if (this.hasBlockingModal()) return;

        const resident = this.crowd.nearestResident(x, y, 62);
        if (resident) {
            this.openResident(resident.id);
            return;
        }

        const target = this.findGridTarget(x, y);
        if (!target) return;
        const existing = this.charter.services.serviceAt(target.sector.id, target.u, target.v);
        if (existing) {
            this.world.clearHover();
            this.serviceCard.show(existing);
            return;
        }

        const program = PROGRAM_BY_ID[this.selectedProgramId];
        if (!program) return;
        const check = this.charter.services.canPlace(program.id, target.sector.id, target.u, target.v);
        if (!check.ok) {
            this.gameScreen.toast(check.reason, 'coral');
            return;
        }
        const affordable = this.charter.canBuild(program.id);
        if (!affordable.ok) {
            this.gameScreen.toast(affordable.reason, 'coral');
            return;
        }
        this.pendingBuildLocation = { sectorId: target.sector.id, u: target.u, v: target.v };
        this.world.clearHover();
        this.buildModal.show(program, { lumen: this.charter.lumen, works: this.charter.works });
    }

    finalizeBuild(name) {
        const charter = this.charter;
        if (!charter || !this.pendingBuildLocation) return { ok: false, error: 'Choose a free plot first.' };
        if (this.screenStateMachine.state !== GamePhase.PLAYING) return { ok: false, error: 'The day has already begun.' };
        const result = charter.build({
            programId: this.selectedProgramId,
            sectorId: this.pendingBuildLocation.sectorId,
            u: this.pendingBuildLocation.u,
            v: this.pendingBuildLocation.v,
            name
        });
        if (!result.ok) return result;
        this.pendingBuildLocation = null;
        this.hintDismissed = true;
        this.syncViews();
        this.gameScreen.toast(`${result.service.name} breaks ground — opens tomorrow.`, 'mint');
        this.saveGame();
        return { ok: true };
    }

    dismantleService(service) {
        if (!this.charter) return { ok: false, reason: 'No charter.' };
        const result = this.charter.dismantle(service);
        if (!result.ok) return result;
        this.syncViews();
        this.gameScreen.toast(`${result.name} dismantled — +${result.refund} lumen.`, 'sun');
        this.saveGame();
        return result;
    }

    reopenService(service) {
        if (!this.charter) return { ok: false, reason: 'No charter.' };
        const result = this.charter.reopen(service);
        if (!result.ok) return result;
        this.syncViews();
        this.gameScreen.toast(`${service.name} reopens — −${result.cost} lumen.`, 'mint');
        this.saveGame();
        return result;
    }

    /* ------------------------------------------------------------------ */
    /* Day playback                                                        */
    /* ------------------------------------------------------------------ */

    openDay() {
        if (!this.charter || this.screenStateMachine.state !== GamePhase.PLAYING) return false;
        if (this.hasBlockingModal()) return false;
        this.world.clearHover();
        this.buildModal.hide(false);
        this.pendingBuildLocation = null;
        this.patronageFlow.hide();
        this.gameScreen.setPatronageState(false);
        this.chatter.clear();
        const simulation = this.charter.openDay();
        // Anyone who left at dusk no longer has an agent on the shard.
        this.crowd.sync();
        const duration = DAY_PHASES.length * BALANCE.playback.phaseSeconds;
        this.playback = {
            clock: 0,
            duration,
            speed: 1,
            report: simulation.report
        };
        this.playbackSpeed = 1;
        this.crowd.preparePlayback(simulation.events);
        this.dayScreen.setSpeed(1);
        this.dayScreen.update({ day: this.charter.day, phase: DAY_PHASES[0].name, progress: 0 });
        this.screenStateMachine.setState(GamePhase.DAY);
        return true;
    }

    setPlaybackSpeed(speed) {
        const next = [1, 2, 4].includes(Number(speed)) ? Number(speed) : 1;
        this.playbackSpeed = next;
        if (this.playback) this.playback.speed = next;
        this.dayScreen.setSpeed(next);
    }

    skipDay() {
        if (!this.playback) return;
        this.playback.clock = this.playback.duration;
        this.finishDayPlayback();
    }

    finishDayPlayback() {
        if (this.screenStateMachine.state !== GamePhase.DAY) return;
        this.playback = null;
        this.crowd.resetToPlanningPositions();
        this.screenStateMachine.setState(GamePhase.REPORT);
        this.saveGame();
    }

    beginNextDay() {
        if (!this.charter || this.screenStateMachine.state !== GamePhase.REPORT) return false;
        if (this.charter.confluenceReady) {
            this.showConfluence();
            return true;
        }
        if (this.charter.ending) {
            this.finishCharter();
            return true;
        }
        const result = this.charter.beginNextDay();
        if (result.ended) {
            this.finishCharter();
            return true;
        }
        this.selectedProgramId = defaultProgramId();
        this.hintDismissed = false;
        this.syncViews();
        this.screenStateMachine.setState(GamePhase.PLAYING);
        if (this.charter.campaign?.active && !this.charter.campaign.playerPledge) {
            this.showCampaign();
        } else {
            this.showBulletin();
        }
        if (result.arrivals?.length) {
            this.gameScreen.toast(`${result.arrivals.length} new Tidelander${result.arrivals.length === 1 ? '' : 's'} at the Welcome Post.`, 'mint');
        }
        this.saveGame();
        return true;
    }

    showConfluence() {
        if (!this.charter?.confluenceReady) return false;
        this.screenStateMachine.setState(GamePhase.CONFLUENCE);
        return true;
    }

    finishCharter() {
        if (!this.charter) return;
        this.endResult = this.charter.ending || { outcome: 'abandon' };
        this.saveManager.clear();
        this.screenStateMachine.setState(GamePhase.END);
    }

    endCharter(outcome = 'abandon') {
        if (!this.charter) {
            this.screenStateMachine.setState(GamePhase.MENU);
            return;
        }
        this.charter.ending = {
            outcome,
            day: this.charter.day,
            title: outcome === 'abandon' ? 'You leave the lamps burning.' : 'The charter closes.',
            message: outcome === 'abandon'
                ? 'The charter is closed, but the chapter stands.'
                : 'The charter closes before the commons finds its feet.'
        };
        this.endResult = this.charter.ending;
        this.saveManager.clear();
        this.screenStateMachine.setState(GamePhase.END);
    }

    /* ------------------------------------------------------------------ */
    /* Overlays                                                            */
    /* ------------------------------------------------------------------ */

    hasBlockingModal() {
        return this.overlays.isOpen;
    }

    showBulletin() {
        if (!this.charter || this.screenStateMachine.state !== GamePhase.PLAYING) return;
        const bulletin = this.charter.bulletin || this.charter.buildBulletin([]);
        this.bulletinModal.show(bulletin);
    }

    showResidentRoster() {
        if (!this.charter) return;
        const residents = this.charter.activeResidents;
        if (residents.length === 0) return;
        this.residentCard.show(residents[0], 0);
    }

    openResident(residentId) {
        if (!this.charter) return;
        const residents = this.charter.activeResidents;
        const index = residents.findIndex((resident) => resident.id === residentId);
        if (index === -1) return;
        this.residentCard.show(residents[index], index);
    }

    onPhaseChanged(phase, previous) {
        if (previous === GamePhase.DAY && phase !== GamePhase.DAY) {
            this.crowd.resetToPlanningPositions();
        }
        if (phase !== GamePhase.PLAYING) {
            this.buildModal.hide(false);
            this.serviceCard.hide();
            this.bulletinModal.hide();
            this.residentCard.hide();
            this.campaignModal.hide();
            this.world.clearHover();
        }
        if (phase === GamePhase.CONFLUENCE) {
            this.patronageFlow.hide();
            this.gameScreen.setPatronageState(false);
        }
        if (phase === GamePhase.END) this.saveManager.clear();
        if (phase === GamePhase.MENU || phase === GamePhase.LOBBY) {
            this.playback = null;
        }
    }

    /* ------------------------------------------------------------------ */
    /* Persistence                                                         */
    /* ------------------------------------------------------------------ */

    saveGame() {
        if (!this.charter) return false;
        if (![GamePhase.PLAYING, GamePhase.REPORT].includes(this.screenStateMachine.state)) return false;
        return this.saveManager.write({
            phase: this.screenStateMachine.state,
            settings: { ...this.settings },
            charter: this.charter.serialize(),
            camera: {
                x: this.world.camera.position.x,
                y: this.world.camera.position.y,
                zoom: this.world.camera.zoom
            }
        });
    }

    /* ------------------------------------------------------------------ */
    /* Main loop                                                           */
    /* ------------------------------------------------------------------ */

    update(delta) {
        // A hidden tab should not advance planning ambience or day playback.
        const dt = document.hidden ? 0 : delta / 60;
        this.world.update(dt);

        const state = this.screenStateMachine.state;
        if (state === GamePhase.PLAYING) {
            this.charter?.services.update(dt);
            this.crowd.updateAmbient(dt);
            this.chatter.update(dt);
            if (this.frameCount % 3 === 0) this.gameScreen.updateHud();
            this.sortObjects();
        } else if (state === GamePhase.DAY) {
            this.updatePlayback(dt);
            this.sortObjects();
        }

        if (this.frameCount % 3 === 0) this.minimap.update();

        const day = this.charter?.day || 1;
        const limit = this.charter?.dayLimit || 14;
        const mood = [GamePhase.PLAYING, GamePhase.DAY, GamePhase.REPORT, GamePhase.CONFLUENCE, GamePhase.END].includes(state)
            ? Math.min(1, Math.max(0, (day - 1) / Math.max(1, limit - 1)))
            : 0;
        if (Math.abs(mood - this.tideMood) > 0.001) {
            this.tideMood = mood;
            document.documentElement.style.setProperty('--tide-progress', mood.toFixed(3));
        }

        this.frameCount += 1;
        if (this.frameCount === 1) {
            window.__APP_READY__ = true;
            window.dispatchEvent(new CustomEvent('app-ready'));
        }
    }

    updatePlayback(dt) {
        if (!this.playback) return;
        this.playback.clock += dt * this.playback.speed;
        const clock = Math.min(this.playback.duration, this.playback.clock);
        const phaseSeconds = BALANCE.playback.phaseSeconds;
        const phaseIndex = Math.min(DAY_PHASES.length - 1, Math.floor(clock / phaseSeconds));
        const phase = DAY_PHASES[phaseIndex];
        this.crowd.updatePlayback(clock, dt * this.playback.speed);
        this.charter?.services.update(dt * this.playback.speed);
        this.dayScreen.update({
            day: this.charter?.day || 1,
            phase: phase.name,
            progress: clock / this.playback.duration
        });
        if (clock >= this.playback.duration) this.finishDayPlayback();
    }

    sortObjects() {
        if (this.frameCount % 10 === 0) this.world.objectLayer.sortChildren();
    }

    /* ------------------------------------------------------------------ */
    /* Debug surface                                                       */
    /* ------------------------------------------------------------------ */

    exposeDebugApi() {
        const game = this;
        window.__falesc = {
            app: game,
            get ready() {
                return window.__APP_READY__ === true;
            },
            snapshot() {
                const charter = game.charter;
                const services = charter?.services.services || [];
                const residents = charter?.activeResidents || [];
                const report = charter?.lastReport;
                return {
                    ready: window.__APP_READY__ === true,
                    frame: game.frameCount,
                    state: game.screenStateMachine.state,
                    day: charter?.day || 0,
                    turn: charter?.day || 0,
                    dayLimit: charter?.dayLimit || 0,
                    lumen: charter?.lumen || 0,
                    works: charter?.works || 0,
                    actionsRemaining: charter?.works || 0,
                    population: charter?.population || 0,
                    housedPopulation: charter?.housedPopulation || 0,
                    housingCapacity: charter?.housingCapacity || 0,
                    spareBeds: charter?.spareBeds || 0,
                    flourishing: charter?.flourishing || 0,
                    devotion: charter?.devotion || 0,
                    projectedNet: charter?.projectedNet || 0,
                    projectedContributions: charter?.projectedContributions || 0,
                    projectedUpkeep: charter?.projectedUpkeep || 0,
                    selectedProgram: game.selectedProgramId,
                    selectedBlueprint: game.selectedProgramId,
                    seed: game.settings.mapSeed,
                    mapSize: game.settings.mapSize,
                    mode: game.charter?.mode || game.settings.mode,
                    rivalCount: game.charter?.rivals?.length || 0,
                    characters: game.crowd.agents.size,
                    sectors: game.world.map?.sectors.length || 0,
                    services: services.map((service) => ({
                        id: service.id,
                        name: service.name,
                        programId: service.programId,
                        blueprintId: service.programId,
                        state: service.state,
                        capacity: service.capacity,
                        visits: service.visits,
                        hearts: service.hearts,
                        closed: service.closed,
                        u: service.u,
                        v: service.v,
                        entrance: service.entrance
                    })),
                    buildings: services.length,
                    allServices: game.charter?.allServices?.length || services.length,
                    patronageVisible: Boolean(game.patronageFlow?.visible),
                    patronageLines: game.patronageFlow?.lineCount || 0,
                    buildingStates: services.map((service) => service.state),
                    buildingBlueprints: services.map((service) => service.programId),
                    residents: residents.map((resident) => ({
                        id: resident.id,
                        name: resident.name,
                        traits: { ...resident.traits },
                        needs: { ...resident.needs },
                        wellbeing: resident.wellbeing,
                        homeServiceId: resident.homeServiceId,
                        affinity: resident.affinity.player,
                        lastChoice: resident.memory.lastChoice
                    })),
                    report: report ? {
                        day: report.day,
                        visits: report.visits,
                        hearts: report.hearts,
                        heartsGained: report.heartsGained,
                        heartsLost: report.heartsLost,
                        contributions: report.contributions,
                        upkeep: report.upkeep,
                        net: report.net,
                        lumenAfter: report.lumenAfter,
                        flourishing: report.flourishing,
                        complaints: report.complaints?.length || 0,
                        arrivals: report.arrivals || [],
                        departures: report.departures || [],
                        patronageByChapter: report.patronageByChapter || {},
                        devotionByChapter: report.devotionByChapter || {},
                        chapters: report.chapters || [],
                        population: report.population,
                        quotes: report.quotes,
                        outcome: report.outcome || null
                    } : null,
                    ending: charter?.ending || null,
                    confluenceReady: Boolean(charter?.confluenceReady),
                    campaign: charter?.campaign?.toJSON?.() || null,
                    chapters: charter?.standings?.() || [],
                    devotionByChapter: charter?.devotionByChapter || {},
                    buildModalOpen: game.buildModal.isOpen,
                    bulletinOpen: game.bulletinModal.isOpen,
                    residentCardOpen: game.residentCard.isOpen,
                    playback: game.playback ? {
                        clock: game.playback.clock,
                        duration: game.playback.duration,
                        speed: game.playback.speed
                    } : null,
                    endResult: game.charter?.ending || game.endResult || null,
                    camera: {
                        x: game.world.camera.position.x,
                        y: game.world.camera.position.y,
                        zoom: game.world.camera.zoom
                    }
                };
            },
            findFreeCell(programId = null) {
                if (!game.charter || !game.world.map) return null;
                const program = PROGRAM_BY_ID[programId || game.selectedProgramId] || PROGRAM_BY_ID[defaultProgramId()];
                const home = game.world.homeSector;
                for (let v = 0; v < home.gridSize; v++) {
                    for (let u = 0; u < home.gridSize; u++) {
                        const check = game.charter.services.canPlace(program.id, home.id, u, v);
                        if (!check.ok) continue;
                        const pos = home._project(u + 0.5, v + 0.5);
                        return { sectorId: home.id, u, v, x: pos.x, y: pos.y, programId: program.id };
                    }
                }
                return null;
            },
            worldToScreen(x, y) {
                return game.world.worldToScreen(x, y);
            },
            selectProgram(id) {
                return game.selectProgram(id);
            },
            selectBlueprint(id) {
                return game.selectProgram(id);
            },
            openDay() {
                return game.openDay();
            },
            showConfluence() {
                return game.showConfluence();
            },
            showCampaign() {
                return game.showCampaign();
            },
            skipDay() {
                return game.skipDay();
            },
            beginNextDay() {
                return game.beginNextDay();
            },
            setPlaybackSpeed(speed) {
                game.setPlaybackSpeed(speed);
                return game.playbackSpeed;
            },
            showBulletin() {
                game.showBulletin();
                return game.bulletinModal.isOpen;
            },
            togglePatronage() {
                return game.togglePatronage();
            },
            showResidents() {
                game.showResidentRoster();
                return game.residentCard.isOpen;
            },
            openResident(id) {
                game.openResident(id);
                return game.residentCard.isOpen;
            },
            saveGame() {
                return game.saveGame();
            },
            continueGame() {
                return game.continueCharter();
            },
            continueCharter() {
                return game.continueCharter();
            },
            endCharter(outcome = 'abandon') {
                game.endCharter(outcome);
            },
            serviceAt(sectorId, u, v) {
                return game.charter?.services.serviceAt(sectorId, u, v) || null;
            },
            startCharter(seed, size = 'medium', mode = null) {
                if (Number.isInteger(seed)) game.settings.mapSeed = seed;
                if (size) game.settings.mapSize = size;
                if (mode) game.settings.mode = mode;
                return game.startCharter();
            }
        };
    }
}
