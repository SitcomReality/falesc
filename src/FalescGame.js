import { World } from './world/World.js';
import { PatronageFlow } from './world/PatronageFlow.js';
import { TransitGate } from './world/TransitGate.js';
import { DistrictOverlay } from './world/DistrictOverlay.js';
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
import { StewardshipScreen } from './screens/StewardshipScreen.js';
import { STEWARDSHIP_BY_ID } from './confluence/Stewardship.js';
import { readLegacy, writeLegacy } from './confluence/StewardshipLegacy.js';
import { EndScreen } from './screens/EndScreen.js';
import { BuildModal } from './ui/BuildModal.js';
import { ServiceCardModal } from './ui/ServiceCardModal.js';
import { RetrofitModal } from './ui/RetrofitModal.js';
import { SERVICE_HOURS_BY_ID } from './services/ServicePolicies.js';
import { VisitorCardModal } from './ui/VisitorCardModal.js';
import { FloorPlanModal } from './ui/FloorPlanModal.js';
import { FieldGuideModal } from './ui/FieldGuideModal.js';
import { DepartureArchiveModal } from './ui/DepartureArchiveModal.js';
import { CharterArchiveModal } from './ui/CharterArchiveModal.js';
import { NeedSurveyModal } from './ui/NeedSurveyModal.js';
import { CharterLedgerModal } from './ui/CharterLedgerModal.js';
import { RivalDossierModal } from './ui/RivalDossierModal.js';
import { CharterJournalModal } from './ui/CharterJournalModal.js';
import { MilestonesModal } from './ui/MilestonesModal.js';
import { ResidentRosterModal } from './ui/ResidentRosterModal.js';
import { GridSummaryModal } from './ui/GridSummaryModal.js';
import { recordCharter, recordFromCharter } from './persistence/CharterArchive.js';
import { recordMilestones } from './persistence/MilestoneArchive.js';
import { readMotion, writeMotion, applyMotion } from './settings/MotionPreference.js';
import { readContrast, writeContrast, applyContrast } from './settings/ContrastPreference.js';
import { readChartParams } from './settings/ChartLink.js';
import { BulletinModal } from './ui/BulletinModal.js';
import { CampaignModal } from './ui/CampaignModal.js';
import { CommonsModal } from './ui/CommonsModal.js';
import { ResidentCardModal } from './ui/ResidentCardModal.js';
import { OverlayManager } from './ui/OverlayManager.js';
import { Minimap } from './ui/Minimap.js';
import { ChatterManager } from './ui/ChatterManager.js';
import { SaveManager } from './persistence/SaveManager.js';
import { Soundscape } from './audio/Soundscape.js';
import { BUILDABLE_PROGRAMS, PROGRAM_BY_ID } from './design/programs.js';
import { DAY_PHASES, BALANCE } from './design/balance.js';
import { BuildingRenderer } from './buildings/BuildingRenderer.js';
import { installDebugApi } from './debug/DebugApi.js';
import { BuildCursor } from './controls/BuildCursor.js';

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
        this.motion = readMotion();
        applyMotion(this.motion);
        this.contrast = readContrast();
        applyContrast(this.contrast);
        this.settings = {
            mapSeed: Math.floor(Math.random() * 1000000),
            mapSize: 'medium',
            mode: 'first-light',
            chapterName: 'Home Chapter'
        };
        const chartParams = readChartParams();
        if (chartParams.seed !== null) this.settings.mapSeed = chartParams.seed;
        if (chartParams.size) this.settings.mapSize = chartParams.size;
        if (chartParams.mode) this.settings.mode = chartParams.mode;
        this.charter = null;
        this.world = new World({
            onTap: (x, y) => this.onWorldTap(x, y),
            onHover: (point) => this.onWorldHover(point)
        });
        this.setWorldVisible(false);
        this.crowd = new ResidentCrowd({
            objectLayer: this.world.objectLayer,
            shadowLayer: this.world.shadowLayer
        });
        this.crowd.setReducedMotion(this.motion === 'reduced');
        this.patronageFlow = new PatronageFlow({ layer: this.world.overlayLayer });
        this.transitGate = new TransitGate({ layer: this.world.overlayLayer });
        this.districtOverlay = new DistrictOverlay({ layer: this.world.overlayLayer });
        this.saveManager = new SaveManager();
        this.audio = new Soundscape();
        document.addEventListener('pointerdown', () => this.audio.unlock(), { once: true });
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
        this.buildCursor = new BuildCursor(this);

        this.buildModal = new BuildModal({
            onBuild: (name, finish) => this.finalizeBuild(name, finish),
            onCancel: () => { this.pendingBuildLocation = null; },
            overlays: this.overlays
        });
        this.serviceCard = new ServiceCardModal({
            game: this,
            onDemolish: (service) => this.dismantleService(service),
            onRepair: (service) => this.repairService(service),
            onOpenResident: (residentId) => this.openResident(residentId),
            onRename: (service, name) => this.renameService(service, name),
            onReopen: (service) => this.reopenService(service),
            onRetrofit: (service) => this.openRetrofit(service),
            onHours: (service, hoursId) => this.setServiceHours(service, hoursId),
            onFloor: (service) => this.openFloorPlan(service),
            onVibe: (service, vibeId) => this.setServiceVibe(service, vibeId),
            onAccess: (service, accessId) => this.setServiceAccess(service, accessId),
            onFocus: (service, focusId) => this.setServiceFocus(service, focusId),
            overlays: this.overlays
        });
        this.floorPlan = new FloorPlanModal({
            game: this,
            onChoose: (service, planId) => this.addFloor(service, planId),
            onDone: (service) => {
                this.serviceCard.hide();
                this.serviceCard.show(service);
            },
            overlays: this.overlays
        });
        this.fieldGuide = new FieldGuideModal({ overlays: this.overlays });
        this.departureArchive = new DepartureArchiveModal({ game: this, overlays: this.overlays });
        this.needSurvey = new NeedSurveyModal({
            game: this,
            overlays: this.overlays,
            onOpenResident: (residentId) => this.openResident(residentId)
        });
        this.ledger = new CharterLedgerModal({ game: this, overlays: this.overlays });
        this.rivalDossier = new RivalDossierModal({ game: this, overlays: this.overlays });
        this.journal = new CharterJournalModal({ game: this, overlays: this.overlays });
        this.milestones = new MilestonesModal({ game: this, overlays: this.overlays });
        this.gridSummary = new GridSummaryModal({ game: this, overlays: this.overlays });
        this.residentRoster = new ResidentRosterModal({
            game: this,
            overlays: this.overlays,
            onOpenResident: (residentId) => this.openResident(residentId)
        });
        this.charterArchive = new CharterArchiveModal({
            overlays: this.overlays,
            onClear: () => this.menuScreen?.show()
        });
        this.visitorCard = new VisitorCardModal({
            onInvite: (visitorId) => this.inviteVisitor(visitorId),
            overlays: this.overlays
        });
        this.retrofitModal = new RetrofitModal({
            game: this,
            onChoose: (service, moduleId) => this.upgradeService(service, moduleId),
            onDone: (service) => {
                this.serviceCard.hide();
                this.serviceCard.show(service);
            },
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
            onSponsor: (needId) => this.sponsorCampaign(needId),
            overlays: this.overlays
        });
        this.commonsModal = new CommonsModal({
            onContribute: (amount) => this.contributeCommons(amount),
            onPurse: (amount) => this.contributePurse(amount),
            onCapital: (amount) => this.contributeCapital(amount),
            onNominate: (policyId) => this.nominateCommonsPolicy(policyId),
            onVote: () => this.resolveCommonsAssembly(),
            onSecondReading: () => this.callSecondReading(),
            onAnnex: () => this.upgradeCommons(),
            overlays: this.overlays
        });

        this.gameScreen = new GameScreen(this.screenStateMachine, this);
        this.dayScreen = new DayScreen(this);
        this.reportScreen = new ReportScreen(this);
        this.confluenceScreen = new ConfluenceScreen(this);
        this.stewardshipScreen = new StewardshipScreen(this);
        this.menuScreen = new MenuScreen(this.screenStateMachine, this);
        this.screenStateMachine.registerScreen(GamePhase.MENU, this.menuScreen);
        this.screenStateMachine.registerScreen(GamePhase.LOBBY, new LobbyScreen(this.screenStateMachine, this));
        this.screenStateMachine.registerScreen(GamePhase.PLAYING, this.gameScreen);
        this.screenStateMachine.registerScreen(GamePhase.DAY, this.dayScreen);
        this.screenStateMachine.registerScreen(GamePhase.REPORT, this.reportScreen);
        this.screenStateMachine.registerScreen(GamePhase.CONFLUENCE, this.confluenceScreen);
        this.screenStateMachine.registerScreen(GamePhase.STEWARDSHIP, this.stewardshipScreen);
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
        this.setWorldVisible(true);
        const seed = Number.isInteger(this.settings.mapSeed) ? this.settings.mapSeed : 1;
        const size = this.settings.mapSize || 'medium';
        this.initializeWorld(seed, size);
        const legacy = readLegacy();
        this.charter = new Charter({
            seed,
            mapSize: size,
            mode: this.settings.mode || 'first-light',
            chapterName: this.settings.chapterName || 'Home Chapter',
            map: this.world.map,
            parentContainer: this.world.objectLayer,
            legacy
        });
        this.crowd.setCharter(this.charter);
        this.patronageFlow.setCharter(this.charter);
        this.transitGate.setCharter(this.charter);
        this.districtOverlay.setCharter(this.charter);
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
        this._archiveRecorded = false;
        this.setWorldVisible(true);
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
        this.transitGate.setCharter(this.charter);
        this.districtOverlay.setCharter(this.charter);
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
            this.charter.commonsManager?.clear();
            this.charter = null;
        }
        this.patronageFlow.hide();
        this.patronageFlow.setCharter(null);
        this.transitGate.clear();
        this.districtOverlay.clear();
        this.clearKeyboardCursor();
        this.visitorCard.hide();
        this.gameScreen?.setPatronageState?.(false);
        this.chatter?.clear();
        this.buildModal.hide(false);
        this.serviceCard.hide();
        this.bulletinModal.hide();
        this.residentCard.hide();
        this.campaignModal.hide();
        this.commonsModal.hide();
        this.retrofitModal.hide();
        this.floorPlan.hide();
        this.fieldGuide.hide();
        this.departureArchive.hide();
        this.charterArchive.hide();
        this.needSurvey.hide();
        this.ledger.hide();
        this.rivalDossier.hide();
        this.journal.hide();
        this.milestones.hide();
        this.residentRoster.hide();
        this.gridSummary.hide();
        this.visitorCard.hide();
    }

    buildableSectors() {
        return [this.world.homeSector, this.charter?.commonsSector, this.charter?.gardenSector].filter(Boolean);
    }

    syncViews() {
        if (!this.charter) return;
        this.crowd.sync();
        this.world.rebuildPaths(this.charter.allServices);
        this.patronageFlow.refresh();
        this.transitGate.refresh();
        this.districtOverlay.refresh();
        this.gameScreen.updateHud(true);
    }

    toggleAudio() {
        const enabled = this.audio.toggle();
        this.gameScreen?.setSound(enabled);
        this.gameScreen?.toast(enabled ? 'Sound on. The void hums.' : 'Sound off.', enabled ? 'mint' : 'coral', 1600);
        return enabled;
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

    showCommons() {
        if (!this.charter?.commons) return false;
        this.commonsModal.show(this.charter);
        return true;
    }

    showVisitor(visitorId) {
        if (!this.charter) return false;
        const visitor = this.charter.visitors.find((entry) => entry.id === visitorId);
        if (!visitor) return false;
        this.visitorCard.show(visitor, { spareBeds: this.charter.spareBeds });
        return true;
    }

    inviteVisitor(visitorId) {
        if (!this.charter) return { ok: false, reason: 'No charter.' };
        const result = this.charter.inviteVisitor(visitorId);
        if (!result.ok) return result;
        this.crowd.sync();
        this.gameScreen.updateHud(true);
        this.reportScreen.show();
        this.saveGame();
        this.gameScreen.toast(`${result.trial.name} begins a trial stay.`, 'mint', 2400);
        return result;
    }

    contributeCapital(amount) {
        if (!this.charter) return { ok: false, reason: 'No charter.' };
        const result = this.charter.contributeCapital(amount);
        if (!result.ok) return result;
        this.gameScreen.updateHud(true);
        this.saveGame();
        this.audio.play('mint');
        this.gameScreen.toast(`${result.gave} lumen into the shared capital budget.`, 'mint', 2200);
        return result;
    }

    contributePurse(amount) {
        if (!this.charter) return { ok: false, reason: 'No charter.' };
        const result = this.charter.contributePurse(amount);
        if (!result.ok) return result;
        this.gameScreen.updateHud(true);
        this.saveGame();
        this.audio.play('mint');
        this.gameScreen.toast(`${result.gave} lumen into the commons purse.`, 'mint', 2200);
        return result;
    }

    nominateCommonsPolicy(policyId) {
        if (!this.charter) return { ok: false, reason: 'No charter.' };
        const result = this.charter.nominateCommonsPolicy(policyId);
        if (!result.ok) return result;
        this.gameScreen.updateHud(true);
        this.saveGame();
        this.gameScreen.toast(`${result.policy.name} is on the ballot.`, 'mint', 2200);
        return result;
    }

    callSecondReading() {
        if (!this.charter) return { ok: false, reason: 'No charter.' };
        const result = this.charter.callSecondReading();
        if (!result.ok) return result;
        this.gameScreen.updateHud(true);
        this.saveGame();
        this.gameScreen.toast('The second reading is open.', 'mint', 2400);
        return result;
    }

    resolveCommonsAssembly() {
        if (!this.charter) return { ok: false, reason: 'No charter.' };
        const result = this.charter.resolveCommonsAssembly();
        if (!result.ok) return result;
        this.syncViews();
        this.gameScreen.updateHud(true);
        this.saveGame();
        this.gameScreen.toast(`${result.policy.name} wins the Commons Assembly.`, 'mint', 2600);
        return result;
    }

    upgradeCommons() {
        if (!this.charter) return { ok: false, reason: 'No charter.' };
        const result = this.charter.upgradeCommons();
        if (!result.ok) return result;
        this.gameScreen.updateHud(true);
        this.saveGame();
        this.gameScreen.toast('The Beacon gains an annex.', 'mint', 2200);
        return result;
    }

    contributeCommons(amount) {
        if (!this.charter) return { ok: false, reason: 'No charter.' };
        const result = this.charter.contributeCommons(this.charter.player, amount);
        if (!result.ok) return result;
        this.gameScreen.updateHud(true);
        this.saveGame();
        if (result.activated) {
            this.gameScreen.toast('The Commons Beacon is lit — every resident rests a little easier.', 'mint', 2600);
        }
        return result;
    }

    showCampaign() {
        if (!this.charter?.campaign?.active) return false;
        this.campaignModal.show(this.charter.campaign, this.charter);
        return true;
    }

    sponsorCampaign(needId) {
        if (!this.charter) return { ok: false, reason: 'No charter.' };
        const result = this.charter.sponsorCampaign(needId);
        if (!result.ok) return result;
        this.gameScreen.updateHud(true);
        this.saveGame();
        this.audio.play('build');
        this.gameScreen.toast('A sponsored bell joins the festival.', 'mint', 2200);
        return result;
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
        if (this.keyboardCursorActive) this.renderKeyboardCursor();
        this.gameScreen.updateHud(true);
        return true;
    }

    onWorldHover(point) {
        if (!point || !this.charter || this.screenStateMachine.state !== GamePhase.PLAYING) {
            this.world.clearHover();
            return;
        }
        if (this.hasBlockingModal() || this.keyboardCursorActive) {
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
        this.buildCursor.paint(target, program);
    }

    get keyboardCursorActive() {
        return this.buildCursor?.active || false;
    }

    get keyboardCursor() {
        return this.buildCursor?.cursor || null;
    }

    findGridTarget(x, y) {
        return this.buildCursor.findGridTarget(x, y);
    }

    toggleKeyboardCursor() {
        return this.buildCursor.toggle();
    }

    moveKeyboardCursor(dx, dy) {
        return this.buildCursor.move(dx, dy);
    }

    switchKeyboardSector() {
        return this.buildCursor.switchSector();
    }

    renderKeyboardCursor() {
        return this.buildCursor.render();
    }

    confirmKeyboardCursor() {
        return this.buildCursor.confirm();
    }

    clearKeyboardCursor() {
        return this.buildCursor.clear();
    }

    onWorldTap(x, y) {
        if (!this.charter || this.screenStateMachine.state !== GamePhase.PLAYING) return;
        if (this.hasBlockingModal()) return;
        if (this.keyboardCursorActive) this.clearKeyboardCursor();

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
            if (existing.isTransit) {
                this.gameScreen.toast('The shuttle docks here. Build on the outer isle from the same dock.', 'mint', 2200);
            } else if (existing.id === this.charter.commons.serviceId) {
                this.showCommons();
            } else {
                this.serviceCard.show(existing);
            }
            return;
        }

        const program = PROGRAM_BY_ID[this.selectedProgramId];
        if (!program) return;
        const check = this.charter.services.canPlace(program.id, target.sector.id, target.u, target.v);
        if (!check.ok) {
            this.gameScreen.toast(check.reason, 'coral');
            return;
        }
        const sharedCapital = target.sector.commons ? (this.charter.commons?.capital || 0) : 0;
        const affordable = this.charter.canBuild(program.id, 'comfortable', sharedCapital);
        if (!affordable.ok) {
            this.gameScreen.toast(affordable.reason, 'coral');
            return;
        }
        this.pendingBuildLocation = { sectorId: target.sector.id, u: target.u, v: target.v };
        this.world.clearHover();
        this.buildModal.show(program, { lumen: this.charter.lumen + sharedCapital, works: this.charter.works });
    }

    finalizeBuild(name, finish = 'comfortable') {
        const charter = this.charter;
        if (!charter || !this.pendingBuildLocation) return { ok: false, error: 'Choose a free plot first.' };
        if (this.screenStateMachine.state !== GamePhase.PLAYING) return { ok: false, error: 'The day has already begun.' };
        const result = charter.build({
            programId: this.selectedProgramId,
            sectorId: this.pendingBuildLocation.sectorId,
            u: this.pendingBuildLocation.u,
            v: this.pendingBuildLocation.v,
            name,
            finish
        });
        if (!result.ok) return result;
        this.pendingBuildLocation = null;
        this.hintDismissed = true;
        this.syncViews();
        this.audio.play('build');
        this.gameScreen.toast(`${result.service.name} breaks ground — opens tomorrow.`, 'mint');
        this.saveGame();
        return { ok: true };
    }

    openRetrofit(service) {
        if (!this.charter) return false;
        this.retrofitModal.show(service);
        return true;
    }

    toggleMotion() {
        this.motion = this.motion === 'reduced' ? 'full' : 'reduced';
        writeMotion(this.motion);
        this.crowd?.setReducedMotion(this.motion === 'reduced');
        this.gameScreen?.updateHud?.(true);
        this.gameScreen?.toast?.(this.motion === 'reduced' ? 'Reduced motion on.' : 'Reduced motion off.', 'mint', 1800);
        return this.motion;
    }

    renameService(service, name) {
        if (!this.charter) return { ok: false, error: 'No charter.' };
        const result = this.charter.renameService(service, name);
        if (!result.ok) return result;
        this.saveGame();
        this.gameScreen.toast(`${result.name} it is.`, 'mint', 1600);
        return result;
    }

    repairService(service) {
        if (!this.charter) return { ok: false, error: 'No charter.' };
        const result = this.charter.repairService(service);
        if (!result.ok) return result;
        this.gameScreen.updateHud(true);
        this.saveGame();
        this.gameScreen.toast(`${service.name} is back in good repair.`, 'mint', 1800);
        return result;
    }

    showChapterDossier(chapterId) {
        const chapter = this.charter?.rivals.find((entry) => entry.id === chapterId);
        if (!chapter) return false;
        this.rivalDossier.show(chapter);
        return true;
    }

    openGridSummary() {
        this.gridSummary.show();
        return true;
    }

    openResidentRoster() {
        this.residentRoster.show();
        return true;
    }

    toggleContrast() {
        this.contrast = this.contrast === 'high' ? 'normal' : 'high';
        writeContrast(this.contrast);
        this.gameScreen?.updateHud?.(true);
        this.gameScreen?.toast?.(this.contrast === 'high' ? 'High contrast on.' : 'High contrast off.', 'mint', 1800);
        return this.contrast;
    }

    openMilestones() {
        this.milestones.show();
        return true;
    }

    openJournal() {
        this.journal.show();
        return true;
    }

    openLedger() {
        this.ledger.show();
        return true;
    }

    openNeedSurvey() {
        this.needSurvey.show();
        return true;
    }

    openCharterArchive() {
        this.charterArchive.show();
        return true;
    }

    openDepartureArchive() {
        this.departureArchive.show();
        return true;
    }

    openFieldGuide() {
        this.fieldGuide.show();
        return true;
    }

    openFloorPlan(service) {
        if (!this.charter || !service) return false;
        this.floorPlan.show(service);
        return true;
    }

    addFloor(service, planId = 'dormer') {
        if (!this.charter) return { ok: false, error: 'No charter.' };
        const result = this.charter.addFloor(service, planId);
        if (!result.ok) return result;
        this.crowd.sync();
        this.gameScreen.updateHud(true);
        this.saveGame();
        this.gameScreen.toast(`${service.name} rises to ${service.floors} floors · ${result.plan?.name || 'new floor'}.`, 'mint', 2200);
        return result;
    }

    setServiceFocus(service, focusId) {
        if (!this.charter) return { ok: false, error: 'No charter.' };
        const result = this.charter.setServiceFocus(service, focusId);
        if (!result.ok) return result;
        this.saveGame();
        this.gameScreen.toast(`${service.name} now leans ${result.focus.name.toLowerCase()}.`, 'mint', 1800);
        return result;
    }

    setServiceAccess(service, accessId) {
        if (!this.charter) return { ok: false, error: 'No charter.' };
        const result = this.charter.setServiceAccess(service, accessId);
        if (!result.ok) return result;
        this.gameScreen.updateHud(true);
        this.saveGame();
        this.gameScreen.toast(`${service.name} now welcomes ${accessId === 'open' ? 'everyone equally' : accessId === 'chapter' ? 'its chapter first' : 'visitors first'}.`, 'mint', 2000);
        return result;
    }

    setServiceVibe(service, vibeId) {
        if (!this.charter) return { ok: false, error: 'No charter.' };
        const result = this.charter.setServiceVibe(service, vibeId);
        if (!result.ok) return result;
        this.gameScreen.updateHud(true);
        this.saveGame();
        this.gameScreen.toast(`${service.name} feels more ${vibeId}.`, 'mint', 1800);
        return result;
    }

    setServiceHours(service, hoursId) {
        if (!this.charter) return { ok: false, error: 'No charter.' };
        const result = this.charter.setServiceHours(service, hoursId);
        if (!result.ok) return result;
        this.gameScreen.updateHud(true);
        this.saveGame();
        this.gameScreen.toast(`${service.name} switches to ${SERVICE_HOURS_BY_ID[hoursId]?.name || hoursId}.`, 'mint', 2000);
        return result;
    }

    upgradeService(service, moduleId) {
        if (!this.charter) return { ok: false, error: 'No charter.' };
        const result = this.charter.upgradeService(service, moduleId);
        if (!result.ok) return result;
        this.syncViews();
        this.gameScreen.updateHud(true);
        this.saveGame();
        this.gameScreen.toast(`${service.name} reopens with a grander finish.`, 'mint', 2200);
        return result;
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
        this.clearKeyboardCursor();
        this.audio.play('day');
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
        this.playbackPaused = false;
        this.crowd.preparePlayback(simulation.events);
        this.dayScreen.setSpeed(1);
        this.dayScreen.update({ day: this.charter.day, phase: DAY_PHASES[0].name, progress: 0 });
        this.screenStateMachine.setState(GamePhase.DAY);
        return true;
    }

    togglePhotoMode() {
        if (this.screenStateMachine.state !== GamePhase.PLAYING || this.hasBlockingModal()) return false;
        this.photoMode = !this.photoMode;
        document.body.classList.toggle('is-photo-mode', this.photoMode);
        this.gameScreen?.setPhotoMode?.(this.photoMode);
        if (this.photoMode) this.gameScreen?._setPauseOpen?.(false);
        return this.photoMode;
    }

    togglePlaybackPause() {
        if (this.screenStateMachine.state !== GamePhase.DAY || !this.playback) return false;
        this.playbackPaused = !this.playbackPaused;
        this.dayScreen.setPaused(this.playbackPaused);
        return this.playbackPaused;
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
        this.playbackPaused = false;
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
        this.crowd.sync();
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
        for (const trial of result.trialResults || []) {
            this.gameScreen.toast(trial.outcome === 'stayed' ? `${trial.name} passes the trial and stays.` : `${trial.name} leaves after the trial.`, trial.outcome === 'stayed' ? 'mint' : 'coral', 2400);
        }
        this.saveGame();
        return true;
    }

    showConfluence() {
        if (!this.charter?.confluenceReady) return false;
        this.screenStateMachine.setState(GamePhase.CONFLUENCE);
        return true;
    }

    showStewardship() {
        if (!this.charter?.ending?.confluence || this.charter.ending.outcome !== 'victory') return false;
        this.screenStateMachine.setState(GamePhase.STEWARDSHIP);
        return true;
    }

    chooseStewardship(policyId) {
        const policy = STEWARDSHIP_BY_ID[policyId];
        if (!policy || !this.charter?.ending?.confluence || this.charter.ending.outcome !== 'victory') return false;
        if (!this.charter.applyStewardship(policy)) return false;
        writeLegacy({ policyId, chapterName: this.charter.player.name, day: this.charter.day });
        this.finishCharter();
        return true;
    }

    archiveFinishedCharter() {
        if (!this.charter || this._archiveRecorded) return;
        recordMilestones(this.charter.milestones().filter((entry) => entry.done).map((entry) => entry.id));
        this._archiveRecorded = true;
        recordCharter(recordFromCharter(this.charter, this.endResult || this.charter.ending));
    }

    finishCharter() {
        if (!this.charter) return;
        this.endResult = this.charter.ending || { outcome: 'abandon' };
        this.archiveFinishedCharter();
        this.saveManager.clear();
        this.screenStateMachine.setState(GamePhase.END);
    }

    returnToMenu() {
        if (!this.charter) return false;
        this.saveGame();
        this.setWorldVisible(false);
        this.screenStateMachine.setState(GamePhase.MENU);
        return true;
    }

    setWorldVisible(visible) {
        if (this.world?.app?.view) this.world.app.view.style.visibility = visible ? 'visible' : 'hidden';
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
        this.archiveFinishedCharter();
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

    openResident(residentId) {
        if (!this.charter) return;
        const residents = [...this.charter.activeResidents, ...(this.charter.trialVisitors || [])];
        const index = residents.findIndex((resident) => resident.id === residentId);
        if (index === -1) return;
        this.residentCard.show(residents[index], index);
    }

    onPhaseChanged(phase, previous) {
        if (phase === GamePhase.MENU) this.setWorldVisible(false);
        if (phase !== GamePhase.PLAYING && this.photoMode) {
            this.photoMode = false;
            document.body.classList.remove('is-photo-mode');
            this.gameScreen?.setPhotoMode?.(false);
        }
        if (previous === GamePhase.DAY && phase !== GamePhase.DAY) {
            this.crowd.resetToPlanningPositions();
        }
        if (phase !== GamePhase.PLAYING) {
            this.buildModal.hide(false);
            this.serviceCard.hide();
            this.bulletinModal.hide();
            this.residentCard.hide();
            this.campaignModal.hide();
            this.commonsModal.hide();
            this.retrofitModal.hide();
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

    exportSave() {
        const text = this.saveManager.exportText();
        if (!text) {
            this.gameScreen?.toast('There is no charter to export yet.', 'coral');
            return false;
        }
        const blob = new Blob([text], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `falesc-save-day-${this.charter?.day || 1}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        this.gameScreen?.toast('Charter exported.', 'mint', 1800);
        return true;
    }

    importSave(text) {
        const result = this.saveManager.importText(text);
        if (!result.ok) return result;
        if (this.screenStateMachine.state !== GamePhase.MENU) this.disposeCharter();
        const loaded = this.continueCharter();
        if (!loaded) return { ok: false, error: 'The imported charter could not be loaded.' };
        return { ok: true };
    }

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
            this.charter?.commonsManager?.update(dt);
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
        const mood = [GamePhase.PLAYING, GamePhase.DAY, GamePhase.REPORT, GamePhase.CONFLUENCE, GamePhase.STEWARDSHIP, GamePhase.END].includes(state)
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
        if (!this.playback || this.playbackPaused) return;
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
        installDebugApi(this);
    }

}
