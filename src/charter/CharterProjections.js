import { BALANCE } from '../design/balance.js';
import { NEEDS } from '../design/needs.js';
import { servesNeed } from '../design/programs.js';

/**
 * Read-only projections over a charter: standings, milestones, surveys and
 * history summaries. They never mutate the run.
 */
export function milestones(charter) {
    const services = charter.allServices;
    const open = services.filter((service) => service.state === 'ACTIVE' && !service.closed);
    const needIds = NEEDS.map((need) => need.id);
    return [
        { id: 'first_build', label: 'Raise a service', done: charter.services.services.some((service) => !service.fixed) },
        { id: 'all_needs', label: 'Serve every need', done: needIds.every((needId) => open.some((service) => servesNeed(service.program, needId))) },
        { id: 'six_housed', label: 'House six Tidelanders', done: charter.housedPopulation >= 6 },
        { id: 'full_house', label: 'House twelve Tidelanders', done: charter.housedPopulation >= 12 },
        { id: 'flourishing', label: 'Reach a flourishing of 62', done: charter.flourishing >= BALANCE.end.comfortableFlourishing },
        { id: 'district', label: 'Form a named district', done: (charter.districtGroups || []).length > 0 },
        { id: 'floor', label: 'Add an upper floor', done: services.some((service) => (service.floorPlans || []).length > 0) },
        { id: 'module', label: 'Install a retrofit module', done: services.some((service) => (service.retrofits || []).length > 0) },
        { id: 'beacon', label: 'Light the Commons Beacon', done: Boolean(charter.commons?.active) },
        { id: 'assembly', label: 'Hold a Commons Assembly', done: Boolean(charter.commons?.policy) },
        { id: 'annex', label: 'Add a Beacon annex', done: (charter.commons?.level || 1) > 1 },
        { id: 'visitor', label: 'Welcome a trial guest', done: charter.roster.some((resident) => resident.memory?.trialStartDay) },
        { id: 'garden', label: 'Build on the garden isle', done: services.some((service) => service.sector?.garden) }
    ];
}

export function careWatch(charter) {
    const residents = charter.activeResidents.filter((resident) => {
        const urgent = NEEDS.some((need) => (resident.needs[need.id] || 0) >= 85);
        return urgent || resident.wellbeing < 30 || (resident.memory?.homelessDays || 0) > 0;
    });
    return { count: residents.length, residents };
}

export function needSurvey(charter) {
    const residents = charter.activeResidents;
    return NEEDS.map((need) => {
        const total = residents.reduce((sum, resident) => sum + (resident.needs[need.id] || 0), 0);
        const urgent = residents.filter((resident) => (resident.needs[need.id] || 0) >= 65).length;
        const services = charter.allServices.filter((service) => service.state === 'ACTIVE' && !service.closed && servesNeed(service.program, need.id));
        return {
            id: need.id,
            name: need.name,
            colour: need.color,
            average: residents.length ? total / residents.length : 0,
            urgent,
            services: services.length,
            capacity: services.reduce((sum, service) => sum + service.totalCapacity, 0)
        };
    });
}

export function standings(charter) {
    const devotion = charter.devotionByChapter;
    const patronage = charter.lastReport?.patronageByChapter || {};
    return charter.chapters.map((chapter) => ({
        id: chapter.id,
        name: chapter.name,
        colour: chapter.colour,
        isPlayer: Boolean(chapter.isPlayer),
        devotion: devotion[chapter.id] || 0,
        visits: patronage[chapter.id] || 0,
        residents: charter.activeResidents.filter((resident) => resident.homeChapterId === chapter.id).length,
        lumen: chapter.lumen,
        upkeep: chapter.services.totalUpkeep(),
        plan: chapter.plan
            ? { ...chapter.plan, saving: chapter.lumen < (chapter.plan.cost || 0) }
            : null
    }));
}

export function historyEntry(charter, report) {
    return {
        day: charter.day,
        population: charter.population,
        housed: charter.housedPopulation,
        flourishing: Math.round(charter.flourishing),
        lumen: charter.lumen,
        net: report?.net || 0,
        visits: report?.visits || 0,
        visitors: report?.visitors || 0,
        closures: report?.closures?.length || 0
    };
}

export function stats(charter) {
    const history = charter.history || [];
    const peakPopulation = Math.max(charter.population, ...history.map((entry) => entry.population || 0));
    const peakFlourishing = Math.max(Math.round(charter.flourishing), ...history.map((entry) => entry.flourishing || 0));
    const totalVisits = history.reduce((sum, entry) => sum + (entry.visits || 0), 0);
    return {
        day: charter.day,
        dayLimit: charter.dayLimit,
        population: charter.population,
        housedPopulation: charter.housedPopulation,
        housingCapacity: charter.housingCapacity,
        lumen: charter.lumen,
        works: charter.works,
        devotion: charter.devotion,
        flourishing: charter.flourishing,
        peakPopulation,
        peakFlourishing,
        totalVisits,
        services: charter.services.services.length,
        activeServices: charter.services.activeServices.length,
        mode: charter.mode,
        confluenceReady: charter.confluenceReady,
        campaign: charter.campaign?.toJSON() || null,
        commons: { ...charter.commons },
        visitors: charter.visitors.length,
        totalSpareBeds: charter.totalSpareBeds,
        rivals: charter.rivals.length,
        devotionByChapter: charter.devotionByChapter
    };
}
