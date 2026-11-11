import { BALANCE } from '../design/balance.js';

/**
 * Lumen is civic energy: residents contribute according to wellbeing, services
 * draw upkeep, and a shortfall closes the least essential doors first. The
 * ledger works per chapter so the Contest can charge rivals the same rules.
 */
export class LumenLedger {
    static contributionFor(resident) {
        if (!resident || !resident.active) return 0;
        const wellbeing = resident.wellbeing;
        if (wellbeing >= BALANCE.economy.highWellbeing) return BALANCE.economy.contributionHigh;
        if (wellbeing >= BALANCE.economy.lowWellbeing) return BALANCE.economy.contributionNeutral;
        return BALANCE.economy.contributionLow;
    }

    static residentsFor(chapter, charter) {
        return charter.activeResidents.filter((resident) => resident.homeChapterId === chapter.id);
    }

    static dividendFor(residents, perResident = 0) {
        return residents.length * perResident;
    }

    static projectedContributionsFor(chapter, residents, dividendPerResident = 0) {
        return residents.reduce((sum, resident) => sum + LumenLedger.contributionFor(resident), 0)
            + LumenLedger.dividendFor(residents, dividendPerResident);
    }

    static projectedContributions(charter) {
        const dividend = charter.contest ? BALANCE.contest.civicDividend : 0;
        return LumenLedger.projectedContributionsFor(charter.player, charter.playerResidents, dividend);
    }

    static projectedUpkeepFor(chapter) {
        return chapter.services.totalUpkeep();
    }

    static projectedUpkeep(charter) {
        return LumenLedger.projectedUpkeepFor(charter.player);
    }

    static projectedNetFor(chapter, residents, dividendPerResident = 0) {
        return LumenLedger.projectedContributionsFor(chapter, residents, dividendPerResident) - LumenLedger.projectedUpkeepFor(chapter);
    }

    static projectedNet(charter) {
        const dividend = charter.contest ? BALANCE.contest.civicDividend : 0;
        return LumenLedger.projectedNetFor(charter.player, charter.playerResidents, dividend);
    }

    /**
     * Resolve one chapter's day. Mutates its lumen and service closures. The
     * player gets the same rules as a rival, including housing protection.
     */
    static resolveChapter(chapter, residents, dividendPerResident = 0, visitorFees = 0) {
        const services = chapter.services;
        const dividend = LumenLedger.dividendFor(residents, dividendPerResident);
        const contributions = LumenLedger.projectedContributionsFor(chapter, residents, dividendPerResident);
        const upkeepBefore = LumenLedger.projectedUpkeepFor(chapter);
        const visitorIncome = Math.max(0, Number(visitorFees) || 0);
        let lumen = chapter.lumen + contributions + visitorIncome - upkeepBefore;
        const closures = [];

        if (lumen < 0) {
            for (const category of BALANCE.economy.closureOrder) {
                const candidates = services.activeServices
                    .filter((service) => service.programId !== 'housing' && !service.fixed)
                    .filter((service) => service.program?.need === category)
                    .sort((a, b) => (b.program?.upkeep || 0) - (a.program?.upkeep || 0));
                for (const service of candidates) {
                    if (lumen >= 0) break;
                    const upkeep = services.upkeepFor(service);
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

        const upkeepAfter = LumenLedger.projectedUpkeepFor(chapter);
        const net = contributions + visitorIncome - upkeepAfter;
        const finalLumen = Math.max(0, lumen);
        chapter.lumen = finalLumen;
        return {
            chapterId: chapter.id,
            chapterName: chapter.name,
            isPlayer: Boolean(chapter.isPlayer),
            residents: residents.length,
            dividend,
            contributions,
            visitorFees: visitorIncome,
            upkeep: upkeepAfter,
            upkeepBefore,
            net,
            lumen: finalLumen,
            closures
        };
    }

    static resolveDay(charter, report, visitorFees = {}) {
        const dividend = charter.contest ? BALANCE.contest.civicDividend : 0;
        const summaries = charter.chapters.map((chapter) => {
            const residents = LumenLedger.residentsFor(chapter, charter);
            const fee = Number(visitorFees[chapter.id]) || 0;
            return LumenLedger.resolveChapter(chapter, residents, dividend, fee);
        });
        const player = summaries.find((entry) => entry.isPlayer) || summaries[0];
        const totalVisitorFees = summaries.reduce((sum, entry) => sum + (entry.visitorFees || 0), 0);

        report.contributions = player.contributions;
        report.dividend = player.dividend || 0;
        report.visitorFees = totalVisitorFees;
        report.playerVisitorFees = player.visitorFees || 0;
        report.visitorFeesByChapter = { ...visitorFees };
        report.upkeep = player.upkeep;
        report.upkeepBefore = player.upkeepBefore;
        report.net = player.contributions + (player.visitorFees || 0) - player.upkeep;
        report.lumenAfter = player.lumen;
        report.closures = player.closures;
        report.chapters = (report.chapters || charter.chapters.map((chapter) => ({
            id: chapter.id,
            name: chapter.name,
            colour: chapter.colour,
            isPlayer: Boolean(chapter.isPlayer),
            devotion: 0,
            visits: 0
        }))).map((entry) => {
            const economy = summaries.find((summary) => summary.chapterId === entry.id);
            return economy
                ? { ...entry, contributions: economy.contributions, dividend: economy.dividend, upkeep: economy.upkeep, net: economy.net, lumen: economy.lumen, residents: economy.residents, closures: economy.closures }
                : entry;
        });
        return { summaries, player };
    }
}
