import { BALANCE } from '../design/balance.js';

/**
 * Lumen is civic energy: residents contribute according to wellbeing, services
 * draw upkeep, and a shortfall closes the least essential doors first.
 */
export class LumenLedger {
    static contributionFor(resident) {
        if (!resident || !resident.active) return 0;
        const wellbeing = resident.wellbeing;
        if (wellbeing >= BALANCE.economy.highWellbeing) return BALANCE.economy.contributionHigh;
        if (wellbeing >= BALANCE.economy.lowWellbeing) return BALANCE.economy.contributionNeutral;
        return BALANCE.economy.contributionLow;
    }

    static projectedContributions(charter) {
        return charter.activeResidents.reduce((sum, resident) => sum + LumenLedger.contributionFor(resident), 0);
    }

    static projectedUpkeep(charter) {
        return charter.services.totalUpkeep();
    }

    static projectedNet(charter) {
        return LumenLedger.projectedContributions(charter) - LumenLedger.projectedUpkeep(charter);
    }

    /**
     * Resolve the day's economy. Mutates lumen, service closure state and the
     * report. Closure happens after the day's visits, so residents feel it on
     * the next day and the report can explain it.
     */
    static resolveDay(charter, report) {
        const contributions = LumenLedger.projectedContributions(charter);
        const upkeepBefore = LumenLedger.projectedUpkeep(charter);
        let lumen = charter.lumen + contributions - upkeepBefore;
        const closures = [];

        if (lumen < 0) {
            for (const category of BALANCE.economy.closureOrder) {
                const candidates = charter.services.activeServices
                    .filter((service) => service.programId !== 'housing' && !service.fixed)
                    .filter((service) => service.program?.need === category)
                    .sort((a, b) => (b.program?.upkeep || 0) - (a.program?.upkeep || 0));
                for (const service of candidates) {
                    if (lumen >= 0) break;
                    const upkeep = charter.services.upkeepFor(service);
                    service.close();
                    lumen += upkeep;
                    closures.push({
                        id: service.id,
                        name: service.name,
                        reason: 'upkeep shortfall',
                        upkeep
                    });
                }
            }
        }

        const upkeepAfter = LumenLedger.projectedUpkeep(charter);
        const net = contributions - upkeepAfter;
        const finalLumen = Math.max(0, lumen);
        charter.lumen = finalLumen;

        report.contributions = contributions;
        report.upkeep = upkeepAfter;
        report.upkeepBefore = upkeepBefore;
        report.net = net;
        report.lumenAfter = finalLumen;
        report.closures = closures;

        return {
            contributions,
            upkeep: upkeepAfter,
            net,
            lumen: finalLumen,
            closures
        };
    }
}
