/**
 * Service build, repair, policy and floor commands. Each command mutates the
 * charter it is given; the run model keeps the delegating methods.
 */
import { COMMONS_POLICY_BY_ID, applyCommonsPolicyToService } from '../commons/CommonsPolicies.js';
import { BALANCE } from '../design/balance.js';
import { FLOOR_PLAN_BY_ID } from '../services/FloorPlans.js';
import { PROGRAM_BY_ID } from '../design/programs.js';
import { RETROFIT_BY_ID } from '../services/RetrofitModules.js';
import { SERVICE_ACCESS_BY_ID } from '../services/ServiceAccess.js';
import { SERVICE_FOCUS_BY_ID } from '../services/ServiceFocus.js';
import { SERVICE_HOURS_BY_ID } from '../services/ServicePolicies.js';
import { SERVICE_VIBE_BY_ID } from '../services/ServiceVibes.js';
import { finishCost, finishFor } from '../services/BuildingFinishes.js';

export function canBuild(charter, programId, finish = 'comfortable', extraLumen = 0) {
    const program = PROGRAM_BY_ID[programId];
    if (!program || !program.buildable) return { ok: false, reason: 'That program is not available in charter charter.' };
    if (charter.works <= 0) return { ok: false, reason: 'No works left today. Open the day to reset them.' };
    const cost = finishCost(program, finish);
    if (charter.lumen + extraLumen < cost) {
        return { ok: false, reason: `Need ${cost - charter.lumen - extraLumen} more lumen.` };
    }
    return { ok: true };
}

export function build(charter, { programId, sectorId, u, v, name, finish = 'comfortable' }) {
    const program = PROGRAM_BY_ID[programId];
    const sector = charter.map.sectors.find((entry) => entry.id === sectorId);
    const shared = Boolean(sector?.commons && charter.commonsManager);
    const capital = shared ? charter.commons.capital : 0;
    const affordable = charter.canBuild(programId, finish, capital);
    if (!affordable.ok) return affordable;
    const finishOption = finishFor(finish);
    const cost = finishCost(program, finish);
    const funded = Math.min(capital, cost);
    const resolvedName = !name || name === programId ? program.name : name;
    const manager = shared ? charter.commonsManager : charter.services;
    const result = manager.place({
        programId,
        sectorId,
        u,
        v,
        name: resolvedName,
        state: 'PENDING',
        finish: finishOption.id
    });
    if (!result.ok) return result;
    if (shared) result.service.builderChapterId = 'player';
    result.service.capacity = Math.max(1, result.service.capacity + finishOption.capacityDelta);
    result.service.upkeepBonus = (result.service.upkeepBonus || 0) + finishOption.upkeepDelta;
    if (!shared && charter.legacyBonus?.programs.includes(programId)) {
        result.service.capacity += charter.legacyBonus.amount;
    }
    if (shared) charter.commons.capital -= funded;
    charter.lumen -= (cost - funded);
    charter.works -= 1;
    applyCommonsPolicyToService(result.service, charter.commons?.policy);
    charter.refreshAdjacency();
    charter.assignHomes();
    charter.refreshDerived();
    charter.log('build', `${resolvedName} broke ground${shared ? ' on the commons' : sector?.garden ? ' on the garden isle' : ''}.`);
    return { ...result, cost, funded };
}

export function renameService(charter, service, name) {
    if (!service || (service.chapterId && service.chapterId !== 'player')) {
        return { ok: false, error: "A rival chapter's service cannot be renamed." };
    }
    const cleaned = String(name ?? '').replace(/\s+/g, ' ').trim().slice(0, 32);
    if (!cleaned) return { ok: false, error: 'Give the service a name first.' };
    service.name = cleaned;
    service.refreshGraphics();
    charter.refreshDerived();
    return { ok: true, name: cleaned };
}

export function repairCost(charter) {
    const policy = COMMONS_POLICY_BY_ID[charter.commons?.policy];
    return Math.max(1, 3 - (policy?.repairDiscount || 0));
}

export function repairAllServices(charter) {
    let count = 0;
    let spent = 0;
    for (const service of charter.services.services) {
        if (service.condition >= 100) continue;
        const cost = charter.repairCost();
        if (charter.lumen < cost) break;
        charter.lumen -= cost;
        spent += cost;
        count += 1;
        service.condition = 100;
        service.refreshGraphics();
    }
    if (count > 0) charter.refreshDerived();
    return { ok: count > 0, count, spent };
}

export function repairService(charter, service) {
    if (!service || (service.chapterId && service.chapterId !== 'player')) {
        return { ok: false, error: "A rival chapter's service cannot be repaired." };
    }
    if (service.condition >= 100) return { ok: false, error: 'This service is already in good repair.' };
    const cost = charter.repairCost();
    if (charter.lumen < cost) return { ok: false, error: `A repair costs ${cost} lumen.` };
    charter.lumen -= cost;
    service.condition = 100;
    service.refreshGraphics();
    charter.refreshDerived();
    return { ok: true, cost, condition: service.condition };
}

export function setServiceFocus(charter, service, focusId) {
    const focus = SERVICE_FOCUS_BY_ID[focusId];
    if (!focus) return { ok: false, error: 'That is not a focus.' };
    if (!service || service.state !== 'ACTIVE' || service.closed) {
        return { ok: false, error: 'Only an open, working service can choose a focus.' };
    }
    if (!service.program?.secondaryNeed) return { ok: false, error: 'This service already has one purpose.' };
    service.policy = { ...(service.policy || {}), focus: focus.id };
    service.refreshGraphics();
    charter.refreshDerived();
    return { ok: true, focus };
}

export function setServiceAccess(charter, service, accessId) {
    if (!service || (service.chapterId && service.chapterId !== 'player')) {
        return { ok: false, error: "A rival chapter's access cannot be changed." };
    }
    if (service.fixed) return { ok: false, error: 'The Welcome Post keeps its own welcome.' };
    if (service.state !== 'ACTIVE' || service.closed) {
        return { ok: false, error: 'Only an open service can change access.' };
    }
    if (!SERVICE_ACCESS_BY_ID[accessId]) return { ok: false, error: 'Unknown access policy.' };
    service.policy = { ...(service.policy || {}), access: accessId };
    service.refreshGraphics();
    charter.refreshDerived();
    return { ok: true, service, access: accessId };
}

export function setServiceVibe(charter, service, vibeId) {
    if (!service || (service.chapterId && service.chapterId !== 'player')) {
        return { ok: false, error: "A rival chapter's atmosphere cannot be changed." };
    }
    if (service.fixed) return { ok: false, error: 'The Welcome Post keeps its own atmosphere.' };
    if (service.state !== 'ACTIVE' || service.closed) {
        return { ok: false, error: 'Only an open service can change atmosphere.' };
    }
    if (!SERVICE_VIBE_BY_ID[vibeId]) return { ok: false, error: 'Unknown service atmosphere.' };
    service.policy = { ...(service.policy || {}), vibe: vibeId };
    service.refreshGraphics();
    charter.refreshDerived();
    return { ok: true, service, vibe: vibeId };
}

export function setServiceHours(charter, service, hoursId) {
    if (!service || (service.chapterId && service.chapterId !== 'player')) {
        return { ok: false, error: "A rival chapter's hours cannot be changed." };
    }
    if (service.fixed || service.programId === 'housing') {
        return { ok: false, error: 'Housing keeps the charter hours.' };
    }
    if (service.state !== 'ACTIVE' || service.closed) {
        return { ok: false, error: 'Only an open service can change hours.' };
    }
    if (!SERVICE_HOURS_BY_ID[hoursId]) return { ok: false, error: 'Unknown service hours.' };
    service.policy = { ...(service.policy || {}), hours: hoursId };
    service.refreshGraphics();
    charter.refreshDerived();
    return { ok: true, service, hours: hoursId };
}

export function upgradeService(charter, service, moduleId = 'sunroom') {
    if (!service || service.chapterId && service.chapterId !== 'player') {
        return { ok: false, error: "A rival chapter's service cannot be retrofitted." };
    }
    if (service.fixed) return { ok: false, error: 'The Welcome Post is already part of the charter.' };
    if (service.state !== 'ACTIVE' || service.closed) {
        return { ok: false, error: 'Only an open, working service can be retrofitted.' };
    }
    const installed = service.retrofits;
    if (installed.includes(moduleId)) return { ok: false, error: 'That module is already installed.' };
    if (installed.length >= 2) return { ok: false, error: 'This service already has two retrofit modules.' };
    const module = RETROFIT_BY_ID[moduleId];
    if (!module) return { ok: false, error: 'Unknown retrofit module.' };
    if (charter.lumen < module.cost) {
        return { ok: false, error: `The ${module.name} retrofit costs ${module.cost} lumen.` };
    }
    charter.lumen -= module.cost;
    service.level = 2;
    service.retrofitId = module.id;
    service.capacity += module.capacity;
    service.qualityBonus = (service.qualityBonus || 0) + module.quality;
    service.upkeepBonus = (service.upkeepBonus || 0) + module.upkeep;
    service.finish = 'grand';
    service.modules = [...(service.modules || []), `retrofit:${module.id}`];
    service.refreshGraphics();
    charter.refreshDerived();
    return { ok: true, service, module, cost: module.cost };
}

export function addFloor(charter, service, planId = 'dormer') {
    if (!service || (service.chapterId && service.chapterId !== 'player')) {
        return { ok: false, error: "A rival chapter's service cannot grow." };
    }
    if (service.fixed) return { ok: false, error: 'The Welcome Post is already part of the charter.' };
    if (service.state !== 'ACTIVE' || service.closed) {
        return { ok: false, error: 'Only an open, working service can add a floor.' };
    }
    if (service.floors >= BALANCE.floors.max) return { ok: false, error: 'This service already has three floors.' };
    const plan = FLOOR_PLAN_BY_ID[planId] || FLOOR_PLAN_BY_ID.dormer;
    if (charter.lumen < plan.cost) {
        return { ok: false, error: `A floor costs ${plan.cost} lumen.` };
    }
    charter.lumen -= plan.cost;
    service.floors += 1;
    service.floorPlans = [...(service.floorPlans || []), plan.id];
    service.capacity += service.programId === 'housing' ? plan.housingCapacity : plan.serviceCapacity;
    service.qualityBonus = (service.qualityBonus || 0) + plan.quality;
    service.upkeepBonus = (service.upkeepBonus || 0) + plan.upkeep;
    service.refreshGraphics();
    charter.assignHomes();
    charter.refreshDerived();
    return { ok: true, service, cost: plan.cost, plan };
}

export function dismantle(charter, service) {
    if (!service) return { ok: false, reason: 'That service is already gone.' };
    if (service.chapterId && service.chapterId !== 'player') {
        return { ok: false, reason: "A rival chapter's service cannot be dismantled." };
    }
    if (service.fixed) return { ok: false, reason: 'The Welcome Post cannot be dismantled.' };
    const cost = finishCost(service.program, service.finish);
    const refund = Math.max(1, Math.floor(cost / 2));
    const removed = charter.services.remove(service);
    if (!removed) return { ok: false, reason: 'That service could not be dismantled.' };
    charter.lumen += refund;
    charter.refreshAdjacency();
    for (const resident of charter.activeResidents) {
        if (resident.homeServiceId === service.id) resident.homeServiceId = null;
    }
    charter.assignHomes();
    charter.refreshDerived();
    return { ok: true, refund, name: service.name };
}

export function reopen(charter, service) {
    if (!service || !service.closed) return { ok: false, reason: 'That service is already open.' };
    if (service.chapterId && service.chapterId !== 'player') {
        return { ok: false, reason: "A rival chapter's service is not yours to reopen." };
    }
    const cost = charter.services.reopenCost(service);
    if (charter.lumen < cost) return { ok: false, reason: `Need ${cost - charter.lumen} more lumen to reopen.` };
    charter.lumen -= cost;
    service.reopen();
    return { ok: true, cost };
}
