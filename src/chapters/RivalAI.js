import { PROGRAM_BY_ID } from '../design/programs.js';
import { RivalChapter } from './RivalChapter.js';

export const RIVAL_DEFINITIONS = [
    {
        id: 'gardener',
        name: 'The Gardener',
        colour: '#59E3C2',
        doctrine: 'wonder',
        blurb: 'Builds gardens and quiet rooms. Forgets the night kitchen.',
        programs: ['garden_dome', 'tea_house', 'canteen'],
        lumen: 20,
        works: 1
    },
    {
        id: 'host',
        name: 'The Host',
        colour: '#FF4F9A',
        doctrine: 'company',
        blurb: 'Builds tables, lamps and noise. Runs short of garden.',
        programs: ['tea_house', 'canteen', 'garden_dome'],
        lumen: 20,
        works: 1
    }
];

export function createRivalChapters({ map, parentContainer, occupancy }) {
    return RIVAL_DEFINITIONS.map((definition) => {
        const rival = new RivalChapter({
            ...definition,
            map,
            parentContainer,
            occupancy
        });
        // The preview opens with one signature service already running.
        const opening = rival.doctrine === 'wonder' ? 'garden_dome' : 'tea_house';
        seedOpeningService(rival, opening);
        return rival;
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
 * One deterministic build attempt per rival per day. Rivals pay construction
 * costs and use one work; their day-to-day upkeep is a later Phase 2 pass.
 */
export function planRivalDay(rival, charter) {
    if (rival.works <= 0) return null;
    for (const programId of rival.doctrinePrograms || rival.programs || []) {
        const program = PROGRAM_BY_ID[programId];
        if (!program || !program.buildable) continue;
        if (countProgram(rival, programId) >= programLimit(programId)) continue;
        if (rival.lumen < program.cost) continue;
        const plot = findFreePlot(rival, programId);
        if (!plot) continue;
        const result = rival.services.place({
            programId,
            sectorId: plot.sectorId,
            u: plot.u,
            v: plot.v,
            name: program.name,
            state: 'PENDING'
        });
        if (!result.ok) continue;
        rival.lumen -= program.cost;
        rival.works -= 1;
        rival.lastMove = {
            chapterId: rival.id,
            chapterName: rival.name,
            programId,
            programName: result.service.name,
            day: charter.day,
            action: 'broke ground'
        };
        return rival.lastMove;
    }
    return null;
}

function countProgram(rival, programId) {
    return rival.services.services.filter((service) => service.programId === programId).length;
}

function programLimit() {
    // The preview gives each rival one of each program. This keeps rival
    // buildings distinct and readable on a single shard.
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
