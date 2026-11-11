import { BALANCE } from '../design/balance.js';
import { NEEDS } from '../design/needs.js';
import { PROGRAM_BY_ID, servesNeed, isOpenAt } from '../design/programs.js';
import { ResidentFactory } from '../residents/ResidentFactory.js';
import { spawnVisitors, rememberVisitors, clearVisitors, inviteVisitor, resolveTrialStays } from './VisitorLifecycle.js';
import { RETROFIT_BY_ID } from '../services/RetrofitModules.js';
import { SERVICE_HOURS_BY_ID } from '../services/ServicePolicies.js';
import { SERVICE_VIBE_BY_ID } from '../services/ServiceVibes.js';
import { SERVICE_ACCESS_BY_ID } from '../services/ServiceAccess.js';
import { SERVICE_FOCUS_BY_ID } from '../services/ServiceFocus.js';
import { FLOOR_PLAN_BY_ID } from '../services/FloorPlans.js';
import { finishFor, finishCost } from '../services/BuildingFinishes.js';
import { COMMONS_POLICY_BY_ID, applyCommonsPolicyToService, removeCommonsPolicyFromService } from '../commons/CommonsPolicies.js';
import { nominateForRival, petitionFor, resolveCommonsBallot } from '../commons/CommonsBallot.js';
import { ServiceManager, homeFloorFor } from '../services/ServiceManager.js';
import { computeAdjacency } from '../services/ServiceAdjacency.js';
import { cellKey } from '../services/PlacementPolicy.js';
import { LumenLedger } from '../economy/LumenLedger.js';
import { DaySimulator } from '../simulation/DaySimulator.js';
import { serializeCharter, restoreCharter } from '../persistence/CharterSerializer.js';
import { SeededRandom } from '../map/SeededRandom.js';
import { buildBulletin } from './Bulletin.js';
import { chooseCampaignPledge, createRivalChapters, planRivalDay } from '../chapters/RivalAI.js';
import { Campaign } from '../confluence/Campaign.js';
import { PLEDGE_BY_ID } from '../confluence/Pledges.js';
import { ConfluenceVote } from '../confluence/ConfluenceVote.js';
import * as CommonsAssembly from './CommonsAssembly.js';
import * as CommonsPurse from './CommonsPurse.js';
import * as CampaignRoom from './CampaignRoom.js';
import * as ServiceCommands from './ServiceCommands.js';
import * as CharterCast from './CharterCast.js';
import { milestones as charterMilestones, careWatch as charterCareWatch, needSurvey as charterNeedSurvey, standings as charterStandings, historyEntry as charterHistoryEntry, stats as charterStats } from './CharterProjections.js';

/**
 * A charter is the whole run: day, lumen, works, cast, services and the report
 * of the last day. It is plain data plus a handful of commands. The presentation
 * layer listens; it never owns the rules.
 */
export class Charter {
    constructor({ seed, mapSize = 'medium', mode = 'first-light', chapterName = null, chapterMotto = null, map = null, parentContainer = null, saved = null, legacy = null, startingLumenBonus = 0, startingBedBonus = 0, startingCommonsBonus = 0 }) {
        this.legacy = legacy || saved?.legacy || null;
        this.legacyNote = null;
        this.legacyBonus = this.legacy?.policyId === 'open_table'
            ? { amount: 1, programs: ['canteen', 'tea_house'] }
            : this.legacy?.policyId === 'garden_charter'
                ? { amount: 1, programs: ['garden_dome'] }
                : this.legacy?.policyId === 'workshop_charter'
                    ? { amount: 1, programs: ['workshop'] }
                : null;
        this.startingBedBonus = Math.max(0, Number(startingBedBonus) || 0);
        this.seed = seed;
        this.mapSize = mapSize;
        this.mode = mode;
        this.map = map;
        this.homeSector = map?.homeSector || null;
        this.name = cleanChapterName(chapterName || saved?.chapterName);
        this.motto = cleanMotto(chapterMotto || saved?.chapterMotto);
        this.occupancy = new Map();
        const playerLumen = (mode === 'contest' ? BALANCE.contest.startingLumen : BALANCE.startingLumen) + Math.max(0, Number(startingLumenBonus) || 0);
        this.player = {
            id: 'player',
            name: this.name,
            colour: '#FF6B5E',
            doctrine: 'balanced',
            isPlayer: true,
            lumen: playerLumen,
            works: BALANCE.worksPerDay,
            services: null,
            lastMove: null
        };
        this.playerChapter = this.player;
        this.services = new ServiceManager({
            map,
            parentContainer,
            chapter: this.player,
            occupancy: this.occupancy,
            idPrefix: 'player'
        });
        this.player.services = this.services;
        const outerIsles = mode === 'contest' || mode === 'open';
        this.commonsSector = outerIsles ? map.commonsSector : null;
        this.gardenSector = outerIsles ? map.gardenSector : null;
        if (map.commonsSector) map.commonsEnabled = outerIsles;
        if (map.gardenSector) map.gardenEnabled = outerIsles;
        this.transit = { home: null, commons: null, garden: null };
        this.commonsChapter = { id: 'commons', name: 'The Commons', colour: '#FFD36E', isPlayer: false };
        this.commonsManager = outerIsles
            ? new ServiceManager({
                map,
                parentContainer,
                chapter: this.commonsChapter,
                occupancy: this.occupancy,
                idPrefix: 'commons'
            })
            : null;
        this.visitors = [];
        this.returningVisitors = [];
        this.referrals = 0;
        this.lastReferralVisitors = 0;
        this.trialVisitors = [];
        this.lastTrialResults = [];
        this.visitorCell = null;
        this.commons = {
            target: BALANCE.commons.target,
            fund: Math.max(0, Number(startingCommonsBonus) || 0),
            purse: Math.max(0, Number(startingCommonsBonus) || 0),
            capital: 0,
            capitalContributors: {},
            active: false,
            level: 1,
            contributors: {},
            activatedDay: null,
            serviceId: null,
            policy: null,
            chosenDay: null,
            assembly: {
                stage: 'none',
                reading: 1,
                playerNomination: null,
                nominations: {},
                finalists: [],
                votes: [],
                counts: {},
                winnerId: null,
                petition: null,
                day: null
            }
        };
        this.rivals = [];
        this.lastRivalMoves = [];
        this.day = 1;
        this.dayLimit = mode === 'open' ? 999 : (BALANCE.dayLimits[mapSize] || BALANCE.dayLimits.medium);
        this.flourishing = 0;
        this.devotion = 0;
        this.report = null;
        this.lastReport = null;
        this.ending = null;
        this.confluenceReady = false;
        this.campaign = null;
        this.bulletin = null;
        this.history = [];
        this.journal = [];
        this.request = null;
        this.commonsCell = null;
        this.pendingArrivals = [];

        if (saved) {
            this.restore(saved);
            return;
        }

        this.roster = ResidentFactory.createRoster(seed, BALANCE.rosterSize);
        if (this.mode === 'contest') this.activateContestFounders();
        this.foundWelcomePost();
        if (this.mode === 'contest') {
            this.createRivals();
            this.lastRivalMoves = this.rivals.map((rival) => rival.lastMove).filter(Boolean);
        }
        if (this.commonsSector) {
            this.setupCommons();
            this.setupTransit();
        }
        if (this.legacy) this.applyLegacy();
        this.refreshAdjacency();
        this.assignHomes();
        this.refreshDerived();
        this.bulletin = this.buildBulletin([]);
        this.request = this.buildDailyRequest();
    }

    applyLegacy() {
        const policyId = this.legacy?.policyId;
        if (policyId === 'universal_care') {
            const welcome = this.player.services.services.find((service) => service.programId === 'housing' && service.fixed);
            if (welcome) welcome.capacity += 1;
            this.legacyNote = 'Universal Care: the Welcome House keeps one more bed.';
        } else if (policyId === 'open_table') {
            this.legacyBonus = { amount: 1, programs: ['canteen', 'tea_house'] };
            this.legacyNote = 'The Open Table: new canteens and tea houses keep one more seat.';
        } else if (policyId === 'commons_assembly') {
            this.commons.fund += 5;
            this.commons.purse += 5;
            this.legacyNote = 'The Commons Assembly: the Beacon fund and purse begin with 5 lumen.';
        } else if (policyId === 'garden_charter') {
            this.legacyBonus = { amount: 1, programs: ['garden_dome'] };
            this.legacyNote = 'The Garden Charter: new garden domes keep one more place.';
        } else if (policyId === 'workshop_charter') {
            this.legacyBonus = { amount: 1, programs: ['workshop'] };
            this.legacyNote = 'The Workshop Charter: new workshops keep one more bench.';
        }
    }

    static fromSave({ saved, map, parentContainer }) {
        return new Charter({
            seed: saved.seed,
            mapSize: saved.mapSize,
            mode: saved.mode || 'first-light',
            map,
            parentContainer,
            saved,
            legacy: saved.legacy || null
        });
    }

    get lumen() {
        return this.player?.lumen || 0;
    }

    set lumen(value) {
        if (this.player) this.player.lumen = Math.max(0, Math.trunc(value || 0));
    }

    get works() {
        return this.player?.works || 0;
    }

    set works(value) {
        if (this.player) this.player.works = Math.max(0, Math.trunc(value || 0));
    }

    get activeResidents() {
        return this.roster.filter((resident) => resident.active);
    }

    get presentResidents() {
        return [...this.activeResidents, ...this.visitors, ...this.trialVisitors];
    }

    get departedResidents() {
        return this.roster.filter((resident) => !resident.active && resident.state === 'departed');
    }

    get playerResidents() {
        return this.activeResidents.filter((resident) => resident.homeChapterId === 'player');
    }

    get allServices() {
        return [
            ...this.services.services,
            ...this.rivals.flatMap((rival) => rival.services.services),
            ...(this.commonsManager?.services || [])
        ];
    }

    get chapters() {
        return [this.playerChapter, ...this.rivals];
    }

    get contest() {
        return this.mode === 'contest';
    }

    get devotionByChapter() {
        const totals = Object.fromEntries(this.chapters.map((chapter) => [chapter.id, 0]));
        for (const resident of this.activeResidents) {
            for (const [chapterId, value] of Object.entries(resident.affinity)) {
                totals[chapterId] = (totals[chapterId] || 0) + value;
            }
        }
        return Object.fromEntries(Object.entries(totals).map(([id, value]) => [id, Math.round(value * 10) / 10]));
    }

    get playerDevotion() {
        return this.devotionByChapter.player || 0;
    }

    get population() {
        return this.activeResidents.length;
    }

    get housedResidents() {
        return this.playerResidents.filter((resident) => resident.homeServiceId && this.services.housingFor(resident));
    }

    get housedPopulation() {
        return this.housedResidents.length;
    }

    get housingCapacity() {
        return this.services.housingCapacity();
    }

    get spareBeds() {
        const trialBeds = this.trialVisitors.filter((resident) => resident.homeChapterId === 'player').length;
        return Math.max(0, this.services.spareHousing(this.playerResidents) - trialBeds);
    }

    get totalSpareBeds() {
        return this.chapters.reduce((sum, chapter) => {
            const residents = this.activeResidents.filter((resident) => resident.homeChapterId === chapter.id);
            return sum + chapter.services.spareHousing(residents);
        }, 0);
    }

    get wellbeing() {
        const residents = this.activeResidents;
        if (residents.length === 0) return 0;
        return Math.round((residents.reduce((sum, resident) => sum + resident.wellbeing, 0) / residents.length) * 10) / 10;
    }

    get projectedContributions() {
        return LumenLedger.projectedContributions(this);
    }

    get projectedUpkeep() {
        return LumenLedger.projectedUpkeep(this);
    }

    get projectedNet() {
        return LumenLedger.projectedNet(this);
    }

    get firstLightProgress() {
        return {
            population: this.housedPopulation,
            populationGoal: BALANCE.end.firstLightPopulation,
            flourishing: this.flourishing,
            flourishingGoal: BALANCE.end.comfortableFlourishing
        };
    }

    get goalsMet() {
        return this.housedPopulation >= BALANCE.end.firstLightPopulation
            && this.flourishing >= BALANCE.end.comfortableFlourishing;
    }

    activateContestFounders() {
        const target = BALANCE.contest.startingResidentsPerChapter * 3;
        for (const resident of this.roster) {
            if (this.activeResidents.length >= target) break;
            if (!resident.active) {
                resident.active = true;
                resident.state = 'idle';
            }
        }
    }

    startCampaign() {
        return CampaignRoom.startCampaign(this);
    }

    get campaignEvent() {
        return this.campaign?.eventFor?.(this.day) || null;
    }

    festivalKitchenNeed() {
        return CampaignRoom.festivalKitchenNeed(this);
    }
    updateFestivalKitchenNeed() {
        return CampaignRoom.updateFestivalKitchenNeed(this);
    }
    spawnFestivalKitchen() {
        return CampaignRoom.spawnFestivalKitchen(this);
    }
    removeFestivalKitchen() {
        return CampaignRoom.removeFestivalKitchen(this);
    }
    resolveConfluence(pledgeId) {
        return CampaignRoom.resolveConfluence(this, pledgeId);
    }
    applyStewardship(policy) {
        return CampaignRoom.applyStewardship(this, policy);
    }
    sponsorCampaign(needId) {
        return CampaignRoom.sponsorCampaign(this, needId);
    }
    setCampaignPledge(pledgeId) {
        return CampaignRoom.setCampaignPledge(this, pledgeId);
    }

    setupTransit() {
        if (!this.commonsSector) return;
        const home = this.findTransitCell(this.homeSector, this.commonsSector);
        const commons = this.findTransitCell(this.commonsSector, this.homeSector);
        if (!home || !commons) return;
        const garden = this.gardenSector ? this.findTransitCell(this.gardenSector, this.homeSector) : null;
        this.transit = {
            home: { sectorId: this.homeSector.id, ...home },
            commons: { sectorId: this.commonsSector.id, ...commons },
            garden: garden ? { sectorId: this.gardenSector.id, ...garden } : null
        };
        this.reserveTransit(this.transit.home);
        this.reserveTransit(this.transit.commons);
        this.reserveTransit(this.transit.garden);
    }

    findTransitCell(sector, other) {
        if (!sector || !other) return null;
        let best = null;
        for (let v = 0; v < sector.gridSize; v++) {
            for (let u = 0; u < sector.gridSize; u++) {
                if (this.services.isCellOccupied(sector.id, u, v)) continue;
                const point = sector._project(u + 0.5, v + 0.5);
                const distance = Math.hypot(point.x - other.centerX, point.y - other.centerY);
                if (!best || distance < best.distance) best = { u, v, distance };
            }
        }
        return best ? { u: best.u, v: best.v } : null;
    }

    reserveTransit(gate) {
        if (!gate) return;
        this.occupancy.set(cellKey(gate.sectorId, gate.u, gate.v), {
            isTransit: true,
            sectorId: gate.sectorId,
            u: gate.u,
            v: gate.v
        });
    }

    setupCommons() {
        if (!this.commonsManager || !this.homeSector) return null;
        const sector = this.homeSector;
        for (let v = 0; v < sector.gridSize; v++) {
            for (let u = 0; u < sector.gridSize; u++) {
                const result = this.commonsManager.place({
                    programId: 'commons_beacon',
                    sectorId: sector.id,
                    u,
                    v,
                    name: 'Commons Beacon',
                    state: 'PENDING',
                    fixed: true
                });
                if (result.ok) {
                    this.commons.serviceId = result.service.id;
                    return result.service;
                }
            }
        }
        return null;
    }

    contributeCommons(chapter, amount) {
        return CommonsAssembly.contributeCommons(this, chapter, amount);
    }
    contributeCapital(amount) {
        return CommonsAssembly.contributeCapital(this, amount);
    }
    contributePurse(amount) {
        return CommonsAssembly.contributePurse(this, amount);
    }
    callSecondReading() {
        return CommonsAssembly.callSecondReading(this);
    }
    nominateCommonsPolicy(policyId) {
        return CommonsAssembly.nominateCommonsPolicy(this, policyId);
    }
    resolveCommonsAssembly() {
        return CommonsAssembly.resolveCommonsAssembly(this);
    }
    chooseCommonsPolicy(policyId) {
        return CommonsAssembly.chooseCommonsPolicy(this, policyId);
    }
    upgradeCommons() {
        return CommonsAssembly.upgradeCommons(this);
    }
    activateCommons() {
        return CommonsAssembly.activateCommons(this);
    }

    createRivals() {
        this.rivals = createRivalChapters({
            map: this.map,
            parentContainer: this.services.parentContainer,
            occupancy: this.occupancy
        });
        const ids = this.chapters.map((chapter) => chapter.id);
        this.activeResidents.forEach((resident, index) => {
            resident.homeChapterId = ids[index % ids.length];
        });
    }

    chapterById(id) {
        return this.chapters.find((chapter) => chapter.id === id) || null;
    }

    serviceAt(sectorId, u, v) {
        return this.services.serviceAt(sectorId, u, v);
    }

    homeFor(resident) {
        if (!resident.homeServiceId) return null;
        for (const chapter of this.chapters) {
            const service = chapter.services?.findById?.(resident.homeServiceId);
            if (service && service.state === 'ACTIVE' && !service.closed) return service;
        }
        return null;
    }

    serviceLabel(service) {
        if (service.chapterId === 'commons') return service.name;
        return service.chapter?.isPlayer || !service.chapter
            ? service.name
            : `${service.chapter.name}'s ${service.name}`;
    }

    milestones() {
        return charterMilestones(this);
    }

    careWatch() {
        return charterCareWatch(this);
    }

    needSurvey() {
        return charterNeedSurvey(this);
    }

    standings() {
        return charterStandings(this);
    }

    foundWelcomePost() {
        return CharterCast.foundWelcomePost(this);
    }
    findStartingAnchor(sector) {
        return CharterCast.findStartingAnchor(this, sector);
    }
    findCommonsCell(sector) {
        return CharterCast.findCommonsCell(this, sector);
    }
    reconcileStaff() {
        return CharterCast.reconcileStaff(this);
    }
    assignStaff(service, residentId = null) {
        return CharterCast.assignStaff(this, service, residentId);
    }
    moveResidentHome(residentId, serviceId) {
        return CharterCast.moveResidentHome(this, residentId, serviceId);
    }
    assignHomes() {
        return CharterCast.assignHomes(this);
    }

    refreshAdjacency() {
        this.services.refreshAdjacency();
        for (const rival of this.rivals || []) rival.services.refreshAdjacency();
        this.commonsManager?.refreshAdjacency();
        this.refreshDistricts();
    }

    refreshDistricts() {
        const services = this.allServices;
        this.districtGroups = [];
        for (const service of services) {
            service.districtId = null;
            service.districtName = null;
            service.districtBonus = 0;
            service.districtSize = 0;
        }
        const byId = new Map(services.map((service) => [service.id, service]));
        const graph = new Map();
        for (const service of services) {
            graph.set(service.id, computeAdjacency(service, this.occupancy).neighbourIds.filter((id) => byId.has(id)));
        }
        const visited = new Set();
        const names = new Map();
        for (const service of services) {
            if (visited.has(service.id)) continue;
            const component = [];
            const queue = [service.id];
            visited.add(service.id);
            while (queue.length) {
                const id = queue.shift();
                const member = byId.get(id);
                if (!member) continue;
                component.push(member);
                for (const next of graph.get(id) || []) {
                    if (visited.has(next)) continue;
                    visited.add(next);
                    queue.push(next);
                }
            }
            if (component.length < 3) continue;
            const base = this.districtBaseName(component);
            const count = (names.get(base) || 0) + 1;
            names.set(base, count);
            const suffix = count === 1 ? '' : ` ${['I', 'II', 'III', 'IV', 'V', 'VI'][count - 1] || count}`;
            const id = `district-${service.id}-${component.length}`;
            const mixed = new Set(component.map((member) => member.chapterId)).size > 1;
            const bonus = Math.min(0.05, 0.02 + Math.max(0, component.length - 3) * 0.01 + (mixed ? 0.01 : 0));
            for (const member of component) {
                member.districtId = id;
                member.districtName = `${base}${suffix}`;
                member.districtBonus = Math.round(bonus * 100) / 100;
                member.districtSize = component.length;
            }
            const center = component.reduce((point, member) => ({
                x: point.x + (member.container?.x || 0),
                y: point.y + (member.container?.y || 0)
            }), { x: 0, y: 0 });
            this.districtGroups.push({
                id,
                name: `${base}${suffix}`,
                bonus: Math.round(bonus * 100) / 100,
                size: component.length,
                x: center.x / component.length,
                y: center.y / component.length,
                members: component.map((member) => member.id)
            });
        }
    }

    districtBaseName(component) {
        const chapters = new Set(component.map((service) => service.chapterId));
        if (chapters.size > 1) return 'The Commons';
        const counts = {};
        for (const service of component) counts[service.programId] = (counts[service.programId] || 0) + 1;
        const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
        if (top === 'housing') return 'Hearth Lane';
        if (top === 'canteen' || top === 'tea_house') return 'Long Table';
        if (top === 'garden_dome') return 'Lantern Row';
        if (top === 'bathhouse') return 'Steam Walk';
        return 'The Cluster';
    }

    refreshDerived() {
        this.flourishing = this.wellbeing;
        this.devotion = this.playerDevotion;
    }

    canBuild(programId, finish = 'comfortable', extraLumen = 0) {
        return ServiceCommands.canBuild(this, programId, finish, extraLumen);
    }
    build({ programId, sectorId, u, v, name, finish = 'comfortable' }) {
        return ServiceCommands.build(this, { programId, sectorId, u, v, name, finish });
    }
    renameService(service, name) {
        return ServiceCommands.renameService(this, service, name);
    }
    repairCost() {
        return ServiceCommands.repairCost(this);
    }
    repairAllServices() {
        return ServiceCommands.repairAllServices(this);
    }
    repairService(service) {
        return ServiceCommands.repairService(this, service);
    }
    setServiceFocus(service, focusId) {
        return ServiceCommands.setServiceFocus(this, service, focusId);
    }
    setServiceAccess(service, accessId) {
        return ServiceCommands.setServiceAccess(this, service, accessId);
    }
    setServiceVibe(service, vibeId) {
        return ServiceCommands.setServiceVibe(this, service, vibeId);
    }
    setServiceHours(service, hoursId) {
        return ServiceCommands.setServiceHours(this, service, hoursId);
    }
    upgradeService(service, moduleId = 'sunroom') {
        return ServiceCommands.upgradeService(this, service, moduleId);
    }
    addFloor(service, planId = 'dormer') {
        return ServiceCommands.addFloor(this, service, planId);
    }
    dismantle(service) {
        return ServiceCommands.dismantle(this, service);
    }
    reopen(service) {
        return ServiceCommands.reopen(this, service);
    }

    sharedWorkServices() {
        return (this.commonsManager?.services || [])
            .filter((service) => service.chapterId === 'commons' && service.id !== this.commons.serviceId);
    }

    sharedUpkeepTotal(includeClosed = false) {
        return this.sharedWorkServices()
            .filter((service) => includeClosed || (service.state === 'ACTIVE' && !service.closed))
            .reduce((sum, service) => sum + (this.commonsManager.upkeepFor(service) || 0), 0);
    }

    collectCommonsLevy() {
        return CommonsPurse.collectCommonsLevy(this);
    }
    settleCommonsPurse(report) {
        return CommonsPurse.settleCommonsPurse(this, report);
    }

    spawnVisitors() {
        return spawnVisitors(this);
    }

    rememberVisitors() {
        return rememberVisitors(this);
    }

    clearVisitors() {
        return clearVisitors(this);
    }

    inviteVisitor(visitorId) {
        return inviteVisitor(this, visitorId);
    }

    resolveTrialStays() {
        return resolveTrialStays(this);
    }

    openDay() {
        if (this.ending) return { report: this.lastReport, events: [] };
        this.refreshAdjacency();
        this.spawnVisitors();
        const simulation = new DaySimulator(this).run();
        this.settleCommonsPurse(simulation.report);
        this.lastReport = simulation.report;
        this.report = simulation.report;
        this.resolveDailyRequest(simulation.report);
        this.history.push(this.historyEntry(simulation.report));
        this.pendingArrivals = [];
        this.refreshDerived();
        return simulation;
    }

    beginNextDay() {
        if (this.ending) return { ended: true, ending: this.ending };
        if (this.confluenceReady) return { ended: true, confluence: true };
        this.lastTrialResults = this.resolveTrialStays();
        this.rememberVisitors();
        this.clearVisitors();
        this.day += 1;
        this.works = BALANCE.worksPerDay;
        this.updateFestivalKitchenNeed();
        this.collectCommonsLevy();
        const promoted = this.services.promoteUnderConstruction();
        for (const service of this.services.services) service.resetDaily();
        if (this.commonsManager) {
            this.commonsManager.promoteUnderConstruction();
            for (const service of this.commonsManager.services) service.resetDaily();
        }
        for (const rival of this.rivals) {
            rival.works = BALANCE.contest.rivalWorksPerDay;
            rival.services.promoteUnderConstruction();
            for (const service of rival.services.services) {
                service.resetDaily();
                if (service.condition < 50 && rival.lumen >= 3) {
                    rival.lumen -= 3;
                    service.condition = 100;
                }
            }
        }
        this.refreshAdjacency();
        this.assignHomes();
        this.request = this.buildDailyRequest();
        const arrivals = this.addArrivals();
        this.pendingArrivals = arrivals;
        const rivalMoves = this.rivals.flatMap((rival) => {
            const moves = [];
            for (let index = 0; index < rival.works; index++) {
                const move = planRivalDay(rival, this);
                if (!move) break;
                moves.push(move);
            }
            return moves;
        });
        this.lastRivalMoves = rivalMoves;
        if (this.contest && this.commons && !this.commons.active) {
            for (const rival of this.rivals) {
                if (rival.lumen >= BALANCE.commons.minRivalLumen) {
                    this.contributeCommons(rival, BALANCE.commons.rivalDaily);
                }
            }
        }
        this.lastCapitalGifts = [];
        if (this.contest && this.commons && this.commons.capital < 30) {
            for (const rival of this.rivals) {
                if (rival.lumen < BALANCE.commons.minRivalLumen) continue;
                rival.lumen -= 1;
                this.commons.capital += 1;
                this.commons.capitalContributors[rival.id] = (this.commons.capitalContributors[rival.id] || 0) + 1;
                this.lastCapitalGifts.push({ chapterId: rival.id, chapterName: rival.name });
            }
        }
        if (this.contest && !this.campaign && this.day >= this.dayLimit - BALANCE.campaign.days + 1) {
            this.startCampaign();
        }
        this.report = null;
        this.bulletin = this.buildBulletin(arrivals, rivalMoves);
        this.refreshDerived();
        return { day: this.day, promoted, arrivals, rivalMoves, trialResults: this.lastTrialResults, bulletin: this.bulletin };
    }

    addArrivals() {
        return CharterCast.addArrivals(this);
    }

    evaluateEnding(report) {
        if (this.mode === 'open') return null;
        if (this.ending) return this.ending;
        if (this.population < BALANCE.end.minPopulation) {
            this.ending = {
                outcome: 'defeat',
                day: this.day,
                title: 'The chapter empties.',
                message: 'Too few Tidelanders remain to keep the commons. The doors close one by one.'
            };
        } else if (this.contest) {
            if (this.day >= this.dayLimit) {
                this.confluenceReady = true;
                report.outcome = 'confluence';
                report.message = 'The day limit is here. The archipelago gathers for the Confluence; make one pledge and call the vote.';
                report.confluenceReady = true;
            }
        } else if (this.housedPopulation >= BALANCE.end.firstLightPopulation && this.flourishing >= BALANCE.end.comfortableFlourishing) {
            // First Light is a goal, not a survival timer: meeting both targets
            // closes the charter successfully, and the day limit is the deadline.
            this.ending = {
                outcome: 'victory',
                day: this.day,
                title: 'The commons holds.',
                message: `${this.housedPopulation} Tidelanders housed, a full larder, and a flourishing of ${this.flourishing}. The Confluence has something to celebrate.`
            };
        } else if (this.day >= this.dayLimit) {
            this.ending = {
                outcome: 'defeat',
                day: this.day,
                title: 'The charter closes.',
                message: `The chapter weathered ${this.day} days with ${this.population} residents and a flourishing of ${this.flourishing}. It was not enough for First Light.`
            };
        }
        if (this.ending) {
            report.outcome = this.ending.outcome;
            report.message = this.ending.message;
            report.ending = { ...this.ending };
        }
        return this.ending;
    }

    buildBulletin(arrivals = [], rivalMoves = this.lastRivalMoves || []) {
        return buildBulletin(this, arrivals, rivalMoves);
    }

    serialize() {
        return serializeCharter(this);
    }

    restore(saved) {
        return restoreCharter(this, saved);
    }

    buildDailyRequest() {
        const residents = this.activeResidents;
        if (residents.length === 0) return null;
        const rng = new SeededRandom(this.seed + this.day * 7919 + 31);
        const resident = residents[Math.floor(rng.next() * residents.length)];
        const need = NEEDS.reduce((best, entry) => ((resident.needs[entry.id] || 0) > (best?.value || -1) ? { need: entry, value: resident.needs[entry.id] || 0 } : best), null);
        if (!need) return null;
        return {
            day: this.day,
            residentId: resident.id,
            residentName: resident.name,
            needId: need.need.id,
            needName: need.need.name,
            needValue: Math.round(need.value),
            status: 'open',
            reward: 0
        };
    }

    resolveDailyRequest(report) {
        if (!this.request || this.request.status !== 'open') return;
        const resident = this.roster.find((entry) => entry.id === this.request.residentId);
        const met = (report.events || []).some((event) => event.residentId === this.request.residentId && event.needId === this.request.needId);
        this.request.status = met ? 'met' : 'missed';
        if (resident) {
            const delta = met ? 0.04 : -0.01;
            resident.addAffinity(delta, 'player');
            this.request.reward = delta;
        }
        this.log('request', met ? `${this.request.residentName}'s ${this.request.needName} request was met.` : `${this.request.residentName}'s ${this.request.needName} request went unmet.`);
        report.request = { ...this.request };
    }

    log(type, text) {
        this.journal.push({ day: this.day, type, text });
        if (this.journal.length > 120) this.journal.shift();
    }

    historyEntry(report) {
        return charterHistoryEntry(this, report);
    }

    stats() {
        return charterStats(this);
    }
}

function cleanMotto(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);
}

function cleanChapterName(value) {
    const cleaned = String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 32);
    return cleaned || 'Home Chapter';
}
