import { BALANCE } from '../design/balance.js';
import { NEEDS } from '../design/needs.js';
import { PROGRAM_BY_ID, servesNeed, isOpenAt } from '../design/programs.js';
import { ResidentFactory } from '../residents/ResidentFactory.js';
import { ServiceManager } from '../services/ServiceManager.js';
import { LumenLedger } from '../economy/LumenLedger.js';
import { DaySimulator } from '../simulation/DaySimulator.js';
import { summarizeReport } from '../simulation/ReportSummary.js';
import { RivalChapter } from '../chapters/RivalChapter.js';
import { createRivalChapters, planRivalDay } from '../chapters/RivalAI.js';

/**
 * A charter is the whole run: day, lumen, works, cast, services and the report
 * of the last day. It is plain data plus a handful of commands. The presentation
 * layer listens; it never owns the rules.
 */
export class Charter {
    constructor({ seed, mapSize = 'medium', mode = 'first-light', map = null, parentContainer = null, saved = null }) {
        this.seed = seed;
        this.mapSize = mapSize;
        this.mode = mode;
        this.map = map;
        this.homeSector = map?.homeSector || null;
        this.name = 'Home Chapter';
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
        this.rivals = [];
        this.lastRivalMoves = [];
        this.day = 1;
        this.dayLimit = BALANCE.dayLimits[mapSize] || BALANCE.dayLimits.medium;
        this.flourishing = 0;
        this.devotion = 0;
        this.report = null;
        this.lastReport = null;
        this.ending = null;
        this.confluenceReady = false;
        this.bulletin = null;
        this.history = [];
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
        this.assignHomes();
        this.refreshDerived();
        this.bulletin = this.buildBulletin([]);
    }

    static fromSave({ saved, map, parentContainer }) {
        return new Charter({
            seed: saved.seed,
            mapSize: saved.mapSize,
            mode: saved.mode || 'first-light',
            map,
            parentContainer,
            saved
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

    get playerResidents() {
        return this.activeResidents.filter((resident) => resident.homeChapterId === 'player');
    }

    get allServices() {
        return [
            ...this.services.services,
            ...this.rivals.flatMap((rival) => rival.services.services)
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
        return this.services.spareHousing(this.playerResidents);
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
        return service.chapter?.isPlayer || !service.chapter
            ? service.name
            : `${service.chapter.name}'s ${service.name}`;
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
            upkeep: chapter.services.totalUpkeep()
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

    refreshDerived() {
        this.flourishing = this.wellbeing;
        this.devotion = this.playerDevotion;
    }

    canBuild(programId) {
        const program = PROGRAM_BY_ID[programId];
        if (!program || !program.buildable) return { ok: false, reason: 'That program is not available in this charter.' };
        if (this.works <= 0) return { ok: false, reason: 'No works left today. Open the day to reset them.' };
        if (this.lumen < program.cost) {
            return { ok: false, reason: `Need ${program.cost - this.lumen} more lumen.` };
        }
        return { ok: true };
    }

    build({ programId, sectorId, u, v, name }) {
        const affordable = this.canBuild(programId);
        if (!affordable.ok) return affordable;
        const program = PROGRAM_BY_ID[programId];
        const resolvedName = !name || name === programId ? program.name : name;
        const result = this.services.place({
            programId,
            sectorId,
            u,
            v,
            name: resolvedName,
            state: 'PENDING'
        });
        if (!result.ok) return result;
        this.lumen -= program.cost;
        this.works -= 1;
        this.assignHomes();
        this.refreshDerived();
        return { ...result, cost: program.cost };
    }

    dismantle(service) {
        if (!service) return { ok: false, reason: 'That service is already gone.' };
        if (service.chapterId && service.chapterId !== 'player') {
            return { ok: false, reason: "A rival chapter's service cannot be dismantled." };
        }
        if (service.fixed) return { ok: false, reason: 'The Welcome Post cannot be dismantled.' };
        const cost = service.program?.cost || 0;
        const refund = Math.max(1, Math.floor(cost / 2));
        const removed = this.services.remove(service);
        if (!removed) return { ok: false, reason: 'That service could not be dismantled.' };
        this.lumen += refund;
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

    openDay() {
        if (this.ending) return { report: this.lastReport, events: [] };
        const simulation = new DaySimulator(this).run();
        this.lastReport = simulation.report;
        this.report = simulation.report;
        this.history.push(simulation.report);
        this.pendingArrivals = [];
        this.refreshDerived();
        return simulation;
    }

    beginNextDay() {
        if (this.ending) return { ended: true, ending: this.ending };
        if (this.confluenceReady) return { ended: true, confluence: true };
        this.day += 1;
        this.works = BALANCE.worksPerDay;
        const promoted = this.services.promoteUnderConstruction();
        for (const service of this.services.services) service.resetDaily();
        for (const rival of this.rivals) {
            rival.works = BALANCE.contest.rivalWorksPerDay;
            rival.services.promoteUnderConstruction();
            for (const service of rival.services.services) service.resetDaily();
        }
        this.assignHomes();
        const arrivals = this.addArrivals();
        this.pendingArrivals = arrivals;
        const rivalMoves = this.rivals.map((rival) => planRivalDay(rival, this)).filter(Boolean);
        this.lastRivalMoves = rivalMoves;
        this.report = null;
        this.bulletin = this.buildBulletin(arrivals, rivalMoves);
        this.refreshDerived();
        return { day: this.day, promoted, arrivals, rivalMoves, bulletin: this.bulletin };
    }

    addArrivals() {
        if (this.flourishing < BALANCE.arrivals.minFlourishing) return [];
        const waiting = this.roster.filter((resident) => !resident.active && !resident.memory.departure);
        if (waiting.length === 0) return [];
        const devotion = this.devotionByChapter;
        const candidates = this.chapters
            .map((chapter) => ({
                chapter,
                spare: chapter.services.spareHousing(
                    this.activeResidents.filter((resident) => resident.homeChapterId === chapter.id)
                ),
                devotion: devotion[chapter.id] || 0
            }))
            .filter((entry) => entry.spare > 0)
            .sort((a, b) => b.devotion - a.devotion || b.spare - a.spare);
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
        const items = [];
        const residents = this.activeResidents;
        const averages = {};
        for (const need of NEEDS) {
            averages[need.id] = residents.length
                ? residents.reduce((sum, resident) => sum + resident.needs[need.id], 0) / residents.length
                : 0;
        }
        const topNeed = NEEDS.reduce((best, need) => (!best || averages[need.id] > averages[best.id] ? need : best), null);
        const urgentCount = topNeed ? residents.filter((resident) => resident.needs[topNeed.id] >= BALANCE.needs.bulletinThreshold).length : 0;
        const matching = topNeed ? this.allServices.filter((service) => servesNeed(service.program, topNeed.id)) : [];
        const openNow = matching.filter((service) => service.state === 'ACTIVE' && !service.closed && !service.program?.passive && isOpenAt(service.program, 'morning'));
        const later = matching.filter((service) => service.state === 'ACTIVE' && !service.closed && !service.program?.passive && !isOpenAt(service.program, 'morning'));
        const passive = matching.filter((service) => service.state === 'ACTIVE' && !service.closed && service.program?.passive);
        const pending = matching.filter((service) => service.state === 'PENDING');
        const closed = matching.filter((service) => service.closed);
        let serviceHint = `Nobody serves ${topNeed?.short?.toLowerCase()} yet.`;
        if (topNeed?.id === 'rest' && passive.length > 0) serviceHint = 'Residents recover Rest in their own beds overnight.';
        else if (openNow.length > 0) serviceHint = `${this.serviceLabel(openNow[0])} is open now.`;
        else if (pending.length > 0) serviceHint = `${this.serviceLabel(pending[0])} opens tomorrow.`;
        else if (closed.length > 0) serviceHint = `${this.serviceLabel(closed[0])} is closed after an upkeep shortfall.`;
        else if (later.length > 0) serviceHint = `${this.serviceLabel(later[0])} opens later today.`;

        items.push({
            kicker: 'Unmet need',
            title: topNeed ? `${topNeed.name} is on everyone's mind` : 'A quiet morning',
            text: topNeed
                ? `${urgentCount} Tidelanders need ${topNeed.short.toLowerCase()}. ${serviceHint}`
                : 'No one is urgent yet. The day is yours.'
        });

        if (this.lastReport?.departures?.length && arrivals.length > 0) {
            items.push({
                kicker: 'People',
                title: `${arrivals.length} arrive, ${this.lastReport.departures.length} leave`,
                text: `${arrivals.map((arrival) => arrival.name).join(', ')} find beds; ${this.lastReport.departures.map((departure) => departure.name).join(', ')} leave.`
            });
        } else if (this.lastReport?.departures?.length) {
            const departure = this.lastReport.departures[0];
            items.push({
                kicker: 'Departure',
                title: this.lastReport.departures.length === 1 ? `${departure.name} left` : `${this.lastReport.departures.length} Tidelanders left`,
                text: departure.reason
            });
        } else if (arrivals.length > 0) {
            items.push({
                kicker: 'Arrivals',
                title: arrivals.length === 1 ? `${arrivals[0].name} arrives` : `${arrivals.length} Tidelanders arrive`,
                text: 'New faces at the Welcome Post, looking for a bed and a reason to stay.'
            });
        } else if (this.lastReport?.complaints?.length) {
            const complaint = this.lastReport.complaints[0];
            items.push({
                kicker: 'Complaint',
                title: complaint.residentName,
                text: complaint.text
            });
        } else {
            items.push({
                kicker: 'The chapter',
                title: `${this.population} residents, ${this.spareBeds} spare beds`,
                text: this.spareBeds > 0
                    ? 'There is room for someone new. Housing is the first invitation.'
                    : 'Every bed is taken. Build housing before more people can stay.'
            });
        }

        if (rivalMoves?.length) {
            const first = rivalMoves[0];
            const moveText = rivalMoves.map((move) => move.action === 'reopened'
                ? `${move.chapterName} reopened ${move.programName}.`
                : `${move.chapterName} put up a ${move.programName}.`).join(' ');
            items.push({
                kicker: 'Rival move',
                title: rivalMoves.length === 1 ? `${first.chapterName} ${first.action}` : 'Rivals make their moves',
                text: `${moveText} The room to be loved just got a little more crowded.`
            });
        }

        const quote = this.lastReport?.quotes?.[0] || this.activeResidents.find((resident) => resident.memory.lastChoice)?.memory?.lastChoice;
        items.push({
            kicker: 'Word of mouth',
            title: quote?.resident || quote?.residentName || 'The square',
            text: quote?.text || quote?.reason || 'The island is quiet. Someone is humming near the garden.'
        });

        return {
            day: this.day,
            items,
            quote: quote?.text || quote?.reason || null
        };
    }

    serialize() {
        return {
            seed: this.seed,
            mapSize: this.mapSize,
            mode: this.mode,
            day: this.day,
            dayLimit: this.dayLimit,
            lumen: this.lumen,
            works: this.works,
            flourishing: this.flourishing,
            devotion: this.devotion,
            ending: this.ending,
            confluenceReady: this.confluenceReady,
            pendingArrivals: this.pendingArrivals,
            lastReport: summarizeReport(this.lastReport),
            residents: this.roster.map((resident) => resident.toJSON()),
            services: this.services.serialize(),
            rivals: this.rivals.map((rival) => rival.toJSON())
        };
    }

    restore(saved) {
        this.mode = saved.mode || 'first-light';
        this.day = saved.day || 1;
        this.dayLimit = saved.dayLimit || BALANCE.dayLimits[this.mapSize] || 14;
        this.lumen = Number.isFinite(saved.lumen) ? saved.lumen : BALANCE.startingLumen;
        this.works = Number.isFinite(saved.works) ? saved.works : BALANCE.worksPerDay;
        this.ending = saved.ending || null;
        this.confluenceReady = Boolean(saved.confluenceReady);
        this.pendingArrivals = Array.isArray(saved.pendingArrivals) ? saved.pendingArrivals : [];
        this.roster = ResidentFactory.fromSave(saved.residents || []);
        if (this.roster.length === 0) this.roster = ResidentFactory.createRoster(this.seed, BALANCE.rosterSize);
        this.services.restore(saved.services || []);
        if (Array.isArray(saved.rivals)) {
            this.rivals = saved.rivals.map((entry) => {
                const rival = new RivalChapter({
                    ...entry,
                    map: this.map,
                    parentContainer: this.services.parentContainer,
                    occupancy: this.occupancy
                });
                rival.services.restore(entry.services || []);
                return rival;
            });
        } else if (this.mode === 'contest') {
            this.createRivals();
        }
        this.lastRivalMoves = this.rivals.map((rival) => rival.lastMove).filter(Boolean);
        this.commonsCell = this.findCommonsCell(this.homeSector);
        this.assignHomes();
        this.refreshDerived();
        this.report = null;
        this.lastReport = saved.lastReport || null;
        this.history = [];
        this.bulletin = this.buildBulletin(this.pendingArrivals, this.lastRivalMoves);
    }

    stats() {
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
            services: this.services.services.length,
            activeServices: this.services.activeServices.length,
            mode: this.mode,
            confluenceReady: this.confluenceReady,
            totalSpareBeds: this.totalSpareBeds,
            rivals: this.rivals.length,
            devotionByChapter: this.devotionByChapter
        };
    }
}

