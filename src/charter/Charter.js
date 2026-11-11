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
import { ServiceManager } from '../services/ServiceManager.js';
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

/**
 * A charter is the whole run: day, lumen, works, cast, services and the report
 * of the last day. It is plain data plus a handful of commands. The presentation
 * layer listens; it never owns the rules.
 */
export class Charter {
    constructor({ seed, mapSize = 'medium', mode = 'first-light', chapterName = null, map = null, parentContainer = null, saved = null, legacy = null }) {
        this.legacy = legacy || saved?.legacy || null;
        this.legacyNote = null;
        this.legacyBonus = this.legacy?.policyId === 'open_table'
            ? { amount: 1, programs: ['canteen', 'tea_house'] }
            : this.legacy?.policyId === 'garden_charter'
                ? { amount: 1, programs: ['garden_dome'] }
                : null;
        this.seed = seed;
        this.mapSize = mapSize;
        this.mode = mode;
        this.map = map;
        this.homeSector = map?.homeSector || null;
        this.name = cleanChapterName(chapterName || saved?.chapterName);
        this.occupancy = new Map();
        const playerLumen = mode === 'contest' ? BALANCE.contest.startingLumen : BALANCE.startingLumen;
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
            fund: 0,
            purse: 0,
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
        if (!this.contest || this.campaign) return this.campaign;
        const campaign = new Campaign({
            startedDay: this.day,
            dayLimit: this.dayLimit,
            seed: this.seed
        });
        campaign.rivalPledges = Object.fromEntries(
            this.rivals.map((rival) => [rival.id, chooseCampaignPledge(rival, this, campaign)])
        );
        this.campaign = campaign;
        this.spawnFestivalKitchen();
        return this.campaign;
    }

    get campaignEvent() {
        return this.campaign?.eventFor?.(this.day) || null;
    }

    festivalKitchenNeed() {
        return this.campaign?.eventsFor?.(this.day)?.[0]?.need || 'sustenance';
    }

    updateFestivalKitchenNeed() {
        const service = this.services.services.find((entry) => entry.programId === 'festival_kitchen');
        if (!service || !this.campaign?.active) return false;
        service.setNeedOverride(this.festivalKitchenNeed());
        return true;
    }

    spawnFestivalKitchen() {
        if (this.services.services.some((service) => service.programId === 'festival_kitchen')) return null;
        const sector = this.homeSector;
        if (!sector) return null;
        for (let v = 0; v < sector.gridSize; v++) {
            for (let u = 0; u < sector.gridSize; u++) {
                const check = this.services.canPlace('festival_kitchen', sector.id, u, v);
                if (!check.ok) continue;
                const result = this.services.place({
                    programId: 'festival_kitchen',
                    sectorId: sector.id,
                    u,
                    v,
                    name: 'Festival Kitchen',
                    state: 'ACTIVE',
                    fixed: true
                });
                if (result.ok) {
                    result.service.festival = true;
                    result.service.setNeedOverride(this.festivalKitchenNeed());
                    this.log('campaign', 'A Festival Kitchen opened for the celebration.');
                    this.refreshDerived();
                    return result.service;
                }
            }
        }
        return null;
    }

    removeFestivalKitchen() {
        const service = this.services.services.find((entry) => entry.programId === 'festival_kitchen');
        if (!service) return false;
        this.services.remove(service);
        this.refreshDerived();
        return true;
    }

    resolveConfluence(pledgeId) {
        if (!this.confluenceReady) return null;
        const result = ConfluenceVote.tally(this, pledgeId);
        this.removeFestivalKitchen();
        this.confluenceReady = false;
        this.ending = result.ending;
        this.refreshDerived();
        return result;
    }

    applyStewardship(policy) {
        if (!policy || !this.ending?.confluence || this.ending.outcome !== 'victory') return false;
        this.stewardship = { ...policy };
        this.ending.stewardship = { ...policy };
        return true;
    }

    sponsorCampaign(needId) {
        if (!this.campaign?.active) return { ok: false, reason: 'There is no festival to sponsor.' };
        if (this.campaign.sponsored) return { ok: false, reason: 'Your chapter already sponsored a bell.' };
        if (this.lumen < 5) return { ok: false, reason: 'A sponsored bell costs 5 lumen.' };
        const event = this.campaign.sponsor(needId, this.day);
        if (!event) return { ok: false, reason: 'That needs a festival bell.' };
        this.lumen -= 5;
        this.refreshDerived();
        return { ok: true, event, cost: 5 };
    }

    setCampaignPledge(pledgeId) {
        if (!this.campaign?.active) return { ok: false, reason: 'The campaign has not started.' };
        if (!PLEDGE_BY_ID[pledgeId]) return { ok: false, reason: 'That is not a campaign promise.' };
        this.campaign.setPlayerPledge(pledgeId);
        this.log('campaign', `Campaign promise: ${this.campaign.playerPledgeName}.`);
        return { ok: true, campaign: this.campaign };
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
        if (!this.commonsManager || this.commons.active) return { ok: false, reason: 'The Commons is not taking contributions.' };
        const needed = Math.max(0, this.commons.target - this.commons.fund);
        const value = Math.max(0, Math.min(Math.trunc(amount), chapter?.lumen || 0, needed));
        if (!value) return { ok: false, reason: 'No lumen to give.' };
        chapter.lumen -= value;
        this.commons.fund += value;
        this.commons.contributors[chapter.id] = (this.commons.contributors[chapter.id] || 0) + value;
        let activated = false;
        if (this.commons.fund >= this.commons.target) {
            activated = this.activateCommons();
        }
        return { ok: true, activated, fund: this.commons.fund, active: this.commons.active };
    }

    contributeCapital(amount) {
        const value = Math.max(0, Math.min(Math.trunc(amount), this.player.lumen));
        if (!value) return { ok: false, reason: 'No lumen to give.' };
        this.player.lumen -= value;
        this.commons.capital += value;
        this.refreshDerived();
        return { ok: true, capital: this.commons.capital, gave: value };
    }

    contributePurse(amount) {
        const value = Math.max(0, Math.min(Math.trunc(amount), this.player.lumen));
        if (!value) return { ok: false, reason: 'No lumen to give.' };
        this.player.lumen -= value;
        this.commons.purse += value;
        if (this.commons.purse >= this.sharedUpkeepTotal(true)) {
            for (const service of this.sharedWorkServices()) service.closed = false;
        }
        this.refreshDerived();
        return { ok: true, purse: this.commons.purse, gave: value };
    }

    callSecondReading() {
        if (!this.commons.active) return { ok: false, reason: 'Light the Beacon first.' };
        if (!this.commons.policy) return { ok: false, reason: 'The first reading has not finished.' };
        if (this.commons.assembly.reading >= 2) return { ok: false, reason: 'The commons has already held its second reading.' };
        if (this.commons.assembly.stage !== 'resolved') return { ok: false, reason: 'The first reading is still open.' };
        if (this.day <= (this.commons.chosenDay || this.day)) return { ok: false, reason: 'Let the chosen policy stand for one full day first.' };
        this.commons.assembly = {
            ...this.commons.assembly,
            stage: 'nominations',
            reading: 2,
            playerNomination: null,
            nominations: {},
            finalists: [],
            votes: [],
            counts: {},
            winnerId: null,
            petition: petitionFor(this.activeResidents),
            day: this.day
        };
        return { ok: true, policy: COMMONS_POLICY_BY_ID[this.commons.policy], assembly: this.commons.assembly };
    }

    nominateCommonsPolicy(policyId) {
        if (!this.commons.active) return { ok: false, reason: 'Light the Beacon before calling an assembly.' };
        if (this.commons.policy && this.commons.assembly.reading < 2) return { ok: false, reason: 'The assembly has already chosen.' };
        if (this.commons.assembly.stage !== 'nominations') return { ok: false, reason: 'Nominations are closed.' };
        const policy = COMMONS_POLICY_BY_ID[policyId];
        if (!policy) return { ok: false, reason: 'That is not a Commons policy.' };
        const nominations = { player: policy.id };
        for (const rival of this.rivals) nominations[rival.id] = nominateForRival(rival);
        const petition = this.commons.assembly.petition || petitionFor(this.activeResidents);
        const finalists = [...new Set([...Object.values(nominations), petition?.policyId].filter(Boolean))];
        this.commons.assembly = {
            ...this.commons.assembly,
            stage: 'ballot',
            playerNomination: policy.id,
            nominations,
            finalists,
            votes: [],
            counts: {},
            winnerId: null,
            petition,
            day: this.day
        };
        return { ok: true, policy, nominations, finalists };
    }

    resolveCommonsAssembly() {
        if (!this.commons.active) return { ok: false, reason: 'Light the Beacon first.' };
        if (this.commons.policy && this.commons.assembly.reading < 2) return { ok: false, reason: 'The assembly has already chosen.' };
        if (this.commons.assembly.stage !== 'ballot') return { ok: false, reason: 'There is no ballot to call.' };
        const result = resolveCommonsBallot(this.activeResidents, this.commons.assembly.finalists);
        if (!result.winnerId) return { ok: false, reason: 'No one voted.' };
        const chosen = this.chooseCommonsPolicy(result.winnerId);
        if (!chosen.ok) return chosen;
        this.commons.assembly.stage = 'resolved';
        this.commons.assembly.votes = result.votes;
        this.commons.assembly.counts = result.counts;
        this.commons.assembly.winnerId = result.winnerId;
        this.log('commons', `The Commons Assembly chose ${chosen.policy.name}.`);
        return { ok: true, policy: chosen.policy, result };
    }

    chooseCommonsPolicy(policyId) {
        if (!this.commons.active) return { ok: false, reason: 'Light the Beacon before calling an assembly.' };
        if (this.commons.policy && this.commons.assembly.reading < 2) return { ok: false, reason: 'The assembly has already chosen.' };
        const policy = COMMONS_POLICY_BY_ID[policyId];
        if (!policy) return { ok: false, reason: 'That is not a Commons policy.' };
        this.commons.policy = policy.id;
        this.commons.chosenDay = this.day;
        if (this.commons.assembly.stage !== 'resolved') {
            this.commons.assembly.stage = 'resolved';
            this.commons.assembly.winnerId = policy.id;
        }
        for (const chapter of this.chapters) {
            for (const service of chapter.services.services) {
                removeCommonsPolicyFromService(service);
                applyCommonsPolicyToService(service, policy.id);
            }
        }
        for (const service of this.commonsManager?.services || []) {
            removeCommonsPolicyFromService(service);
            applyCommonsPolicyToService(service, policy.id);
        }
        this.assignHomes();
        this.refreshDerived();
        return { ok: true, policy };
    }

    upgradeCommons() {
        if (!this.commons.active) return { ok: false, reason: 'Light the Beacon first.' };
        if ((this.commons.level || 1) >= BALANCE.commons.annexMax) return { ok: false, reason: 'The Beacon already has both annexes.' };
        if ((this.commons.capital || 0) < BALANCE.commons.annexCost) return { ok: false, reason: `An annex costs ${BALANCE.commons.annexCost} capital.` };
        const service = this.commonsManager?.findById(this.commons.serviceId);
        if (!service) return { ok: false, reason: 'The Beacon is not standing.' };
        this.commons.capital -= BALANCE.commons.annexCost;
        this.commons.level = (this.commons.level || 1) + 1;
        service.capacity += BALANCE.commons.annexCapacity;
        service.refreshGraphics();
        this.refreshDerived();
        this.log('commons', `The Beacon gained annex ${this.commons.level}.`);
        return { ok: true, level: this.commons.level, capacity: service.capacity, cost: BALANCE.commons.annexCost };
    }

    activateCommons() {
        if (!this.commonsManager || this.commons.active) return false;
        const service = this.commonsManager.findById(this.commons.serviceId);
        if (!service) return false;
        service.state = 'ACTIVE';
        service.daysRemaining = 0;
        service.refreshGraphics();
        this.commons.active = true;
        this.commons.activatedDay = this.day;
        if (this.commons.assembly.stage === 'none') this.commons.assembly.stage = 'nominations';
        if (!this.commons.assembly.petition) this.commons.assembly.petition = petitionFor(this.activeResidents);
        this.log('commons', 'The Commons Beacon was lit.');
        return true;
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
        const services = this.allServices;
        const open = services.filter((service) => service.state === 'ACTIVE' && !service.closed);
        const needIds = NEEDS.map((need) => need.id);
        return [
            { id: 'first_build', label: 'Raise a service', done: this.services.services.some((service) => !service.fixed) },
            { id: 'all_needs', label: 'Serve all four needs', done: needIds.every((needId) => open.some((service) => servesNeed(service.program, needId))) },
            { id: 'six_housed', label: 'House six Tidelanders', done: this.housedPopulation >= 6 },
            { id: 'full_house', label: 'House twelve Tidelanders', done: this.housedPopulation >= 12 },
            { id: 'flourishing', label: 'Reach a flourishing of 62', done: this.flourishing >= BALANCE.end.comfortableFlourishing },
            { id: 'district', label: 'Form a named district', done: (this.districtGroups || []).length > 0 },
            { id: 'floor', label: 'Add an upper floor', done: services.some((service) => (service.floorPlans || []).length > 0) },
            { id: 'module', label: 'Install a retrofit module', done: services.some((service) => (service.retrofits || []).length > 0) },
            { id: 'beacon', label: 'Light the Commons Beacon', done: Boolean(this.commons?.active) },
            { id: 'assembly', label: 'Hold a Commons Assembly', done: Boolean(this.commons?.policy) },
            { id: 'annex', label: 'Add a Beacon annex', done: (this.commons?.level || 1) > 1 },
            { id: 'visitor', label: 'Welcome a trial guest', done: this.roster.some((resident) => resident.memory?.trialStartDay) },
            { id: 'garden', label: 'Build on the garden isle', done: services.some((service) => service.sector?.garden) }
        ];
    }

    careWatch() {
        const residents = this.activeResidents.filter((resident) => {
            const urgent = NEEDS.some((need) => (resident.needs[need.id] || 0) >= 85);
            return urgent || resident.wellbeing < 30 || (resident.memory?.homelessDays || 0) > 0;
        });
        return { count: residents.length, residents };
    }

    needSurvey() {
        const residents = this.activeResidents;
        return NEEDS.map((need) => {
            const total = residents.reduce((sum, resident) => sum + (resident.needs[need.id] || 0), 0);
            const urgent = residents.filter((resident) => (resident.needs[need.id] || 0) >= 65).length;
            const services = this.allServices.filter((service) => service.state === 'ACTIVE' && !service.closed && servesNeed(service.program, need.id));
            return {
                id: need.id,
                name: need.name,
                colour: need.color,
                average: residents.length ? total / residents.length : 0,
                urgent,
                services: services.length,
                capacity: services.reduce((sum, service) => sum + service.capacity, 0)
            };
        });
    }

    standings() {
        const devotion = this.devotionByChapter;
        const patronage = this.lastReport?.patronageByChapter || {};
        return this.chapters.map((chapter) => ({
            id: chapter.id,
            name: chapter.name,
            colour: chapter.colour,
            isPlayer: Boolean(chapter.isPlayer),
            devotion: devotion[chapter.id] || 0,
            visits: patronage[chapter.id] || 0,
            residents: this.activeResidents.filter((resident) => resident.homeChapterId === chapter.id).length,
            lumen: chapter.lumen,
            upkeep: chapter.services.totalUpkeep(),
            plan: chapter.plan
                ? { ...chapter.plan, saving: chapter.lumen < (chapter.plan.cost || 0) }
                : null
        }));
    }

    foundWelcomePost() {
        const sector = this.homeSector;
        if (!sector) return;
        const anchor = this.findStartingAnchor(sector);
        if (!anchor) return;
        const result = this.services.place({
            programId: 'housing',
            sectorId: sector.id,
            u: anchor.u,
            v: anchor.v,
            name: 'Welcome Post',
            state: 'ACTIVE',
            capacityOverride: this.contest ? 4 : 6,
            fixed: true
        });
        this.welcomePost = result.ok ? result.service : null;
        this.commonsCell = this.findCommonsCell(sector);
    }

    findStartingAnchor(sector) {
        const program = PROGRAM_BY_ID.housing;
        const center = Math.floor((sector.gridSize - 1) / 2);
        const candidates = [
            { u: center, v: center },
            { u: center - 1, v: center },
            { u: center, v: center - 1 },
            { u: center + 1, v: center },
            { u: center, v: center + 1 }
        ];
        for (const candidate of candidates) {
            const check = this.services.canPlace(program.id, sector.id, candidate.u, candidate.v);
            if (check.ok) return candidate;
        }
        return null;
    }

    findCommonsCell(sector) {
        const center = Math.floor(sector.gridSize / 2);
        for (let radius = 0; radius < sector.gridSize; radius++) {
            for (let dv = -radius; dv <= radius; dv++) {
                for (let du = -radius; du <= radius; du++) {
                    const u = center + du;
                    const v = center + dv;
                    if (u < 0 || v < 0 || u >= sector.gridSize || v >= sector.gridSize) continue;
                    if (!this.services.isCellOccupied(sector.id, u, v)) return { u, v };
                }
            }
        }
        return { u: center, v: center };
    }

    assignHomes() {
        for (const resident of this.activeResidents) {
            const home = this.homeFor(resident);
            if (home) continue;
            const preferred = this.chapterById(resident.homeChapterId) || this.player;
            if (preferred.services.assignHome(resident, this.roster)) {
                resident.homeChapterId = preferred.id;
                continue;
            }
            for (const chapter of this.chapters) {
                if (chapter === preferred) continue;
                if (chapter.services.assignHome(resident, this.roster)) {
                    resident.homeChapterId = chapter.id;
                    break;
                }
            }
            if (!this.homeFor(resident)) resident.homeServiceId = null;
        }
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
        const program = PROGRAM_BY_ID[programId];
        if (!program || !program.buildable) return { ok: false, reason: 'That program is not available in this charter.' };
        if (this.works <= 0) return { ok: false, reason: 'No works left today. Open the day to reset them.' };
        const cost = finishCost(program, finish);
        if (this.lumen + extraLumen < cost) {
            return { ok: false, reason: `Need ${cost - this.lumen - extraLumen} more lumen.` };
        }
        return { ok: true };
    }

    build({ programId, sectorId, u, v, name, finish = 'comfortable' }) {
        const program = PROGRAM_BY_ID[programId];
        const sector = this.map.sectors.find((entry) => entry.id === sectorId);
        const shared = Boolean(sector?.commons && this.commonsManager);
        const capital = shared ? this.commons.capital : 0;
        const affordable = this.canBuild(programId, finish, capital);
        if (!affordable.ok) return affordable;
        const finishOption = finishFor(finish);
        const cost = finishCost(program, finish);
        const funded = Math.min(capital, cost);
        const resolvedName = !name || name === programId ? program.name : name;
        const manager = shared ? this.commonsManager : this.services;
        const result = manager.place({
            programId,
            sectorId,
            u,
            v,
            name: resolvedName,
            state: 'PENDING',
            finish: finishOption.id
        });
        if (!result.ok) return result;
        if (shared) result.service.builderChapterId = 'player';
        result.service.capacity = Math.max(1, result.service.capacity + finishOption.capacityDelta);
        result.service.upkeepBonus = (result.service.upkeepBonus || 0) + finishOption.upkeepDelta;
        if (!shared && this.legacyBonus?.programs.includes(programId)) {
            result.service.capacity += this.legacyBonus.amount;
        }
        if (shared) this.commons.capital -= funded;
        this.lumen -= (cost - funded);
        this.works -= 1;
        applyCommonsPolicyToService(result.service, this.commons?.policy);
        this.refreshAdjacency();
        this.assignHomes();
        this.refreshDerived();
        this.log('build', `${resolvedName} broke ground${shared ? ' on the commons' : sector?.garden ? ' on the garden isle' : ''}.`);
        return { ...result, cost, funded };
    }

    renameService(service, name) {
        if (!service || (service.chapterId && service.chapterId !== 'player')) {
            return { ok: false, error: "A rival chapter's service cannot be renamed." };
        }
        const cleaned = String(name ?? '').replace(/\s+/g, ' ').trim().slice(0, 32);
        if (!cleaned) return { ok: false, error: 'Give the service a name first.' };
        service.name = cleaned;
        service.refreshGraphics();
        this.refreshDerived();
        return { ok: true, name: cleaned };
    }

    repairCost() {
        const policy = COMMONS_POLICY_BY_ID[this.commons?.policy];
        return Math.max(1, 3 - (policy?.repairDiscount || 0));
    }

    repairAllServices() {
        let count = 0;
        let spent = 0;
        for (const service of this.services.services) {
            if (service.condition >= 100) continue;
            const cost = this.repairCost();
            if (this.lumen < cost) break;
            this.lumen -= cost;
            spent += cost;
            count += 1;
            service.condition = 100;
            service.refreshGraphics();
        }
        if (count > 0) this.refreshDerived();
        return { ok: count > 0, count, spent };
    }

    repairService(service) {
        if (!service || (service.chapterId && service.chapterId !== 'player')) {
            return { ok: false, error: "A rival chapter's service cannot be repaired." };
        }
        if (service.condition >= 100) return { ok: false, error: 'This service is already in good repair.' };
        const cost = this.repairCost();
        if (this.lumen < cost) return { ok: false, error: `A repair costs ${cost} lumen.` };
        this.lumen -= cost;
        service.condition = 100;
        service.refreshGraphics();
        this.refreshDerived();
        return { ok: true, cost, condition: service.condition };
    }

    setServiceFocus(service, focusId) {
        const focus = SERVICE_FOCUS_BY_ID[focusId];
        if (!focus) return { ok: false, error: 'That is not a focus.' };
        if (!service || service.state !== 'ACTIVE' || service.closed) {
            return { ok: false, error: 'Only an open, working service can choose a focus.' };
        }
        if (!service.program?.secondaryNeed) return { ok: false, error: 'This service already has one purpose.' };
        service.policy = { ...(service.policy || {}), focus: focus.id };
        service.refreshGraphics();
        this.refreshDerived();
        return { ok: true, focus };
    }

    setServiceAccess(service, accessId) {
        if (!service || (service.chapterId && service.chapterId !== 'player')) {
            return { ok: false, error: "A rival chapter's access cannot be changed." };
        }
        if (service.fixed) return { ok: false, error: 'The Welcome Post keeps its own welcome.' };
        if (service.state !== 'ACTIVE' || service.closed) {
            return { ok: false, error: 'Only an open service can change access.' };
        }
        if (!SERVICE_ACCESS_BY_ID[accessId]) return { ok: false, error: 'Unknown access policy.' };
        service.policy = { ...(service.policy || {}), access: accessId };
        service.refreshGraphics();
        this.refreshDerived();
        return { ok: true, service, access: accessId };
    }

    setServiceVibe(service, vibeId) {
        if (!service || (service.chapterId && service.chapterId !== 'player')) {
            return { ok: false, error: "A rival chapter's atmosphere cannot be changed." };
        }
        if (service.fixed) return { ok: false, error: 'The Welcome Post keeps its own atmosphere.' };
        if (service.state !== 'ACTIVE' || service.closed) {
            return { ok: false, error: 'Only an open service can change atmosphere.' };
        }
        if (!SERVICE_VIBE_BY_ID[vibeId]) return { ok: false, error: 'Unknown service atmosphere.' };
        service.policy = { ...(service.policy || {}), vibe: vibeId };
        service.refreshGraphics();
        this.refreshDerived();
        return { ok: true, service, vibe: vibeId };
    }

    setServiceHours(service, hoursId) {
        if (!service || (service.chapterId && service.chapterId !== 'player')) {
            return { ok: false, error: "A rival chapter's hours cannot be changed." };
        }
        if (service.fixed || service.programId === 'housing') {
            return { ok: false, error: 'Housing keeps the charter hours.' };
        }
        if (service.state !== 'ACTIVE' || service.closed) {
            return { ok: false, error: 'Only an open service can change hours.' };
        }
        if (!SERVICE_HOURS_BY_ID[hoursId]) return { ok: false, error: 'Unknown service hours.' };
        service.policy = { ...(service.policy || {}), hours: hoursId };
        service.refreshGraphics();
        this.refreshDerived();
        return { ok: true, service, hours: hoursId };
    }

    upgradeService(service, moduleId = 'sunroom') {
        if (!service || service.chapterId && service.chapterId !== 'player') {
            return { ok: false, error: "A rival chapter's service cannot be retrofitted." };
        }
        if (service.fixed) return { ok: false, error: 'The Welcome Post is already part of the charter.' };
        if (service.state !== 'ACTIVE' || service.closed) {
            return { ok: false, error: 'Only an open, working service can be retrofitted.' };
        }
        const installed = service.retrofits;
        if (installed.includes(moduleId)) return { ok: false, error: 'That module is already installed.' };
        if (installed.length >= 2) return { ok: false, error: 'This service already has two retrofit modules.' };
        const module = RETROFIT_BY_ID[moduleId];
        if (!module) return { ok: false, error: 'Unknown retrofit module.' };
        if (this.lumen < module.cost) {
            return { ok: false, error: `The ${module.name} retrofit costs ${module.cost} lumen.` };
        }
        this.lumen -= module.cost;
        service.level = 2;
        service.retrofitId = module.id;
        service.capacity += module.capacity;
        service.qualityBonus = (service.qualityBonus || 0) + module.quality;
        service.upkeepBonus = (service.upkeepBonus || 0) + module.upkeep;
        service.finish = 'grand';
        service.modules = [...(service.modules || []), `retrofit:${module.id}`];
        service.refreshGraphics();
        this.refreshDerived();
        return { ok: true, service, module, cost: module.cost };
    }

    addFloor(service, planId = 'dormer') {
        if (!service || (service.chapterId && service.chapterId !== 'player')) {
            return { ok: false, error: "A rival chapter's service cannot grow." };
        }
        if (service.fixed) return { ok: false, error: 'The Welcome Post is already part of the charter.' };
        if (service.state !== 'ACTIVE' || service.closed) {
            return { ok: false, error: 'Only an open, working service can add a floor.' };
        }
        if (service.floors >= BALANCE.floors.max) return { ok: false, error: 'This service already has three floors.' };
        const plan = FLOOR_PLAN_BY_ID[planId] || FLOOR_PLAN_BY_ID.dormer;
        if (this.lumen < plan.cost) {
            return { ok: false, error: `A floor costs ${plan.cost} lumen.` };
        }
        this.lumen -= plan.cost;
        service.floors += 1;
        service.floorPlans = [...(service.floorPlans || []), plan.id];
        service.capacity += service.programId === 'housing' ? plan.housingCapacity : plan.serviceCapacity;
        service.qualityBonus = (service.qualityBonus || 0) + plan.quality;
        service.upkeepBonus = (service.upkeepBonus || 0) + plan.upkeep;
        service.refreshGraphics();
        this.assignHomes();
        this.refreshDerived();
        return { ok: true, service, cost: plan.cost, plan };
    }

    dismantle(service) {
        if (!service) return { ok: false, reason: 'That service is already gone.' };
        if (service.chapterId && service.chapterId !== 'player') {
            return { ok: false, reason: "A rival chapter's service cannot be dismantled." };
        }
        if (service.fixed) return { ok: false, reason: 'The Welcome Post cannot be dismantled.' };
        const cost = finishCost(service.program, service.finish);
        const refund = Math.max(1, Math.floor(cost / 2));
        const removed = this.services.remove(service);
        if (!removed) return { ok: false, reason: 'That service could not be dismantled.' };
        this.lumen += refund;
        this.refreshAdjacency();
        for (const resident of this.activeResidents) {
            if (resident.homeServiceId === service.id) resident.homeServiceId = null;
        }
        this.assignHomes();
        this.refreshDerived();
        return { ok: true, refund, name: service.name };
    }

    reopen(service) {
        if (!service || !service.closed) return { ok: false, reason: 'That service is already open.' };
        if (service.chapterId && service.chapterId !== 'player') {
            return { ok: false, reason: "A rival chapter's service is not yours to reopen." };
        }
        const cost = this.services.reopenCost(service);
        if (this.lumen < cost) return { ok: false, reason: `Need ${cost - this.lumen} more lumen to reopen.` };
        this.lumen -= cost;
        service.reopen();
        return { ok: true, cost };
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
        if (this.sharedWorkServices().length === 0) return { collected: 0 };
        let collected = 0;
        for (const chapter of this.chapters) {
            if (chapter.lumen < BALANCE.commons.levyPerChapter) continue;
            chapter.lumen -= BALANCE.commons.levyPerChapter;
            collected += BALANCE.commons.levyPerChapter;
        }
        this.commons.purse += collected;
        if (this.commons.purse >= this.sharedUpkeepTotal(true)) {
            for (const service of this.sharedWorkServices()) service.closed = false;
        }
        return { collected, purse: this.commons.purse };
    }

    settleCommonsPurse(report) {
        if (this.sharedWorkServices().length === 0) return;
        const services = this.sharedWorkServices().filter((service) => service.state === 'ACTIVE' && !service.closed);
        const upkeep = services.reduce((sum, service) => sum + (this.commonsManager.upkeepFor(service) || 0), 0);
        const purseBefore = this.commons.purse;
        report.commonsPurseBefore = purseBefore;
        report.commonsUpkeep = upkeep;
        report.commonsClosed = [];
        if (services.length === 0 || upkeep <= 0) {
            report.commonsPurse = this.commons.purse;
            return;
        }
        if (this.commons.purse >= upkeep) {
            this.commons.purse -= upkeep;
            report.commonsPurse = this.commons.purse;
            report.commonsSpent = upkeep;
            return;
        }
        for (const service of services) {
            service.closed = true;
            report.commonsClosed.push({ id: service.id, name: service.name });
        }
        this.commons.purse = 0;
        report.commonsPurse = 0;
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
        const rivalMoves = this.rivals.map((rival) => planRivalDay(rival, this)).filter(Boolean);
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
        if (this.flourishing < BALANCE.arrivals.minFlourishing) return [];
        const waiting = this.roster.filter((resident) => !resident.active && !resident.memory.departure);
        if (waiting.length === 0) return [];
        const devotion = this.devotionByChapter;
        const candidates = this.chapters
            .map((chapter) => {
                const residents = this.activeResidents.filter((resident) => resident.homeChapterId === chapter.id);
                return {
                    chapter,
                    residents: residents.length,
                    spare: chapter.services.spareHousing(residents),
                    devotion: devotion[chapter.id] || 0
                };
            })
            .filter((entry) => entry.spare > 0)
            .sort((a, b) => a.residents - b.residents || b.devotion - a.devotion || b.spare - a.spare);
        if (candidates.length === 0) return [];
        const capacity = candidates.reduce((sum, entry) => sum + entry.spare, 0);
        const count = Math.min(BALANCE.arrivals.perDay, capacity, waiting.length);
        const arrivals = [];
        for (let index = 0; index < count; index++) {
            const resident = waiting[index];
            const target = candidates.find((entry) => entry.spare > 0);
            if (!target) break;
            resident.active = true;
            resident.state = 'idle';
            resident.homeChapterId = target.chapter.id;
            target.chapter.services.assignHome(resident, this.roster);
            target.spare -= 1;
            target.residents += 1;
            arrivals.push({
                id: resident.id,
                name: resident.name,
                homeChapterId: target.chapter.id,
                chapterName: target.chapter.name,
                homeServiceId: resident.homeServiceId
            });
        }
        if (arrivals.length > 0) {
            this.refreshDerived();
            this.bulletin = this.buildBulletin(arrivals);
        }
        return arrivals;
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
        return {
            day: this.day,
            population: this.population,
            housed: this.housedPopulation,
            flourishing: Math.round(this.flourishing),
            lumen: this.lumen,
            net: report?.net || 0,
            visits: report?.visits || 0,
            visitors: report?.visitors || 0,
            closures: report?.closures?.length || 0
        };
    }

    stats() {
        const history = this.history || [];
        const peakPopulation = Math.max(this.population, ...history.map((entry) => entry.population || 0));
        const peakFlourishing = Math.max(Math.round(this.flourishing), ...history.map((entry) => entry.flourishing || 0));
        const totalVisits = history.reduce((sum, entry) => sum + (entry.visits || 0), 0);
        return {
            day: this.day,
            dayLimit: this.dayLimit,
            population: this.population,
            housedPopulation: this.housedPopulation,
            housingCapacity: this.housingCapacity,
            lumen: this.lumen,
            works: this.works,
            devotion: this.devotion,
            flourishing: this.flourishing,
            peakPopulation,
            peakFlourishing,
            totalVisits,
            services: this.services.services.length,
            activeServices: this.services.activeServices.length,
            mode: this.mode,
            confluenceReady: this.confluenceReady,
            campaign: this.campaign?.toJSON() || null,
            commons: { ...this.commons },
            visitors: this.visitors.length,
            totalSpareBeds: this.totalSpareBeds,
            rivals: this.rivals.length,
            devotionByChapter: this.devotionByChapter
        };
    }
}

function cleanChapterName(value) {
    const cleaned = String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 32);
    return cleaned || 'Home Chapter';
}
