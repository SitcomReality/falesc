import { COMMONS_POLICY_BY_ID } from './CommonsPolicies.js';

/**
 * The Commons Assembly ballot. Each resident ranks the finalist policies from
 * their own needs and temperament. Votes are deterministic; ties fall back to
 * the nomination order.
 */
export function resolveCommonsBallot(residents, finalistIds) {
    const finalists = [...new Set(finalistIds)].filter((id) => COMMONS_POLICY_BY_ID[id]);
    const counts = Object.fromEntries(finalists.map((id) => [id, 0]));
    const votes = [];
    for (const resident of residents) {
        let best = null;
        finalists.forEach((policyId, index) => {
            const score = residentPolicyScore(resident, policyId) + jitter(`${resident.id}:${policyId}`);
            if (!best || score > best.score + 0.001) {
                best = { policyId, index, score };
            }
        });
        if (!best) continue;
        counts[best.policyId] += 1;
        votes.push({
            residentId: resident.id,
            residentName: resident.name,
            policyId: best.policyId,
            policyName: COMMONS_POLICY_BY_ID[best.policyId].name
        });
    }
    const winnerId = finalists.reduce((winner, policyId) => {
        if (!winner) return policyId;
        return counts[policyId] > counts[winner] ? policyId : winner;
    }, null);
    return { finalists, votes, counts, winnerId };
}

export function petitionFor(residents) {
    const counts = Object.fromEntries(Object.keys(COMMONS_POLICY_BY_ID).map((id) => [id, 0]));
    for (const resident of residents) {
        let best = null;
        for (const policyId of Object.keys(COMMONS_POLICY_BY_ID)) {
            const score = residentPolicyScore(resident, policyId) + jitter(`${resident.id}:petition:${policyId}`);
            if (!best || score > best.score + 0.001) best = { policyId, score };
        }
        if (best) counts[best.policyId] += 1;
    }
    const policyId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    return { policyId, signatures: policyId ? counts[policyId] : 0, counts };
}

export function nominateForRival(rival) {
    const programs = rival?.programs || [];
    if (rival?.id === 'gardener') return 'commons_garden';
    if (rival?.id === 'host') return 'shared_table';
    if (programs.includes('garden_dome')) return 'commons_garden';
    if (programs.includes('tea_house') || programs.includes('canteen')) return 'shared_table';
    if (programs.includes('housing')) return 'open_beds';
    return 'night_watch';
}

function residentPolicyScore(resident, policyId) {
    const needs = resident.needs;
    const temperament = resident.traits.temperament;
    const standards = resident.traits.standards;
    switch (policyId) {
        case 'shared_table':
            return needs.sustenance * 0.55 + needs.company * 0.55 + (temperament === 'social' ? 10 : 0);
        case 'open_beds':
            return needs.rest * 0.5 + (resident.isHomeless ? 20 : 0) + (temperament === 'cosy' ? 6 : 0);
        case 'care_compact':
            return needs.rest * 0.3 + needs.sustenance * 0.3 + (resident.wellbeing < 40 ? 20 : 0) + (temperament === 'cosy' ? 4 : 0);
        case 'commons_garden':
            return needs.wonder * 0.75 + (temperament === 'curious' ? 10 : 0);
        case 'night_watch':
            return needs.rest * 0.55 + (100 - resident.wellbeing) * 0.25 + (standards === 'exacting' ? 5 : 0);
        default:
            return 0;
    }
}

function jitter(key) {
    let hash = 2166136261;
    for (let index = 0; index < key.length; index++) {
        hash ^= key.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return ((hash >>> 0) % 700) / 100 - 3.5;
}
