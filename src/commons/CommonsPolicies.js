import { BALANCE } from '../design/balance.js';

/**
 * One shared policy chosen at the first Commons Assembly after the Beacon is
 * lit. Policies change existing and future services for every chapter.
 */
export const COMMONS_POLICIES = [
    {
        id: 'shared_table',
        name: 'Shared Table',
        kicker: 'Every table is a commons',
        detail: 'Canteens and Tea Houses gain 2 seats. No one eats alone by accident.',
        programs: ['canteen', 'tea_house'],
        capacity: 2
    },
    {
        id: 'open_beds',
        name: 'Open Beds',
        kicker: 'A room is a right',
        detail: 'Welcome Houses gain 2 beds. The spare room is never a private favour.',
        programs: ['housing'],
        capacity: 2
    },
    {
        id: 'care_compact',
        name: 'Care Compact',
        kicker: 'Care is infrastructure',
        detail: 'Clinics and Bathhouses gain 2 seats. Looking after each other is not a private luxury.',
        programs: ['clinic', 'bathhouse'],
        capacity: 2
    },
    {
        id: 'repair_corps',
        name: 'Repair Corps',
        kicker: 'Maintenance is mutual',
        detail: 'Repairs cost 1 lumen instead of 3. The commons keeps every door working.',
        repairDiscount: 2
    },
    {
        id: 'commons_garden',
        name: 'Commons Garden',
        kicker: 'Beauty is infrastructure',
        detail: 'Garden Domes gain 2 seats. Wonder is planned, not left to luck.',
        programs: ['garden_dome'],
        capacity: 2
    },
    {
        id: 'night_watch',
        name: 'Night Watch',
        kicker: 'The lamps stay on',
        detail: 'The Commons eases one more point of every need at night; beds restore one more Rest.',
        comfort: 1,
        restRecovery: 1
    }
];

export const COMMONS_POLICY_BY_ID = Object.fromEntries(COMMONS_POLICIES.map((policy) => [policy.id, policy]));

export function applyCommonsPolicyToService(service, policyId) {
    const policy = COMMONS_POLICY_BY_ID[policyId];
    if (!service || !policy?.programs || !policy.programs.includes(service.programId)) return false;
    const tag = `commons:${policy.id}`;
    if ((service.modules || []).includes(tag)) return false;
    service.capacity += policy.capacity || 0;
    service.modules = [...(service.modules || []), tag];
    service.refreshGraphics?.();
    return true;
}

export function removeCommonsPolicyFromService(service) {
    const tags = (service?.modules || []).filter((entry) => entry.startsWith('commons:'));
    if (tags.length === 0) return false;
    for (const tag of tags) {
        const policyId = tag.slice('commons:'.length);
        const policy = COMMONS_POLICY_BY_ID[policyId];
        if (policy?.capacity) service.capacity = Math.max(1, service.capacity - policy.capacity);
    }
    service.modules = service.modules.filter((entry) => !entry.startsWith('commons:'));
    service.refreshGraphics?.();
    return true;
}

export function commonsComfortFor(charter) {
    const policy = COMMONS_POLICY_BY_ID[charter?.commons?.policy];
    const annex = Math.max(0, (charter?.commons?.level || 1) - 1) * BALANCE.commons.annexComfort;
    return BALANCE.commons.comfort + annex + (policy?.comfort || 0);
}

export function commonsRestRecoveryFor(charter) {
    const policy = COMMONS_POLICY_BY_ID[charter?.commons?.policy];
    return BALANCE.housing.restRecovery + (policy?.restRecovery || 0);
}
