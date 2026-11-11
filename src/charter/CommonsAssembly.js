/**
 * Commons fund, capital, purse and Assembly commands. Each command takes the
 * charter so the run model stays the single owner of state.
 */

import { BALANCE } from '../design/balance.js';
import { COMMONS_POLICY_BY_ID, applyCommonsPolicyToService, removeCommonsPolicyFromService } from '../commons/CommonsPolicies.js';
import { nominateForRival, petitionFor, resolveCommonsBallot } from '../commons/CommonsBallot.js';

export function contributeCommons(charter, chapter, amount) {
    if (!charter.commonsManager || charter.commons.active) return { ok: false, reason: 'The Commons is not taking contributions.' };
    const needed = Math.max(0, charter.commons.target - charter.commons.fund);
    const value = Math.max(0, Math.min(Math.trunc(amount), chapter?.lumen || 0, needed));
    if (!value) return { ok: false, reason: 'No lumen to give.' };
    chapter.lumen -= value;
    charter.commons.fund += value;
    charter.commons.contributors[chapter.id] = (charter.commons.contributors[chapter.id] || 0) + value;
    let activated = false;
    if (charter.commons.fund >= charter.commons.target) {
        activated = charter.activateCommons();
    }
    return { ok: true, activated, fund: charter.commons.fund, active: charter.commons.active };
}

export function contributeCapital(charter, amount) {
    const value = Math.max(0, Math.min(Math.trunc(amount), charter.player.lumen));
    if (!value) return { ok: false, reason: 'No lumen to give.' };
    charter.player.lumen -= value;
    charter.commons.capital += value;
    charter.refreshDerived();
    return { ok: true, capital: charter.commons.capital, gave: value };
}

export function contributePurse(charter, amount) {
    const value = Math.max(0, Math.min(Math.trunc(amount), charter.player.lumen));
    if (!value) return { ok: false, reason: 'No lumen to give.' };
    charter.player.lumen -= value;
    charter.commons.purse += value;
    if (charter.commons.purse >= charter.sharedUpkeepTotal(true)) {
        for (const service of charter.sharedWorkServices()) service.closed = false;
    }
    charter.refreshDerived();
    return { ok: true, purse: charter.commons.purse, gave: value };
}

export function callSecondReading(charter) {
    if (!charter.commons.active) return { ok: false, reason: 'Light the Beacon first.' };
    if (!charter.commons.policy) return { ok: false, reason: 'The first reading has not finished.' };
    if (charter.commons.assembly.reading >= 2) return { ok: false, reason: 'The commons has already held its second reading.' };
    if (charter.commons.assembly.stage !== 'resolved') return { ok: false, reason: 'The first reading is still open.' };
    if (charter.day <= (charter.commons.chosenDay || charter.day)) return { ok: false, reason: 'Let the chosen policy stand for one full day first.' };
    charter.commons.assembly = {
        ...charter.commons.assembly,
        stage: 'nominations',
        reading: 2,
        playerNomination: null,
        nominations: {},
        finalists: [],
        votes: [],
        counts: {},
        winnerId: null,
        petition: petitionFor(charter.activeResidents),
        day: charter.day
    };
    return { ok: true, policy: COMMONS_POLICY_BY_ID[charter.commons.policy], assembly: charter.commons.assembly };
}

export function nominateCommonsPolicy(charter, policyId) {
    if (!charter.commons.active) return { ok: false, reason: 'Light the Beacon before calling an assembly.' };
    if (charter.commons.policy && charter.commons.assembly.reading < 2) return { ok: false, reason: 'The assembly has already chosen.' };
    if (charter.commons.assembly.stage !== 'nominations') return { ok: false, reason: 'Nominations are closed.' };
    const policy = COMMONS_POLICY_BY_ID[policyId];
    if (!policy) return { ok: false, reason: 'That is not a Commons policy.' };
    const nominations = { player: policy.id };
    for (const rival of charter.rivals) nominations[rival.id] = nominateForRival(rival);
    const petition = charter.commons.assembly.petition || petitionFor(charter.activeResidents);
    const finalists = [...new Set([...Object.values(nominations), petition?.policyId].filter(Boolean))];
    charter.commons.assembly = {
        ...charter.commons.assembly,
        stage: 'ballot',
        playerNomination: policy.id,
        nominations,
        finalists,
        votes: [],
        counts: {},
        winnerId: null,
        petition,
        day: charter.day
    };
    return { ok: true, policy, nominations, finalists };
}

export function resolveCommonsAssembly(charter) {
    if (!charter.commons.active) return { ok: false, reason: 'Light the Beacon first.' };
    if (charter.commons.policy && charter.commons.assembly.reading < 2) return { ok: false, reason: 'The assembly has already chosen.' };
    if (charter.commons.assembly.stage !== 'ballot') return { ok: false, reason: 'There is no ballot to call.' };
    const result = resolveCommonsBallot(charter.activeResidents, charter.commons.assembly.finalists);
    if (!result.winnerId) return { ok: false, reason: 'No one voted.' };
    const chosen = charter.chooseCommonsPolicy(result.winnerId);
    if (!chosen.ok) return chosen;
    charter.commons.assembly.stage = 'resolved';
    charter.commons.assembly.votes = result.votes;
    charter.commons.assembly.counts = result.counts;
    charter.commons.assembly.winnerId = result.winnerId;
    charter.log('commons', `The Commons Assembly chose ${chosen.policy.name}.`);
    return { ok: true, policy: chosen.policy, result };
}

export function chooseCommonsPolicy(charter, policyId) {
    if (!charter.commons.active) return { ok: false, reason: 'Light the Beacon before calling an assembly.' };
    if (charter.commons.policy && charter.commons.assembly.reading < 2) return { ok: false, reason: 'The assembly has already chosen.' };
    const policy = COMMONS_POLICY_BY_ID[policyId];
    if (!policy) return { ok: false, reason: 'That is not a Commons policy.' };
    charter.commons.policy = policy.id;
    charter.commons.chosenDay = charter.day;
    if (charter.commons.assembly.stage !== 'resolved') {
        charter.commons.assembly.stage = 'resolved';
        charter.commons.assembly.winnerId = policy.id;
    }
    for (const chapter of charter.chapters) {
        for (const service of chapter.services.services) {
            removeCommonsPolicyFromService(service);
            applyCommonsPolicyToService(service, policy.id);
        }
    }
    for (const service of charter.commonsManager?.services || []) {
        removeCommonsPolicyFromService(service);
        applyCommonsPolicyToService(service, policy.id);
    }
    charter.assignHomes();
    charter.refreshDerived();
    return { ok: true, policy };
}

export function upgradeCommons(charter) {
    if (!charter.commons.active) return { ok: false, reason: 'Light the Beacon first.' };
    if ((charter.commons.level || 1) >= BALANCE.commons.annexMax) return { ok: false, reason: 'The Beacon already has both annexes.' };
    if ((charter.commons.capital || 0) < BALANCE.commons.annexCost) return { ok: false, reason: `An annex costs ${BALANCE.commons.annexCost} capital.` };
    const service = charter.commonsManager?.findById(charter.commons.serviceId);
    if (!service) return { ok: false, reason: 'The Beacon is not standing.' };
    charter.commons.capital -= BALANCE.commons.annexCost;
    charter.commons.level = (charter.commons.level || 1) + 1;
    service.capacity += BALANCE.commons.annexCapacity;
    service.refreshGraphics();
    charter.refreshDerived();
    charter.log('commons', `The Beacon gained annex ${charter.commons.level}.`);
    return { ok: true, level: charter.commons.level, capacity: service.capacity, cost: BALANCE.commons.annexCost };
}

export function activateCommons(charter) {
    if (!charter.commonsManager || charter.commons.active) return false;
    const service = charter.commonsManager.findById(charter.commons.serviceId);
    if (!service) return false;
    service.state = 'ACTIVE';
    service.daysRemaining = 0;
    service.refreshGraphics();
    charter.commons.active = true;
    charter.commons.activatedDay = charter.day;
    if (charter.commons.assembly.stage === 'none') charter.commons.assembly.stage = 'nominations';
    if (!charter.commons.assembly.petition) charter.commons.assembly.petition = petitionFor(charter.activeResidents);
    charter.log('commons', 'The Commons Beacon was lit.');
    return true;
}
