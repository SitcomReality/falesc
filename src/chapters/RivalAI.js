import { BALANCE } from '../design/balance.js';
import { PROGRAM_BY_ID } from '../design/programs.js';
import { PLEDGES } from '../confluence/Pledges.js';
import { RivalChapter } from './RivalChapter.js';

export const RIVAL_DEFINITIONS = [
    {
        id: 'gardener',
        name: 'The Gardener',
        colour: '#59E3C2',
        doctrine: 'wonder',
        blurb: 'Builds gardens and quiet rooms. Forgets the night kitchen.',
        programs: ['garden_dome', 'tea_house', 'canteen', 'housing'],
        works: 1
    },
    {
        id: 'host',
        name: 'The Host',
        colour: '#FF4F9A',
        doctrine: 'company',
        blurb: 'Builds tables, lamps and noise. Runs short of garden.',
        programs: ['tea_house', 'canteen', 'garden_dome', 'housing'],
        works: 1
    }
];

export function createRivalChapters({ map, parentContainer, occupancy }) {
    return RIVAL_DEFINITIONS.map((definition) => {
        const rival = new RivalChapter({
            ...definition,
            lumen: BALANCE.contest.startingLumen,
            works: BALANCE.contest.rivalWorksPerDay,
            map,
            parentContainer,
            occupancy
        });
        // Every chapter starts with a small welcome house and one signature
        // service already running.
        seedHousing(rival);
        const opening = rival.doctrine === 'wonder' ? 'garden_dome' : 'tea_house';
        seedOpeningService(rival, opening);
        return rival;
    });
}

function seedHousing(rival) {
    const program = PROGRAM_BY_ID.housing;
    const plot = findFreePlot(rival, 'housing');
    if (!plot) return;
    rival.services.place({
        programId: 'housing',
        sectorId: plot.sectorId,
        u: plot.u,
        v: plot.v,
        name: 'Welcome House',
        state: 'ACTIVE',
        capacityOverride: 4,
        fixed: true
    });
}

function seedOpeningService(rival, programId) {
    const program = PROGRAM_BY_ID[programId];
    if (!program) return;
    const plot = findFreePlot(rival, programId);
    if (!plot) return;
    const result = rival.services.place({
        programId,
        sectorId: plot.sectorId,
        u: plot.u,
        v: plot.v,
        name: program.name,
        state: 'ACTIVE'
    });
    if (!result.ok) return;
    rival.lumen -= program.cost;
    rival.lastMove = {
        chapterId: rival.id,
        chapterName: rival.name,
        programId,
        programName: result.service.name,
        day: 1,
        action: 'opened'
    };
}

/**
 * One deterministic move per rival per day. A rival first reopens a service it
 * lost to a shortfall if it can afford to, then chooses the next build by
 * shared need pressure plus its doctrine bias. It still uses one work and pays
 * construction costs from its own lumen.
 */
export function planRivalDay(rival, charter) {
    const reopened = tryReopen(rival, charter);
    if (reopened) return reopened;
    if (rival.works <= 0) return null;

    const pressure = needPressure(charter);
    const candidates = (rival.programs || [])
        .map((programId, index) => {
            const program = PROGRAM_BY_ID[programId];
            if (!program || !program.buildable) return null;
            if (countProgram(rival, programId) >= programLimit(programId)) return null;
            if (rival.lumen < program.cost) return null;
            const residents = charter.activeResidents.filter((resident) => resident.homeChapterId === rival.id);
            const spare = rival.services.spareHousing(residents);
            const doctrineBias = Math.max(0, 12 - index * 3);
            const housingBias = programId === 'housing' && spare <= 0 ? 8 : 0;
            const score = (pressure[program.need] || 0) + doctrineBias + housingBias;
            return { programId, program, index, score };
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score || a.index - b.index);

    for (const candidate of candidates) {
        const plot = findFreePlot(rival, candidate.programId);
        if (!plot) continue;
        const built = countProgram(rival, candidate.programId);
        const result = rival.services.place({
            programId: candidate.programId,
            sectorId: plot.sectorId,
            u: plot.u,
            v: plot.v,
            name: built > 0 ? `${candidate.program.name} ${built + 1}` : candidate.program.name,
            state: 'PENDING'
        });
        if (!result.ok) continue;
        rival.lumen -= candidate.program.cost;
        rival.works -= 1;
        rival.lastMove = {
            chapterId: rival.id,
            chapterName: rival.name,
            programId: candidate.programId,
            programName: result.service.name,
            day: charter.day,
            action: 'broke ground'
        };
        return rival.lastMove;
    }
    return null;
}

function tryReopen(rival, charter) {
    const doctrine = rival.programs || [];
    const closed = rival.services.services
        .filter((service) => service.closed && !service.fixed)
        .sort((a, b) => doctrine.indexOf(a.programId) - doctrine.indexOf(b.programId));
    for (const service of closed) {
        const cost = rival.services.reopenCost(service);
        if (rival.lumen < cost) continue;
        rival.lumen -= cost;
        service.reopen();
        rival.lastMove = {
            chapterId: rival.id,
            chapterName: rival.name,
            programId: service.programId,
            programName: service.name,
            day: charter.day,
            action: 'reopened'
        };
        return rival.lastMove;
    }
    return null;
}

function needPressure(charter) {
    const residents = charter.activeResidents;
    if (residents.length === 0) return { sustenance: 0, rest: 0, company: 0, wonder: 0 };
    const pressure = { sustenance: 0, rest: 0, company: 0, wonder: 0 };
    for (const resident of residents) {
        for (const needId of Object.keys(pressure)) {
            pressure[needId] += resident.needs[needId] || 0;
        }
    }
    for (const needId of Object.keys(pressure)) {
        pressure[needId] = Math.round((pressure[needId] / residents.length) * 10) / 10;
    }
    return pressure;
}

function countProgram(rival, programId) {
    return rival.services.services.filter((service) => service.programId === programId).length;
}

function programLimit(programId) {
    // One of each signature service; housing can grow once more.
    if (programId === 'housing') return 2;
    return 1;
}

function findFreePlot(rival, programId) {
    const sector = rival.services.map?.homeSector;
    if (!sector) return null;
    for (let v = 0; v < sector.gridSize; v++) {
        for (let u = 0; u < sector.gridSize; u++) {
            if (rival.services.canPlace(programId, sector.id, u, v).ok) {
                return { sectorId: sector.id, u, v };
            }
        }
    }
    return null;
}

/**
 * Rivals promise the need their doctrine and the current archipelago share.
 * The choice is deterministic: pressure first, doctrine second, pledge order.
 */
export function chooseCampaignPledge(rival, charter, campaign = null) {
    const pressure = needPressure(charter);
    let best = PLEDGES[0];
    let bestScore = -Infinity;
    for (const pledge of PLEDGES) {
        const doctrineBias = rival.doctrine === pledge.id ? 14 : 0;
        const festivalBias = (campaign?.events?.filter((event) => event.need === pledge.need).length || 0) * 8;
        const score = (pressure[pledge.need] || 0) + doctrineBias + festivalBias;
        if (score > bestScore) {
            best = pledge;
            bestScore = score;
        }
    }
    return best.id;
}
