/**
 * Welcome-post placement, housing, staffing and arrivals for the charter.
 */
import { BALANCE } from '../design/balance.js';
import { PROGRAM_BY_ID } from '../design/programs.js';
import { homeFloorFor } from '../services/ServiceManager.js';

export function foundWelcomePost(charter) {
    const sector = charter.homeSector;
    if (!sector) return;
    const anchor = charter.findStartingAnchor(sector);
    if (!anchor) return;
    const result = charter.services.place({
        programId: 'housing',
        sectorId: sector.id,
        u: anchor.u,
        v: anchor.v,
        name: 'Welcome Post',
        state: 'ACTIVE',
        capacityOverride: (charter.contest ? 4 : 6) + charter.startingBedBonus,
        fixed: true
    });
    charter.welcomePost = result.ok ? result.service : null;
    charter.commonsCell = charter.findCommonsCell(sector);
}

export function findStartingAnchor(charter, sector) {
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
        const check = charter.services.canPlace(program.id, sector.id, candidate.u, candidate.v);
        if (check.ok) return candidate;
    }
    return null;
}

export function findCommonsCell(charter, sector) {
    const center = Math.floor(sector.gridSize / 2);
    for (let radius = 0; radius < sector.gridSize; radius++) {
        for (let dv = -radius; dv <= radius; dv++) {
            for (let du = -radius; du <= radius; du++) {
                const u = center + du;
                const v = center + dv;
                if (u < 0 || v < 0 || u >= sector.gridSize || v >= sector.gridSize) continue;
                if (!charter.services.isCellOccupied(sector.id, u, v)) return { u, v };
            }
        }
    }
    return { u: center, v: center };
}

export function reconcileStaff(charter) {
    for (const resident of charter.roster) {
        if (!resident.workServiceId) continue;
        const service = charter.allServices.find((entry) => entry.id === resident.workServiceId);
        if (!service || service.closed || service.state !== 'ACTIVE') {
            if (service) service.staffId = null;
            resident.workServiceId = null;
        }
    }
    for (const service of charter.allServices) {
        if (service.staffId && !charter.roster.some((resident) => resident.id === service.staffId)) service.staffId = null;
    }
}

export function assignStaff(charter, service, residentId) {
    if (!service || service.chapterId !== 'player' || service.state !== 'ACTIVE' || service.closed) {
        return { ok: false, reason: 'Open one of your own services first.' };
    }
    const previous = charter.roster.find((resident) => resident.id === service.staffId);
    if (previous) previous.workServiceId = null;
    if (!residentId) {
        service.staffId = null;
        return { ok: true, service };
    }
    const resident = charter.activeResidents.find((entry) => entry.id === residentId);
    if (!resident) return { ok: false, reason: 'That resident is not here.' };
    if (resident.workServiceId) {
        const old = charter.allServices.find((entry) => entry.staffId === resident.id);
        if (old) old.staffId = null;
    }
    service.staffId = resident.id;
    resident.workServiceId = service.id;
    return { ok: true, service, resident };
}

export function moveResidentHome(charter, residentId, serviceId) {
    const resident = charter.activeResidents.find((entry) => entry.id === residentId);
    const target = charter.services.services.find((service) => service.id === serviceId);
    if (!resident || !target) return { ok: false, reason: 'That bed is not available.' };
    if (target.programId !== 'housing' || target.state !== 'ACTIVE' || target.closed) {
        return { ok: false, reason: 'That house is not open.' };
    }
    if (resident.homeServiceId === target.id) return { ok: false, reason: 'They already live here.' };
    const used = charter.roster.filter((entry) => entry.active && entry.homeServiceId === target.id).length;
    if (used >= target.capacity) return { ok: false, reason: 'That house is full.' };
    resident.homeServiceId = target.id;
    resident.homeChapterId = target.chapterId || 'player';
    resident.homeFloor = homeFloorFor(target, used);
    charter.assignHomes();
    charter.refreshDerived();
    return { ok: true, service: target };
}

export function assignHomes(charter) {
    for (const resident of charter.activeResidents) {
        const home = charter.homeFor(resident);
        if (home) continue;
        const preferred = charter.chapterById(resident.homeChapterId) || charter.player;
        if (preferred.services.assignHome(resident, charter.roster)) {
            resident.homeChapterId = preferred.id;
            continue;
        }
        for (const chapter of charter.chapters) {
            if (chapter === preferred) continue;
            if (chapter.services.assignHome(resident, charter.roster)) {
                resident.homeChapterId = chapter.id;
                break;
            }
        }
        if (!charter.homeFor(resident)) resident.homeServiceId = null;
    }
}

export function addArrivals(charter) {
    if (charter.flourishing < BALANCE.arrivals.minFlourishing) return [];
    const waiting = charter.roster.filter((resident) => !resident.active && !resident.memory.departure);
    if (waiting.length === 0) return [];
    const devotion = charter.devotionByChapter;
    const candidates = charter.chapters
        .map((chapter) => {
            const residents = charter.activeResidents.filter((resident) => resident.homeChapterId === chapter.id);
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
        target.chapter.services.assignHome(resident, charter.roster);
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
        charter.refreshDerived();
        charter.bulletin = charter.buildBulletin(arrivals);
    }
    return arrivals;
}
