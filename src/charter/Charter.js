import { BALANCE } from '../design/balance.js';
import { NEEDS } from '../design/needs.js';
import { PROGRAM_BY_ID, servesNeed, isOpenAt } from '../design/programs.js';
import { ResidentFactory } from '../residents/ResidentFactory.js';
import { ServiceManager } from '../services/ServiceManager.js';
import { LumenLedger } from '../economy/LumenLedger.js';
import { DaySimulator } from '../simulation/DaySimulator.js';

/**
 * A charter is the whole run: day, lumen, works, cast, services and the report
 * of the last day. It is plain data plus a handful of commands. The presentation
 * layer listens; it never owns the rules.
 */
export class Charter {
    constructor({ seed, mapSize = 'medium', map = null, parentContainer = null, saved = null }) {
        this.seed = seed;
        this.mapSize = mapSize;
        this.map = map;
        this.homeSector = map?.homeSector || null;
        this.name = 'Home Chapter';
        this.services = new ServiceManager({ map, parentContainer });
        this.day = 1;
        this.dayLimit = BALANCE.dayLimits[mapSize] || BALANCE.dayLimits.medium;
        this.lumen = BALANCE.startingLumen;
        this.works = BALANCE.worksPerDay;
        this.flourishing = 0;
        this.devotion = 0;
        this.report = null;
        this.lastReport = null;
        this.ending = null;
        this.bulletin = null;
        this.history = [];
        this.commonsCell = null;

        if (saved) {
            this.restore(saved);
            return;
        }

        this.roster = ResidentFactory.createRoster(seed, BALANCE.rosterSize);
        this.foundWelcomePost();
        this.assignHomes();
        this.refreshDerived();
        this.bulletin = this.buildBulletin([]);
    }

    static fromSave({ saved, map, parentContainer }) {
        return new Charter({
            seed: saved.seed,
            mapSize: saved.mapSize,
            map,
            parentContainer,
            saved
        });
    }

    get activeResidents() {
        return this.roster.filter((resident) => resident.active);
    }

    get population() {
        return this.activeResidents.length;
    }

    get housedResidents() {
        return this.activeResidents.filter((resident) => resident.homeServiceId && this.services.housingFor(resident));
    }

    get housedPopulation() {
        return this.housedResidents.length;
    }

    get housingCapacity() {
        return this.services.housingCapacity();
    }

    get spareBeds() {
        return this.services.spareHousing(this.roster);
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
            capacityOverride: 6,
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
            const home = this.services.housingFor(resident);
            if (home) continue;
            this.services.assignHome(resident, this.roster);
        }
    }

    refreshDerived() {
        this.flourishing = this.wellbeing;
        this.devotion = Math.round(this.activeResidents.reduce((sum, resident) => sum + (resident.affinity.player || 0), 0) * 10) / 10;
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
        this.refreshDerived();
        return simulation;
    }

    beginNextDay() {
        if (this.ending) return { ended: true, ending: this.ending };
        this.day += 1;
        this.works = BALANCE.worksPerDay;
        const promoted = this.services.promoteUnderConstruction();
        for (const service of this.services.services) service.resetDaily();
        this.assignHomes();
        const arrivals = this.addArrivals();
        this.report = null;
        this.bulletin = this.buildBulletin(arrivals);
        this.refreshDerived();
        return { day: this.day, promoted, arrivals, bulletin: this.bulletin };
    }

    addArrivals() {
        if (this.flourishing < BALANCE.arrivals.minFlourishing) return [];
        const spare = this.services.spareHousing(this.roster);
        if (spare <= 0) return [];
        const waiting = this.roster.filter((resident) => !resident.active);
        const count = Math.min(BALANCE.arrivals.perDay, spare, waiting.length);
        const arrivals = [];
        for (let index = 0; index < count; index++) {
            const resident = waiting[index];
            resident.active = true;
            resident.state = 'idle';
            this.services.assignHome(resident, this.roster);
            arrivals.push({ id: resident.id, name: resident.name, homeServiceId: resident.homeServiceId });
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
        } else if (this.day >= this.dayLimit) {
            if (this.housedPopulation >= BALANCE.end.firstLightPopulation && this.flourishing >= BALANCE.end.comfortableFlourishing) {
                this.ending = {
                    outcome: 'victory',
                    day: this.day,
                    title: 'The commons holds.',
                    message: `${this.housedPopulation} Tidelanders housed, a full larder, and a flourishing of ${this.flourishing}. The Confluence has something to celebrate.`
                };
            } else {
                this.ending = {
                    outcome: 'defeat',
                    day: this.day,
                    title: 'The charter closes.',
                    message: `The chapter weathered ${this.day} days with ${this.population} residents and a flourishing of ${this.flourishing}. It was not enough for First Light.`
                };
            }
        }
        if (this.ending) {
            report.outcome = this.ending.outcome;
            report.message = this.ending.message;
            report.ending = { ...this.ending };
        }
        return this.ending;
    }

    buildBulletin(arrivals = []) {
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
        const matching = topNeed ? this.services.services.filter((service) => servesNeed(service.program, topNeed.id)) : [];
        const openNow = matching.filter((service) => service.state === 'ACTIVE' && !service.closed && !service.program?.passive && isOpenAt(service.program, 'morning'));
        const later = matching.filter((service) => service.state === 'ACTIVE' && !service.closed && !service.program?.passive && !isOpenAt(service.program, 'morning'));
        const passive = matching.filter((service) => service.state === 'ACTIVE' && !service.closed && service.program?.passive);
        const pending = matching.filter((service) => service.state === 'PENDING');
        const closed = matching.filter((service) => service.closed);
        let serviceHint = `Nobody serves ${topNeed?.short?.toLowerCase()} yet.`;
        if (topNeed?.id === 'rest' && passive.length > 0) serviceHint = 'Residents recover Rest in their own beds overnight.';
        else if (openNow.length > 0) serviceHint = `${openNow[0].name} is open now.`;
        else if (pending.length > 0) serviceHint = `${pending[0].name} opens tomorrow.`;
        else if (closed.length > 0) serviceHint = `${closed[0].name} is closed after an upkeep shortfall.`;
        else if (later.length > 0) serviceHint = `${later[0].name} opens later today.`;

        items.push({
            kicker: 'Unmet need',
            title: topNeed ? `${topNeed.name} is on everyone's mind` : 'A quiet morning',
            text: topNeed
                ? `${urgentCount} Tidelanders need ${topNeed.short.toLowerCase()}. ${serviceHint}`
                : 'No one is urgent yet. The day is yours.'
        });

        if (arrivals.length > 0) {
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
            day: this.day,
            dayLimit: this.dayLimit,
            lumen: this.lumen,
            works: this.works,
            flourishing: this.flourishing,
            devotion: this.devotion,
            ending: this.ending,
            residents: this.roster.map((resident) => resident.toJSON()),
            services: this.services.serialize()
        };
    }

    restore(saved) {
        this.day = saved.day || 1;
        this.dayLimit = saved.dayLimit || BALANCE.dayLimits[this.mapSize] || 14;
        this.lumen = Number.isFinite(saved.lumen) ? saved.lumen : BALANCE.startingLumen;
        this.works = Number.isFinite(saved.works) ? saved.works : BALANCE.worksPerDay;
        this.ending = saved.ending || null;
        this.roster = ResidentFactory.fromSave(saved.residents || []);
        if (this.roster.length === 0) this.roster = ResidentFactory.createRoster(this.seed, BALANCE.rosterSize);
        this.services.restore(saved.services || []);
        this.commonsCell = this.findCommonsCell(this.homeSector);
        this.assignHomes();
        this.refreshDerived();
        this.report = null;
        this.lastReport = null;
        this.history = [];
        this.bulletin = this.buildBulletin([]);
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
            activeServices: this.services.activeServices.length
        };
    }
}

