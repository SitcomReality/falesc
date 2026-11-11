import { BALANCE, DAY_PHASES } from '../design/balance.js';
import { NEEDS, NEED_BY_ID, mostUrgentNeed } from '../design/needs.js';
import { servesNeed } from '../design/programs.js';
import { isServiceOpenAt, serviceQualityModifier } from '../services/ServicePolicies.js';
import { rhythmRise, vibeFit, standardFit } from '../design/traits.js';
import { SeededRandom } from '../map/SeededRandom.js';
import { IslandNavigator } from '../navigation/IslandNavigator.js';
import { LumenLedger } from '../economy/LumenLedger.js';
import { commonsComfortFor, commonsRestRecoveryFor } from '../commons/CommonsPolicies.js';

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
        this.homeNavigator = new IslandNavigator(charter.homeSector, charter.allServices);
        this.commonsNavigator = charter.commonsSector
            ? new IslandNavigator(charter.commonsSector, charter.allServices)
            : null;
        this.navigator = this.homeNavigator;
        this.campaignEvent = charter.campaign?.eventFor?.(charter.day) || null;
        this.events = [];
        this.complaints = [];
        this.complaintKeys = new Set();
        this.quotes = [];
        this.arrivalNotes = [];
        this.serviceVisits = new Map();
        this.phaseLoad = new Map();
        this.affinityBefore = new Map();
        this.pendingArrivals = [...(charter.pendingArrivals || [])];
        this.departures = [];
        this.visitorFees = {};
    }

    run() {
        const charter = this.charter;
        const people = charter.presentResidents;
        const needBefore = new Map();
        for (const resident of people) {
            needBefore.set(resident.id, { ...resident.needs });
            this.affinityBefore.set(resident.id, { ...resident.affinity });
        }

        const loads = new Map();
        this.phaseLoad = loads;
        for (const phase of DAY_PHASES) {
            for (const resident of people) {
                this.applyPhaseDrift(resident, phase);
                if (phase.id === 'night') continue;
                this.chooseAndSchedule(resident, phase, needBefore, loads);
            }
        }

        for (const resident of [...charter.activeResidents, ...(charter.trialVisitors || [])]) {
            this.applyNightRest(resident);
            if (resident.trial) continue;
            this.recordDailyUnmet(resident);
            const departure = this.maybeLeave(resident);
            if (departure) this.departures.push(departure);
        }

        for (const departure of this.departures) {
            departure.resident.depart(departure.reason, charter.day);
        }
        if (this.departures.length > 0) charter.refreshDerived();

        const report = this.buildReport(needBefore);
        LumenLedger.resolveDay(charter, report, this.visitorFees);

        for (const service of charter.allServices) {
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
        const home = this.charter.homeFor(resident);
        if (home) {
            resident.adjustNeed('rest', -commonsRestRecoveryFor(this.charter));
            resident.addAffinity(BALANCE.housing.housedAffinity, home.chapterId);
            resident.clearUnmetDay('rest');
            resident.resetHomelessDays();
        } else {
            resident.adjustNeed('rest', BALANCE.housing.homelessRestPenalty);
            resident.recordHomelessNight();
            this.complain(resident, NEED_BY_ID.rest, `I need a bed. The ${this.charter.name} has no room for me.`);
        }
        if (this.charter.commons?.active) {
            const comfort = commonsComfortFor(this.charter);
            for (const need of NEEDS) {
                resident.adjustNeed(need.id, -comfort);
            }
        }
    }

    chooseAndSchedule(resident, phase, needBefore, loads) {
        if (!resident.active) return;
        const orderedNeeds = [...NEEDS].sort((a, b) => resident.needs[b.id] - resident.needs[a.id]);
        const available = this.charter.allServices
            .filter((service) => service.state === 'ACTIVE' && !service.closed && service.entrance && service.program && isServiceOpenAt(service, phase.id));
        let choice = null;
        let blockedByQueue = null;

        for (const need of orderedNeeds) {
            const urgency = resident.needs[need.id];
            if (urgency < 20) continue;
            // Rest is a night-time, at-home need. Do not send people to a housing
            // queue in the morning or complain that a bed is "closed".
            if (need.id === 'rest' && phase.id !== 'night') continue;
            const candidates = available.filter((service) => servesNeed(service.program, need.id));
            if (candidates.length === 0) continue;

            const scored = candidates.map((service) => ({
                service,
                score: this.scoreService(resident, service, need, urgency, phase)
            })).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score);

            for (const entry of scored) {
                const load = loads.get(`${entry.service.id}:${phase.id}`) || 0;
                if (load >= entry.service.capacity + BALANCE.services.maxQueue) {
                    blockedByQueue = blockedByQueue || { ...entry, need };
                    continue;
                }
                choice = { ...entry, need };
                break;
            }
            if (choice) break;
        }

        if (!choice) {
            if (blockedByQueue) {
                this.giveUp(resident, blockedByQueue.service, blockedByQueue.need, phase);
                return;
            }
            const urgent = mostUrgentNeed({ ...resident.needs, rest: 0 });
            if (urgent && urgent.value >= BALANCE.needs.complaintThreshold) {
                this.complain(resident, urgent, this.missingServiceReason(resident, urgent, phase));
            }
            return;
        }

        const { service, need } = choice;
        const loadKey = `${service.id}:${phase.id}`;
        const load = loads.get(loadKey) || 0;
        loads.set(loadKey, load + 1);
        this.scheduleVisit(resident, service, need, phase, load, needBefore);
    }

    giveUp(resident, service, need, phase) {
        const reason = `${service.name} — the queue was too long, so I gave up.`;
        resident.recordGiveUp({
            day: this.charter.day,
            phase: phase.id,
            serviceId: service.id,
            serviceName: this.charter.serviceLabel(service),
            chapterId: service.chapterId,
            chapterName: service.chapter?.name || 'Home Chapter',
            needId: need.id,
            reason
        });
        this.complain(resident, need, reason);
        resident.addAffinity(-0.03, service.chapterId);
    }

    scoreService(resident, service, need, urgency, phase) {
        const program = service.program;
        const isPrimary = program.need === need.id || program.id === 'commons_beacon';
        const match = isPrimary ? 1 : 0.46;
        const quality = ((program.quality || 1) + (service.qualityBonus || 0) + (service.adjacencyBonus || 0) + serviceQualityModifier(service))
            * (service.finish === 'grand' ? 1.1 : service.finish === 'humble' ? 0.9 : 1);
        const vibe = vibeFit(resident.traits.temperament, service.policy?.vibe || program.vibe);
        const standards = standardFit(resident.traits.standards, service.finish);
        const distance = this.distanceToService(resident, service);
        const proximity = Math.max(0.55, 1.15 - distance * 0.035);
        const loadKey = `${service.id}:${phase.id}`;
        const load = this.phaseLoad.get(loadKey) || 0;
        const availability = load < service.capacity ? 1 : BALANCE.services.queuePenalty;
        const familiarity = 1 + Math.min(this.residentVisits(resident, service.id), 4) * 0.012;
        const chapterBond = 1 + Math.min(resident.getAffinity(service.chapterId), 5) * 0.02;
        const campaignAppeal = this.charter.campaign?.appealFor?.(service.chapterId, this.charter.day) || 1;
        const novelty = this.rng.next() * 0.06 + 0.97;
        const rhythm = rhythmRise(resident.traits.rhythm, phase.id);
        return urgency * match * quality * vibe * standards * proximity * availability * familiarity * chapterBond * campaignAppeal * novelty * rhythm;
    }

    distanceToService(resident, service) {
        const home = this.charter.homeFor(resident);
        const origin = home?.entrance || service.entrance;
        if (!origin || !service.entrance) return 4;
        if (service.sectorId !== this.charter.homeSector.id) return 8;
        return Math.abs(origin.u - service.entrance.u) + Math.abs(origin.v - service.entrance.v);
    }

    routeTo(resident, service) {
        const homeCell = this.homeCell(resident);
        const homeSectorId = this.charter.homeSector.id;
        if (service.sectorId === homeSectorId || !this.commonsNavigator) {
            const cells = this.homeNavigator.path(homeCell, service.entrance) || [homeCell, service.entrance];
            const worldPath = this.homeNavigator.worldPath(cells);
            return {
                worldPath,
                returnWorldPath: [...worldPath].reverse(),
                length: this.homeNavigator.pathLength(cells),
                doorPoint: worldPath[worldPath.length - 1] || { x: 0, y: 0 }
            };
        }
        const gates = this.charter.transit;
        if (!gates?.home || !gates?.commons) {
            const worldPath = this.homeNavigator.worldPath([homeCell, service.entrance]);
            return {
                worldPath,
                returnWorldPath: [...worldPath].reverse(),
                length: this.homeNavigator.pathLength([homeCell, service.entrance]),
                doorPoint: worldPath[worldPath.length - 1] || { x: 0, y: 0 }
            };
        }
        const homeCells = this.homeNavigator.path(homeCell, gates.home) || [homeCell, gates.home];
        const commonsCells = this.commonsNavigator.path(gates.commons, service.entrance) || [gates.commons, service.entrance];
        const homeWorld = this.homeNavigator.worldPath(homeCells);
        const commonsWorld = this.commonsNavigator.worldPath(commonsCells);
        const worldPath = [...homeWorld, ...commonsWorld];
        return {
            worldPath,
            returnWorldPath: [...worldPath].reverse(),
            length: this.homeNavigator.pathLength(homeCells) + this.commonsNavigator.pathLength(commonsCells) + 6,
            doorPoint: commonsWorld[commonsWorld.length - 1] || { x: 0, y: 0 }
        };
    }

    scheduleVisit(resident, service, need, phase, queueIndex, needBefore) {
        const phaseIndex = DAY_PHASES.findIndex((entry) => entry.id === phase.id);
        const phaseStart = phaseIndex * BALANCE.playback.phaseSeconds;
        const phaseEnd = phaseStart + BALANCE.playback.phaseSeconds - 0.15;
        const route = this.routeTo(resident, service);
        const pathLength = route.length;
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
        const doorPoint = route.doorPoint;
        const queuePoint = {
            x: doorPoint.x + 16 * queueIndex,
            y: doorPoint.y + 8 * queueIndex
        };

        const needValue = resident.needs[need.id];
        const isPrimary = service.program.need === need.id || service.program.id === 'commons_beacon';
        const effect = (isPrimary ? BALANCE.services.primaryEffect : BALANCE.services.secondaryEffect)
            * ((service.program.quality || 1) + (service.qualityBonus || 0) + (service.adjacencyBonus || 0) + serviceQualityModifier(service))
            * standardFit(resident.traits.standards, service.finish);
        resident.adjustNeed(need.id, -effect);
        service.recordVisit(BALANCE.services.serviceHeart);
        if (service.builderChapterId && service.builderChapterId !== service.chapterId) {
            resident.addAffinity(BALANCE.commons.builderAffinity, service.builderChapterId);
        }
        if (resident.visitor && service.chapterId !== 'commons') {
            this.visitorFees[service.chapterId] = (this.visitorFees[service.chapterId] || 0) + BALANCE.visitors.fee;
        }
        const urgencyBonus = needValue >= 70 ? BALANCE.services.urgentVisitAffinity : 0;
        resident.addAffinity(BALANCE.services.visitAffinity + urgencyBonus, service.chapterId);
        resident.clearUnmetDay(need.id);

        const reason = this.buildReason(resident, service, need, queueIndex, phase.id);
        resident.recordChoice({
            day: this.charter.day,
            phase: phase.id,
            serviceId: service.id,
            serviceName: this.charter.serviceLabel(service),
            chapterId: service.chapterId,
            chapterName: service.chapter?.name || 'Home Chapter',
            needId: need.id,
            reason
        });

        const worldPath = route.worldPath;
        const returnWorldPath = route.returnWorldPath;
        const event = {
            id: `e${this.events.length + 1}`,
            residentId: resident.id,
            residentName: resident.name,
            serviceId: service.id,
            serviceName: this.charter.serviceLabel(service),
            chapterId: service.chapterId,
            chapterName: service.chapter?.name || 'Home Chapter',
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
        const home = this.charter.homeFor(resident);
        if (home) return home.entrance;
        return this.charter.commonsCell;
    }

    residentVisits(resident, serviceId) {
        return (resident.memory.recentVisits || []).filter((visit) => visit.serviceId === serviceId).length;
    }

    buildReason(resident, service, need, queueIndex, phaseId) {
        const fragments = [];
        const label = this.charter.serviceLabel(service);
        if (this.campaignEvent
            && this.charter.campaign?.appealFor?.(service.chapterId, this.charter.day) > 1) {
            fragments.push(`${this.campaignEvent.title} was in the air`);
        }
        if (need.id === service.program.need) fragments.push(NEED_BY_ID[need.id].reason);
        else fragments.push(`I found ${NEED_BY_ID[need.id].short.toLowerCase()} there too`);
        const temperament = resident.traits.temperament;
        if (temperament === 'cosy' && service.program.vibe === 'cosy') fragments.push('it is cosy');
        else if (temperament === 'social' && service.program.vibe === 'efficient') fragments.push('it is busy in a good way');
        else if (temperament === 'curious' && service.program.vibe === 'curious') fragments.push('it is strange and green');
        const waiting = queueIndex >= (service.capacity || 1) ? queueIndex - (service.capacity || 1) + 1 : 0;
        if (waiting === 0) fragments.push('there was no queue');
        else if (waiting === 1) fragments.push('the queue was short');
        else fragments.push('I did not mind the wait');
        if (this.residentVisits(resident, service.id) >= 2) fragments.push('I come here often');
        if (phaseId === 'evening') fragments.push('it was open late');
        return `${label} — ${fragments.slice(0, 3).join(', ')}.`;
    }

    missingServiceReason(resident, need, phase) {
        const all = this.charter.allServices.filter((service) => servesNeed(service.program, need.id));
        const openNow = all.filter((service) => service.state === 'ACTIVE' && !service.closed && isServiceOpenAt(service, phase.id));
        const pending = all.filter((service) => service.state === 'PENDING');
        const closed = all.filter((service) => service.closed);
        const later = all.filter((service) => service.state === 'ACTIVE' && !service.closed && !isServiceOpenAt(service, phase.id));
        if (openNow.length > 0) return `${this.charter.serviceLabel(openNow[0])} was full when I needed ${need.short.toLowerCase()}.`;
        if (pending.length > 0) return `${this.charter.serviceLabel(pending[0])} opens tomorrow. I waited at the ${phase.name.toLowerCase()} window.`;
        if (closed.length > 0) return `${this.charter.serviceLabel(closed[0])} was closed when I needed ${need.short.toLowerCase()}.`;
        if (later.length > 0) return `${this.charter.serviceLabel(later[0])} was not open yet when I needed ${need.short.toLowerCase()}.`;
        return `No one serves ${need.short.toLowerCase()} yet. I waited at the ${phase.name.toLowerCase()} window.`;
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
        const unmet = NEEDS
            .filter((need) => resident.needs[need.id] >= BALANCE.needs.departureNeed)
            .map((need) => need.id);
        resident.updateUnmetDays(unmet);
    }

    maybeLeave(resident) {
        const homelessDays = resident.memory.homelessDays || 0;
        if (homelessDays >= BALANCE.housing.homelessNightsBeforeLeaving) {
            return {
                resident,
                id: resident.id,
                name: resident.name,
                reason: `No bed for ${homelessDays} nights.`,
                needId: 'rest'
            };
        }
        const unmet = resident.memory.unmetDays || {};
        for (const need of NEEDS) {
            if ((unmet[need.id] || 0) >= BALANCE.needs.leaveAfterUnmetDays) {
                return {
                    resident,
                    id: resident.id,
                    name: resident.name,
                    reason: `${need.name} went unmet for ${unmet[need.id]} days.`,
                    needId: need.id
                };
            }
        }
        return null;
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
        charter.devotion = charter.devotionByChapter.player || 0;
        const campaignEvent = this.campaignEvent;
        const visitors = this.charter.visitors || [];
        const visitorDetails = visitors.map((visitor) => ({
            id: visitor.id,
            name: visitor.name,
            wellbeing: Math.round(visitor.wellbeing * 10) / 10,
            visits: visitor.memory.recentVisits?.length || 0,
            affinity: Math.round(visitor.getAffinity('player') * 100) / 100,
            lastChoice: visitor.memory.lastChoice?.serviceName || null,
            returned: Boolean(visitor.returned)
        }));
        const visitorFees = Object.values(this.visitorFees).reduce((sum, value) => sum + value, 0);
        const commons = this.charter.contest && this.charter.commons ? {
            active: Boolean(this.charter.commons.active),
            fund: this.charter.commons.fund,
            target: this.charter.commons.target,
            comfort: commonsComfortFor(this.charter),
            policy: this.charter.commons.policy || null
        } : null;
        const devotionByChapter = charter.devotionByChapter;
        const patronageByChapter = Object.fromEntries(charter.chapters.map((chapter) => [chapter.id, 0]));
        for (const service of charter.allServices) {
            const visits = this.serviceVisits.get(service.id) || service.dailyVisits || 0;
            patronageByChapter[service.chapterId] = (patronageByChapter[service.chapterId] || 0) + visits;
        }
        const chapters = charter.chapters.map((chapter) => ({
            id: chapter.id,
            name: chapter.name,
            colour: chapter.colour,
            isPlayer: Boolean(chapter.isPlayer),
            devotion: devotionByChapter[chapter.id] || 0,
            visits: patronageByChapter[chapter.id] || 0
        }));

        const visits = this.events.length;
        const affinityTotal = (affinity) => Object.values(affinity || {}).reduce((sum, value) => sum + value, 0);
        const hearts = Math.round(residents.reduce((sum, resident) => sum + affinityTotal(resident.affinity), 0) * 10) / 10;
        const heartsGained = Math.round(residents.reduce((sum, resident) => {
            const before = this.affinityBefore.get(resident.id) || {};
            return sum + Object.entries(resident.affinity).reduce((delta, [chapterId, value]) => delta + Math.max(0, value - (before[chapterId] || 0)), 0);
        }, 0) * 10) / 10;
        const departedAffinity = this.departures.reduce((sum, departure) => sum + affinityTotal(this.affinityBefore.get(departure.id)), 0);
        const heartsLost = Math.round((residents.reduce((sum, resident) => {
            const before = this.affinityBefore.get(resident.id) || {};
            return sum + Object.entries(before).reduce((delta, [chapterId, value]) => delta + Math.max(0, value - (resident.affinity[chapterId] || 0)), 0);
        }, 0) + departedAffinity) * 10) / 10;
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
            heartsGained,
            heartsLost,
            needs,
            wellbeing,
            flourishing: wellbeing,
            devotion: charter.devotion,
            campaignEvent,
            visitors: visitors.length,
            visitorFees,
            visitorFeesByChapter: { ...this.visitorFees },
            visitorDetails,
            stayedVisitors: 0,
            commons,
            devotionByChapter,
            patronageByChapter,
            chapters,
            population: charter.population,
            housingCapacity: charter.housingCapacity,
            contributions: 0,
            upkeep: 0,
            net: 0,
            lumenAfter: charter.lumen,
            closures: [],
            complaints: this.complaints,
            arrivals: this.pendingArrivals.map((arrival) => ({ ...arrival })),
            departures: this.departures.map((departure) => ({ id: departure.id, name: departure.name, reason: departure.reason, needId: departure.needId })),
            quotes,
            serviceVisits,
            events: this.events,
            outcome: null,
            message: this.summaryMessage(visits),
            needsBefore: Object.fromEntries([...needBefore.entries()]),
            at: charter.day
        };

        if (this.departures.length > 0) {
            report.message = this.departures.length === 1
                ? `${this.departures[0].name} left the chapter.`
                : `${this.departures.length} Tidelanders left the chapter.`;
        }
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
