/**
 * Shared-commons levy and upkeep settlement against the commons purse.
 */

import { BALANCE } from '../design/balance.js';

export function collectCommonsLevy(charter) {
    if (charter.sharedWorkServices().length === 0) return { collected: 0 };
    let collected = 0;
    for (const chapter of charter.chapters) {
        if (chapter.lumen < BALANCE.commons.levyPerChapter) continue;
        chapter.lumen -= BALANCE.commons.levyPerChapter;
        collected += BALANCE.commons.levyPerChapter;
    }
    charter.commons.purse += collected;
    if (charter.commons.purse >= charter.sharedUpkeepTotal(true)) {
        for (const service of charter.sharedWorkServices()) service.closed = false;
    }
    return { collected, purse: charter.commons.purse };
}

export function settleCommonsPurse(charter, report) {
    if (charter.sharedWorkServices().length === 0) return;
    const services = charter.sharedWorkServices().filter((service) => service.state === 'ACTIVE' && !service.closed);
    const upkeep = services.reduce((sum, service) => sum + (charter.commonsManager.upkeepFor(service) || 0), 0);
    const purseBefore = charter.commons.purse;
    report.commonsPurseBefore = purseBefore;
    report.commonsUpkeep = upkeep;
    report.commonsClosed = [];
    if (services.length === 0 || upkeep <= 0) {
        report.commonsPurse = charter.commons.purse;
        return;
    }
    if (charter.commons.purse >= upkeep) {
        charter.commons.purse -= upkeep;
        report.commonsPurse = charter.commons.purse;
        report.commonsSpent = upkeep;
        return;
    }
    for (const service of services) {
        service.closed = true;
        report.commonsClosed.push({ id: service.id, name: service.name });
    }
    charter.commons.purse = 0;
    report.commonsPurse = 0;
}
