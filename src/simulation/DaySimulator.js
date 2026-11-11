import { BALANCE, DAY_PHASES } from '../design/balance.js';
import { NEEDS, NEED_BY_ID, mostUrgentNeed } from '../design/needs.js';
import { servesNeed, isOpenAt } from '../design/programs.js';
import { rhythmRise, vibeFit, standardFit } from '../design/traits.js';
import { SeededRandom } from '../map/SeededRandom.js';
import { IslandNavigator } from '../navigation/IslandNavigator.js';
import { LumenLedger } from '../economy/LumenLedger.js';

/**
 * Deterministic day simulation. Residents wake, needs rise, they choose a
 * service by a small legible utility score, walk, queue, enter, use the place,
 * and emerge changed. The simulation produces both the model result and a
 * timeline the playback view replays.
 *
 * No wall-clock time, no Math.random: same charter + day = same report.
 */
export class DaySimulator {
    constructor(charter) {
        this.charter = charter;
        this.rng = new SeededRandom(charter.seed + charter.day * 104729 + 17);
        this.navigator = new IslandNavigator(charter.homeSector, charter.services.services);
        this.events = [];
        this.complaints = [];
        this.complaintKeys = new Set();
        this.quotes = [];
        this.arrivalNotes = [];
        this.serviceVisits = new Map();
        this.residentStartCells = new Map();
        this.phaseLoad = new Map();
        this.phaseWait = new Map();
    }

    run() {
        const charter = this.charter;
        const needBefore = new Map();
        for (const resident of charter.activeResidents) {
            needBefore.set(resident.id, { ...resident.needs });
        }

        const loads = new Map();
        this.phaseLoad = loads;
        for (const phase of DAY_PHASES) {
            for (const resident of charter.activeResidents) {
                this.applyPhaseDrift(resident, phase);
                if (phase.id === 'night') continue;
                this.chooseAndSchedule(resident, phase, needBefore, loads);
            }
        }

        for (const resident of charter.activeResidents) {
            this.applyNightRest(resident);
            this.recordDailyUnmet(resident);
            this.maybeLeave(resident);
        }

        const report = this.buildReport(needBefore);
        LumenLedger.resolveDay(charter, report);

        for (const service of charter.services.services) {
            service.resetDaily();
        }
        this.charter.evaluateEnding(report);
        return { report, events: this.events, navigator: this.navigator };
    }

    applyPhaseDrift(resident, phase) {
        for (const need of NEEDS) {
            const multiplier = rhythmRise(resident.traits.rhythm, phase.id);
            const rise = need.baseRise[phase.id] * multiplier;
            resident.adjustNeed(need.id, rise);
        }
    }

    applyNightRest(resident) {
        const home = this.charter.services.housingFor(resident);
        if (home) {
            resident.adjustNeed('rest', -BALANCE.housing.restRecovery);
            resident.addAffinity(BALANCE.housing.housedAffinity);
            resident.clearUnmetDay('rest');
        } else {
            resident.adjustNeed('rest', BALANCE.housing.homelessRestPenalty);
            this.complain(resident, NEED_BY_ID.rest, `I need a bed. The ${this.charter.name} has no room for me.`);
        }
    }

    chooseAndSchedule(resident, phase, needBefore, loads) {
        if (!resident.active) return;
        const orderedNeeds = [...NEEDS].sort((a, b) => resident.needs[b.id] - resident.needs[a.id]);
        const available = this.charter.services.activeServices.filter((service) => isOpenAt(service.program, phase.id));
        let choice = null;

        for (const need of orderedNeeds) {
            const urgency = resident.needs[need.id];
            if (urgency < 20) continue;
            // Rest is a night-time, at-home need. Do not send people to a
            // housing queue in the morning or complain that a bed is "closed".
            if (need.id === 'rest' && phase.id !== 'night') continue;
            const candidates = available.filter((service) => servesNeed(service.program, need.id));
            if (candidates.length === 0) continue;

            const scored = candidates.map((service) => ({
                service,
                score: this.scoreService(resident, service, need, urgency, phase)
            })).sort((a, b) => b.score - a.score);

            if (scored[0] && scored[0].score > 0) {
                choice = { ...scored[0], need };
                break;
            }
        }

        if (!choice) {
            const urgent = mostUrgentNeed(resident.needs);
            if (urgent && urgent.value >= BALANCE.needs.complaintThreshold && urgent.id !== 'rest') {
                this.complain(resident, urgent, this.missingServiceReason(resident, urgent, phase));
            }
            return;
        }

        const { service, need } = choice;
        const loadKey = `${service.id}:${phase.id}`;
        const load = loads.get(loadKey) || 0;
        if (load >= service.capacity + BALANCE.services.maxQueue) {
            this.complain(resident, need, `The ${service.name} queue was too long. I gave up.`);
            resident.addAffinity(-0.03);
            return;
        }

        const queueIndex = Math.max(0, load - service.capacity);
        loads.set(loadKey, load + 1);
        this.scheduleVisit(resident, service, need, phase, queueIndex, needBefore);
    }

    scoreService(resident, service, need, urgency, phase) {
        const program = service.program;
        const isPrimary = program.need === need.id;
        const match = isPrimary ? 1 : 0.46;
        const quality = (program.quality || 1) * (service.finish === 'grand' ? 1.1 : service.finish === 'humble' ? 0.9 : 1);
        const vibe = vibeFit(resident.traits.temperament, service.policy?.vibe || program.vibe);
        const standards = standardFit(resident.traits.standards, service.finish);
        const distance = this.distanceToService(resident, service);
        const proximity = Math.max(0.55, 1.15 - distance * 0.035);
        const loadKey = `${service.id}:${phase.id}`;
        const load = this.phaseLoad.get(loadKey) || 0;
        const availability = load < service.capacity ? 1 : BALANCE.services.queuePenalty;
        const familiarity = 1 + Math.min(service.visits, 4) * 0.012;
        const novelty = this.rng.next() * 0.06 + 0.97;
        const rhythm = rhythmRise(resident.traits.rhythm, phase.id);
        return urgency * match * quality * vibe * standards * proximity * availability * familiarity * novelty * rhythm;
    }

    distanceToService(resident, service) {
        const home = this.charter.services.housingFor(resident);
        const origin = home?.entrance || service.entrance;
        if (!origin || !service.entrance) return 4;
        return Math.abs(origin.u - service.entrance.u) + Math.abs(origin.v - service.entrance.v);
    }

    scheduleVisit(resident, service, need, phase, queueIndex, needBefore) {
        const phaseIndex = DAY_PHASES.findIndex((entry) => entry.id === phase.id);
        const phaseStart = phaseIndex * BALANCE.playback.phaseSeconds;
        const phaseEnd = phaseStart + BALANCE.playback.phaseSeconds - 0.15;
        const homeCell = this.homeCell(resident);
        const path = this.navigator.path(homeCell, service.entrance) || [homeCell, service.entrance];
        const returnPath = [...path].reverse();
        const pathLength = this.navigator.pathLength(path);
        let travel = Math.max(
            BALANCE.playback.minTravel,
            Math.min(BALANCE.playback.maxTravel, pathLength / BALANCE.playback.travelSpeed)
        );
        const jitter = 0.15 + Math.min((this.rng.next() * 0.5) + residentIndex(resident.id) * 0.03, 0.75);
        let useDuration = Math.max(0.9, service.program.duration || 1);
        // People enter in capacity-sized batches. The first batch walks straight
        // in; later arrivals visibly wait outside until a place turns over.
        const capacity = Math.max(1, service.capacity);
        const batch = Math.floor(queueIndex / capacity);
        const withinBatch = queueIndex % capacity;
        let queueWait = batch * Math.max(1, useDuration * 0.9) + withinBatch * 0.08;

        // Fit the whole visit inside its phase. A long walk or a long queue
        // shortens the time spent inside rather than spilling into the next
        // phase and leaving a resident invisible.
        const total = jitter + travel + queueWait + useDuration + travel;
        const maxTotal = phaseEnd - phaseStart;
        if (total > maxTotal) {
            const scale = maxTotal / total;
            travel *= scale;
            queueWait *= scale;
            useDuration *= scale;
        }
        const departTime = phaseStart + jitter;
        const arriveTime = departTime + travel;
        const enterTime = arriveTime + queueWait;
        const exitTime = enterTime + useDuration;
        const returnTime = Math.min(phaseEnd, exitTime + travel);
        const doorPoint = path.length > 0
            ? this.navigator.cellCenter(path[path.length - 1].u, path[path.length - 1].v)
            : { x: 0, y: 0 };
        const queuePoint = {
            x: doorPoint.x + 16 * queueIndex,
            y: doorPoint.y + 8 * queueIndex
        };

        const needValue = resident.needs[need.id];
        const isPrimary = service.program.need === need.id;
        const effect = (isPrimary ? BALANCE.services.primaryEffect : BALANCE.services.secondaryEffect)
            * (service.program.quality || 1)
            * standardFit(resident.traits.standards, service.finish);
        resident.adjustNeed(need.id, -effect);
        service.recordVisit(BALANCE.services.serviceHeart);
        const urgencyBonus = needValue >= 70 ? BALANCE.services.urgentVisitAffinity : 0;
        resident.addAffinity(BALANCE.services.visitAffinity + urgencyBonus);
        resident.clearUnmetDay(need.id);

        const reason = this.buildReason(resident, service, need, queueIndex);
        resident.recordChoice({
            day: this.charter.day,
            phase: phase.id,
            serviceId: service.id,
            serviceName: service.name,
            needId: need.id,
            reason
        });

        const worldPath = this.navigator.worldPath(path);
        const returnWorldPath = this.navigator.worldPath(returnPath);
        const event = {
            id: `e${this.events.length + 1}`,
            residentId: resident.id,
            residentName: resident.name,
            serviceId: service.id,
            serviceName: service.name,
            needId: need.id,
            phase: phase.id,
            phaseIndex,
            departTime,
            arriveTime,
            enterTime,
            exitTime,
            returnTime,
            path: worldPath,
            returnPath: returnWorldPath,
            queueIndex,
            queuePoint,
            reason,
            needBefore: needValue,
            needAfter: resident.needs[need.id],
            isPrimary
        };
        this.events.push(event);
        const visits = this.serviceVisits.get(service.id) || 0;
        this.serviceVisits.set(service.id, visits + 1);
        if (this.quotes.length < 3 && this.rng.next() < 0.42) {
            this.quotes.push({ resident: resident.name, text: reason });
        }
    }

    homeCell(resident) {
        const home = this.charter.services.housingFor(resident);
        if (home) return home.entrance;
        return this.charter.commonsCell;
    }

    buildReason(resident, service, need, queueIndex) {
        const fragments = [];
        const phase = service.program.open?.[service.program.open.length - 1];
        if (need.id === service.program.need) fragments.push(NEED_BY_ID[need.id].reason);
        else fragments.push(`the ${service.name} had ${NEED_BY_ID[need.id].short.toLowerCase()} too`);
        const temperament = resident.traits.temperament;
        if (temperament === 'cosy' && service.program.vibe === 'cosy') fragments.push('it is cosy');
        else if (temperament === 'social' && service.program.vibe === 'efficient') fragments.push('it is busy in a good way');
        else if (temperament === 'curious' && service.program.vibe === 'curious') fragments.push('it is strange and green');
        if (queueIndex === 0) fragments.push('there was no queue');
        else if (queueIndex === 1) fragments.push('the queue was short');
        else fragments.push('I did not mind the wait');
        if (service.visits > 2) fragments.push('I come here often');
        if (phase === 'evening') fragments.push('it was open late');
        return `${service.name} — ${fragments.slice(0, 3).join(', ')}.`;
    }

    missingServiceReason(resident, need, phase) {
        const alternatives = this.charter.services.activeServices.filter((service) => servesNeed(service.program, need.id));
        if (alternatives.length === 0) {
            return `No one serves ${need.short.toLowerCase()} yet. I waited at the ${phase.name.toLowerCase()} window.`;
        }
        return `The ${alternatives[0].name} was closed when I needed ${need.short.toLowerCase()}.`;
    }

    complain(resident, need, text) {
        const key = `${resident.id}:${need.id}`;
        if (this.complaintKeys.has(key)) return;
        this.complaintKeys.add(key);
        resident.recordComplaint(need.id, this.charter.day, text);
        this.complaints.push({
            residentId: resident.id,
            residentName: resident.name,
            needId: need.id,
            needName: need.name,
            text
        });
    }

    recordDailyUnmet(resident) {
        const unmet = NEEDS.filter((need) => resident.needs[need.id] >= 85).map((need) => need.id);
        resident.updateUnmetDays(unmet);
    }

    maybeLeave(resident) {
        if (!resident.memory.unmetDays) return;
        for (const need of NEEDS) {
            if ((resident.memory.unmetDays[need.id] || 0) >= BALANCE.needs.leaveAfterUnmetDays) {
                this.complaints.push({
                    residentId: resident.id,
                    residentName: resident.name,
                    needId: need.id,
                    needName: need.name,
                    text: `${resident.name} is talking about leaving. ${need.name} has gone unmet for days.`
                });
            }
        }
    }

    buildReport(needBefore) {
        const charter = this.charter;
        const residents = charter.activeResidents;
        const needs = {};
        for (const need of NEEDS) {
            const total = residents.reduce((sum, resident) => sum + resident.needs[need.id], 0);
            needs[need.id] = residents.length ? Math.round((total / residents.length) * 10) / 10 : 0;
        }
        const wellbeing = residents.length
            ? Math.round((residents.reduce((sum, resident) => sum + resident.wellbeing, 0) / residents.length) * 10) / 10
            : 0;
        charter.flourishing = wellbeing;
        charter.devotion = Math.round(residents.reduce((sum, resident) => sum + (resident.affinity.player || 0), 0) * 10) / 10;

        const visits = this.events.length;
        const hearts = Math.round(residents.reduce((sum, resident) => sum + (resident.affinity.player || 0), 0) * 10) / 10;
        const serviceVisits = {};
        for (const [serviceId, count] of this.serviceVisits) serviceVisits[serviceId] = count;

        const quotes = this.quotes.length
            ? this.quotes
            : residents.slice(0, 2).map((resident) => ({
                resident: resident.name,
                text: resident.memory.lastChoice?.reason || `${resident.name} kept to their own door today.`
            }));

        const report = {
            day: charter.day,
            visits,
            hearts,
            needs,
            wellbeing,
            flourishing: wellbeing,
            devotion: charter.devotion,
            population: charter.population,
            housingCapacity: charter.housingCapacity,
            contributions: 0,
            upkeep: 0,
            net: 0,
            lumenAfter: charter.lumen,
            closures: [],
            complaints: this.complaints,
            arrivals: [],
            departures: [],
            quotes,
            serviceVisits,
            events: this.events,
            outcome: null,
            message: this.summaryMessage(visits),
            needsBefore: Object.fromEntries([...needBefore.entries()]),
            at: charter.day
        };

        return report;
    }

    summaryMessage(visits) {
        if (visits === 0) return 'It was a quiet day. Nobody found a door to open.';
        if (visits < 4) return 'A few doors opened. The square stayed quiet.';
        if (visits < 9) return 'The chapter found its rhythm. Doors opened and closed.';
        return 'A busy day. The whole island seemed to be going somewhere.';
    }
}

function residentIndex(id) {
    const match = /(\d+)$/.exec(id || '');
    return match ? Number(match[1]) : 0;
}
