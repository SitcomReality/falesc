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
import { readDriftRank } from './persistence/DriftRank.js';
import { EndScreen } from './screens/EndScreen.js';
import { BuildModal } from './ui/service/BuildModal.js';
import { ServiceCardModal } from './ui/service/ServiceCardModal.js';
import { ServiceInteriorModal } from './ui/service/ServiceInteriorModal.js';
import { RetrofitModal } from './ui/service/RetrofitModal.js';
import { SERVICE_HOURS_BY_ID } from './services/ServicePolicies.js';
import { VisitorCardModal } from './ui/residents/VisitorCardModal.js';
import { FloorPlanModal } from './ui/service/FloorPlanModal.js';
import { FieldGuideModal } from './ui/charter/FieldGuideModal.js';
import { DepartureArchiveModal } from './ui/residents/DepartureArchiveModal.js';
import { CharterArchiveModal } from './ui/charter/CharterArchiveModal.js';
import { NeedSurveyModal } from './ui/charter/NeedSurveyModal.js';
import { CharterLedgerModal } from './ui/charter/CharterLedgerModal.js';
import { RivalDossierModal } from './ui/charter/RivalDossierModal.js';
import { CharterJournalModal } from './ui/charter/CharterJournalModal.js';
import { MilestonesModal } from './ui/charter/MilestonesModal.js';
import { ResidentRosterModal } from './ui/residents/ResidentRosterModal.js';
import { ServiceRosterModal } from './ui/service/ServiceRosterModal.js';
import { GridSummaryModal } from './ui/charter/GridSummaryModal.js';
import { recordCharter, recordFromCharter } from './persistence/CharterArchive.js';
import { recordMilestones } from './persistence/MilestoneArchive.js';
import { readMotion, writeMotion, applyMotion } from './settings/MotionPreference.js';
import { readContrast, writeContrast, applyContrast } from './settings/ContrastPreference.js';
import { readChartParams } from './settings/ChartLink.js';
import { BulletinModal } from './ui/charter/BulletinModal.js';
import { CampaignModal } from './ui/contest/CampaignModal.js';
import { CommonsModal } from './ui/contest/CommonsModal.js';
import { ResidentCardModal } from './ui/residents/ResidentCardModal.js';
import { OverlayManager } from './ui/OverlayManager.js';
import { Minimap } from './ui/chrome/Minimap.js';
import { ChatterManager } from './ui/chrome/ChatterManager.js';
import { SaveManager } from './persistence/SaveManager.js';
import { Soundscape } from './audio/Soundscape.js';
import { BUILDABLE_PROGRAMS, PROGRAM_BY_ID } from './design/programs.js';
import { DAY_PHASES, BALANCE } from './design/balance.js';
import { BuildingRenderer } from './buildings/BuildingRenderer.js';
import { installDebugApi } from './debug/DebugApi.js';
import * as DayPlayback from './app/DayPlayback.js';
import * as ServiceActions from './app/ServiceActions.js';
import * as SaveCommands from './app/SaveCommands.js';
import * as CommonsSession from './app/CommonsSession.js';
import * as CampaignSession from './app/CampaignSession.js';
import * as CharterLifecycle from './app/CharterLifecycle.js';
import { defaultProgramId } from './design/programs.js';
import { BuildCursor } from './controls/BuildCursor.js';

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
            chapterName: 'Home Chapter',
            chapterMotto: ''
        };
        const chartParams = readChartParams();
        if (chartParams.seed !== null) this.settings.mapSeed = chartParams.seed;
        if (chartParams.size) this.settings.mapSize = chartParams.size;
        if (chartParams.mode) this.settings.mode = chartParams.mode;
        if (chartParams.name) this.settings.chapterName = chartParams.name;
        if (chartParams.motto) this.settings.chapterMotto = chartParams.motto;
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
        this.serviceInterior = new ServiceInteriorModal({ overlays: this.overlays });
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
            onInterior: (service) => this.serviceInterior.show(service, this),
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
        this.serviceRoster = new ServiceRosterModal({
            game: this,
            overlays: this.overlays,
            onOpenService: (service) => this.serviceCard.show(service),
            onRepairService: (service) => this.repairService(service),
            onRepairAll: () => this.repairAllServices()
        });
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
        return CharterLifecycle.startCharter(this);
    }
    continueCharter() {
        return CharterLifecycle.continueCharter(this);
    }
    initializeWorld(seed, size) {
        return CharterLifecycle.initializeWorld(this, seed, size);
    }
    disposeCharter() {
        return CharterLifecycle.disposeCharter(this);
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
        return CommonsSession.showCommons(this);
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
        return CommonsSession.contributeCapital(this, amount);
    }
    contributePurse(amount) {
        return CommonsSession.contributePurse(this, amount);
    }
    nominateCommonsPolicy(policyId) {
        return CommonsSession.nominateCommonsPolicy(this, policyId);
    }
    callSecondReading() {
        return CommonsSession.callSecondReading(this);
    }
    resolveCommonsAssembly() {
        return CommonsSession.resolveCommonsAssembly(this);
    }
    upgradeCommons() {
        return CommonsSession.upgradeCommons(this);
    }
    contributeCommons(amount) {
        return CommonsSession.contributeCommons(this, amount);
    }

    showCampaign() {
        return CampaignSession.showCampaign(this);
    }
    sponsorCampaign(needId) {
        return CampaignSession.sponsorCampaign(this, needId);
    }
    chooseCampaignPledge(pledgeId) {
        return CampaignSession.chooseCampaignPledge(this, pledgeId);
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
        return ServiceActions.finalizeBuild(this, name, finish);
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
        return ServiceActions.renameService(this, service, name);
    }
    repairAllServices() {
        return ServiceActions.repairAllServices(this);
    }
    repairService(service) {
        return ServiceActions.repairService(this, service);
    }

    showChapterDossier(chapterId) {
        const chapter = this.charter?.rivals.find((entry) => entry.id === chapterId);
        if (!chapter) return false;
        this.rivalDossier.show(chapter);
        return true;
    }

    openServiceRoster() {
        this.serviceRoster.show();
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
        return ServiceActions.addFloor(this, service, planId);
    }
    setServiceFocus(service, focusId) {
        return ServiceActions.setServiceFocus(this, service, focusId);
    }
    setServiceAccess(service, accessId) {
        return ServiceActions.setServiceAccess(this, service, accessId);
    }
    setServiceVibe(service, vibeId) {
        return ServiceActions.setServiceVibe(this, service, vibeId);
    }
    setServiceHours(service, hoursId) {
        return ServiceActions.setServiceHours(this, service, hoursId);
    }
    upgradeService(service, moduleId) {
        return ServiceActions.upgradeService(this, service, moduleId);
    }
    dismantleService(service) {
        return ServiceActions.dismantleService(this, service);
    }
    reopenService(service) {
        return ServiceActions.reopenService(this, service);
    }

    /* ------------------------------------------------------------------ */
    /* Day playback                                                        */
    /* ------------------------------------------------------------------ */

    openDay() {
        return DayPlayback.openDay(this);
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
        return DayPlayback.togglePlaybackPause(this);
    }
    setPlaybackSpeed(speed) {
        return DayPlayback.setPlaybackSpeed(this, speed);
    }
    skipDay() {
        return DayPlayback.skipDay(this);
    }
    finishDayPlayback() {
        return DayPlayback.finishDayPlayback(this);
    }
    beginNextDay() {
        return DayPlayback.beginNextDay(this);
    }

    showConfluence() {
        return CampaignSession.showConfluence(this);
    }
    showStewardship() {
        return CampaignSession.showStewardship(this);
    }
    chooseStewardship(policyId) {
        return CampaignSession.chooseStewardship(this, policyId);
    }

    archiveFinishedCharter() {
        return CharterLifecycle.archiveFinishedCharter(this);
    }
    finishCharter() {
        return CharterLifecycle.finishCharter(this);
    }
    returnToMenu() {
        return CharterLifecycle.returnToMenu(this);
    }

    setWorldVisible(visible) {
        if (this.world?.app?.view) this.world.app.view.style.visibility = visible ? 'visible' : 'hidden';
    }

    endCharter(outcome = 'abandon') {
        return CharterLifecycle.endCharter(this, outcome);
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
        return SaveCommands.exportSave(this);
    }
    importSave(text) {
        return SaveCommands.importSave(this, text);
    }
    saveGame() {
        return SaveCommands.saveGame(this);
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
        return DayPlayback.updatePlayback(this, dt);
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
