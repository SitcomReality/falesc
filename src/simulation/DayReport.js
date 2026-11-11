import { NEEDS } from '../design/needs.js';
import { commonsComfortFor } from '../commons/CommonsPolicies.js';

/**
 * Builds the structured day report and its one-line summary. The simulator
 * passes itself so the report reads the resolved day without owning it.
 */
export function buildDayReport(sim, needBefore) {
    const charter = sim.charter;
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
    const campaignEvent = sim.campaignEvent;
    const visitors = sim.charter.visitors || [];
    const visitorDetails = visitors.map((visitor) => ({
        id: visitor.id,
        name: visitor.name,
        wellbeing: Math.round(visitor.wellbeing * 10) / 10,
        visits: visitor.memory.recentVisits?.length || 0,
        affinity: Math.round(visitor.getAffinity('player') * 100) / 100,
        lastChoice: visitor.memory.lastChoice?.serviceName || null,
        returned: Boolean(visitor.returned)
    }));
    const visitorFees = Object.values(sim.visitorFees).reduce((sum, value) => sum + value, 0);
    const commons = sim.charter.contest && sim.charter.commons ? {
        active: Boolean(sim.charter.commons.active),
        fund: sim.charter.commons.fund,
        target: sim.charter.commons.target,
        comfort: commonsComfortFor(sim.charter),
        policy: sim.charter.commons.policy || null
    } : null;
    const devotionByChapter = charter.devotionByChapter;
    const patronageByChapter = Object.fromEntries(charter.chapters.map((chapter) => [chapter.id, 0]));
    for (const service of charter.allServices) {
        const visits = sim.serviceVisits.get(service.id) || service.dailyVisits || 0;
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

    const visits = sim.events.length;
    const affinityTotal = (affinity) => Object.values(affinity || {}).reduce((sum, value) => sum + value, 0);
    const hearts = Math.round(residents.reduce((sum, resident) => sum + affinityTotal(resident.affinity), 0) * 10) / 10;
    const heartsGained = Math.round(residents.reduce((sum, resident) => {
        const before = sim.affinityBefore.get(resident.id) || {};
        return sum + Object.entries(resident.affinity).reduce((delta, [chapterId, value]) => delta + Math.max(0, value - (before[chapterId] || 0)), 0);
    }, 0) * 10) / 10;
    const departedAffinity = sim.departures.reduce((sum, departure) => sum + affinityTotal(sim.affinityBefore.get(departure.id)), 0);
    const heartsLost = Math.round((residents.reduce((sum, resident) => {
        const before = sim.affinityBefore.get(resident.id) || {};
        return sum + Object.entries(before).reduce((delta, [chapterId, value]) => delta + Math.max(0, value - (resident.affinity[chapterId] || 0)), 0);
    }, 0) + departedAffinity) * 10) / 10;
    const serviceVisits = {};
    for (const [serviceId, count] of sim.serviceVisits) serviceVisits[serviceId] = count;

    const quotes = sim.quotes.length
        ? sim.quotes
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
        visitorFeesByChapter: { ...sim.visitorFees },
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
        complaints: sim.complaints,
        arrivals: sim.pendingArrivals.map((arrival) => ({ ...arrival })),
        departures: sim.departures.map((departure) => ({ id: departure.id, name: departure.name, reason: departure.reason, needId: departure.needId })),
        quotes,
        serviceVisits,
        events: sim.events,
        outcome: null,
        message: summaryMessage(visits),
        needsBefore: Object.fromEntries([...needBefore.entries()]),
        at: charter.day
    };

    for (const [serviceId, visits] of sim.serviceVisits.entries()) {
        const service = sim.charter.allServices.find((entry) => entry.id === serviceId);
        if (!service) continue;
        service.condition = Math.max(0, Math.round((service.condition ?? 100) - Math.min(8, visits * 0.6)));
    }
    if (sim.departures.length > 0) {
        report.message = sim.departures.length === 1
            ? `${sim.departures[0].name} left the chapter.`
            : `${sim.departures.length} Tidelanders left the chapter.`;
    }
    return report;
}

export function summaryMessage(visits) {
    if (visits === 0) return 'It was a quiet day. Nobody found a door to open.';
    if (visits < 4) return 'A few doors opened. The square stayed quiet.';
    if (visits < 9) return 'The chapter found its rhythm. Doors opened and closed.';
    return 'A busy day. The whole island seemed to be going somewhere.';
}
