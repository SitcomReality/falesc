import { isOpenAt } from '../design/programs.js';

/**
 * Player-set service hours. As-built follows the program; the others trade
 * opening phases against upkeep and a small quality shift.
 */
export const SERVICE_HOURS = [
    {
        id: 'as_built',
        name: 'As built',
        blurb: 'Keep the program hours.',
        upkeep: 0,
        quality: 0,
        phases: null
    },
    {
        id: 'all_hours',
        name: 'Round the clock',
        blurb: 'Open every phase. +2 upkeep, +0.04 quality.',
        upkeep: 2,
        quality: 0.04,
        phases: ['morning', 'afternoon', 'evening', 'night']
    },
    {
        id: 'daylight',
        name: 'Daylight',
        blurb: 'Morning and afternoon only. −1 upkeep.',
        upkeep: -1,
        quality: 0,
        phases: ['morning', 'afternoon']
    },
    {
        id: 'evening',
        name: 'Evening',
        blurb: 'Afternoon, evening and night. +1 upkeep.',
        upkeep: 1,
        quality: 0,
        phases: ['afternoon', 'evening', 'night']
    }
];

export const SERVICE_HOURS_BY_ID = Object.fromEntries(SERVICE_HOURS.map((entry) => [entry.id, entry]));

export function serviceHoursFor(service) {
    return SERVICE_HOURS_BY_ID[service?.policy?.hours] || SERVICE_HOURS_BY_ID.as_built;
}

export function isServiceOpenAt(service, phaseId) {
    const hours = serviceHoursFor(service);
    if (hours.phases) return hours.phases.includes(phaseId);
    return isOpenAt(service?.program, phaseId);
}

export function serviceUpkeepModifier(service) {
    return serviceHoursFor(service).upkeep;
}

export function serviceQualityModifier(service) {
    return serviceHoursFor(service).quality;
}
