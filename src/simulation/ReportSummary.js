/**
 * Save-safe report summary. The full report carries playback events and
 * per-visit detail; the summary keeps the evening broadsheet, bulletin quotes
 * and end-screen fields without the timeline.
 */
export function summarizeReport(report) {
    if (!report) return null;
    return {
        day: report.day,
        visits: report.visits,
        hearts: report.hearts,
        heartsGained: report.heartsGained,
        heartsLost: report.heartsLost,
        needs: { ...(report.needs || {}) },
        wellbeing: report.wellbeing,
        flourishing: report.flourishing,
        devotion: report.devotion,
        population: report.population,
        housingCapacity: report.housingCapacity,
        contributions: report.contributions,
        dividend: report.dividend || 0,
        upkeep: report.upkeep,
        net: report.net,
        lumenAfter: report.lumenAfter,
        closures: (report.closures || []).map((entry) => ({ ...entry })),
        complaints: (report.complaints || []).map((entry) => ({ ...entry })),
        arrivals: (report.arrivals || []).map((entry) => ({ ...entry })),
        departures: (report.departures || []).map((entry) => ({ ...entry })),
        quotes: (report.quotes || []).map((entry) => ({ ...entry })),
        serviceVisits: { ...(report.serviceVisits || {}) },
        devotionByChapter: { ...(report.devotionByChapter || {}) },
        patronageByChapter: { ...(report.patronageByChapter || {}) },
        chapters: (report.chapters || []).map((entry) => ({ ...entry })),
        campaignEvent: report.campaignEvent ? { ...report.campaignEvent } : null,
        request: report.request ? { ...report.request } : null,
        visitors: report.visitors || 0,
        visitorFees: report.visitorFees || 0,
        playerVisitorFees: report.playerVisitorFees || 0,
        visitorFeesByChapter: { ...(report.visitorFeesByChapter || {}) },
        visitorDetails: (report.visitorDetails || []).map((visitor) => ({ ...visitor })),
        stayedVisitors: report.stayedVisitors || 0,
        commons: report.commons ? { ...report.commons } : null,
        outcome: report.outcome || null,
        message: report.message,
        ending: report.ending ? { ...report.ending } : null,
        at: report.at
    };
}
