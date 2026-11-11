import { BALANCE } from '../design/balance.js';
import { Campaign } from '../confluence/Campaign.js';
import { RivalChapter } from '../chapters/RivalChapter.js';
import { ResidentFactory } from '../residents/ResidentFactory.js';
import { VisitorFactory } from '../residents/VisitorFactory.js';
import { summarizeReport } from '../simulation/ReportSummary.js';

/** The canonical save shape for a charter. Keep this versioned with SaveManager. */
export function serializeCharter(charter) {
    return {
        seed: charter.seed,
        mapSize: charter.mapSize,
        mode: charter.mode,
        chapterName: charter.name,
        day: charter.day,
        dayLimit: charter.dayLimit,
        lumen: charter.lumen,
        works: charter.works,
        flourishing: charter.flourishing,
        devotion: charter.devotion,
        ending: charter.ending,
        confluenceReady: charter.confluenceReady,
        campaign: charter.campaign?.toJSON() || null,
        returningVisitors: charter.returningVisitors.map((visitor) => visitor.toJSON()),
        trialVisitors: charter.trialVisitors.map((visitor) => visitor.toJSON()),
        legacy: charter.legacy,
        transit: {
            home: charter.transit.home ? { ...charter.transit.home } : null,
            commons: charter.transit.commons ? { ...charter.transit.commons } : null,
            garden: charter.transit.garden ? { ...charter.transit.garden } : null
        },
        commons: {
            ...charter.commons,
            service: charter.commonsManager?.serialize() || []
        },
        pendingArrivals: charter.pendingArrivals,
        referrals: charter.referrals,
        lastReport: summarizeReport(charter.lastReport),
        history: charter.history.slice(-60),
        journal: charter.journal.slice(-120),
        request: charter.request ? { ...charter.request } : null,
        residents: charter.roster.map((resident) => resident.toJSON()),
        services: charter.services.serialize(),
        rivals: charter.rivals.map((rival) => rival.toJSON())
    };
}

/** Rehydrate a charter in place. Unknown or missing pieces fall back to a fresh run. */
export function restoreCharter(charter, saved) {
    charter.mode = saved.mode || 'first-light';
    const chapterName = String(saved.chapterName ?? '').replace(/\s+/g, ' ').trim().slice(0, 32);
    charter.name = chapterName || 'Home Chapter';
    charter.player.name = charter.name;
    charter.day = saved.day || 1;
    charter.dayLimit = saved.dayLimit || BALANCE.dayLimits[charter.mapSize] || 14;
    charter.lumen = Number.isFinite(saved.lumen) ? saved.lumen : BALANCE.startingLumen;
    charter.works = Number.isFinite(saved.works) ? saved.works : BALANCE.worksPerDay;
    charter.ending = saved.ending || null;
    charter.confluenceReady = Boolean(saved.confluenceReady);
    charter.campaign = Campaign.fromJSON(saved.campaign, charter.seed);
    charter.pendingArrivals = Array.isArray(saved.pendingArrivals) ? saved.pendingArrivals : [];
    charter.referrals = Math.max(0, Math.min(1, Number(saved.referrals) || 0));
    charter.roster = ResidentFactory.fromSave(saved.residents || []);
    if (charter.roster.length === 0) charter.roster = ResidentFactory.createRoster(charter.seed, BALANCE.rosterSize);
    charter.services.restore(saved.services || []);
    if (Array.isArray(saved.rivals)) {
        charter.rivals = saved.rivals.map((entry) => {
            const rival = new RivalChapter({
                ...entry,
                map: charter.map,
                parentContainer: charter.services.parentContainer,
                occupancy: charter.occupancy
            });
            rival.services.restore(entry.services || []);
            return rival;
        });
    } else if (charter.mode === 'contest') {
        charter.createRivals();
    }
    charter.lastRivalMoves = charter.rivals.map((rival) => rival.lastMove).filter(Boolean);
    charter.returningVisitors = VisitorFactory.restore(saved.returningVisitors || []);
    charter.trialVisitors = VisitorFactory.restoreTrial(saved.trialVisitors || []);
    if (saved.transit?.home && saved.transit?.commons) {
        charter.transit = {
            home: { ...saved.transit.home },
            commons: { ...saved.transit.commons },
            garden: saved.transit.garden ? { ...saved.transit.garden } : null
        };
        charter.reserveTransit(charter.transit.home);
        charter.reserveTransit(charter.transit.commons);
        charter.reserveTransit(charter.transit.garden);
    }
    if (saved.commons) {
        const serviceEntries = Array.isArray(saved.commons.service) ? saved.commons.service : [];
        charter.commons = {
            level: Math.max(1, Number(saved.commons.level) || 1),
            target: saved.commons.target || BALANCE.commons.target,
            fund: Number(saved.commons.fund) || 0,
            purse: Number(saved.commons.purse) || 0,
            capital: Number(saved.commons.capital) || 0,
            capitalContributors: { ...(saved.commons.capitalContributors || {}) },
            active: Boolean(saved.commons.active),
            contributors: { ...(saved.commons.contributors || {}) },
            activatedDay: saved.commons.activatedDay || null,
            serviceId: saved.commons.serviceId || null,
            policy: saved.commons.policy || null,
            chosenDay: saved.commons.chosenDay || null,
            assembly: saved.commons.assembly ? {
                ...charter.commons.assembly,
                ...saved.commons.assembly,
                nominations: { ...(saved.commons.assembly.nominations || {}) },
                finalists: [...(saved.commons.assembly.finalists || [])],
                votes: [...(saved.commons.assembly.votes || [])],
                counts: { ...(saved.commons.assembly.counts || {}) },
                petition: saved.commons.assembly.petition || charter.commons.assembly.petition
            } : charter.commons.assembly
        };
        if (charter.commonsManager) charter.commonsManager.restore(serviceEntries);
    } else if (charter.contest) {
        charter.setupCommons();
    }
    if (charter.commonsSector && (!charter.transit.home || !charter.transit.commons)) {
        charter.setupTransit();
    }
    if (charter.commons.active && !charter.commons.policy && charter.commons.assembly.stage === 'none') {
        charter.commons.assembly.stage = 'nominations';
    }
    charter.commonsCell = charter.findCommonsCell(charter.homeSector);
    charter.refreshAdjacency();
    charter.assignHomes();
    charter.refreshDerived();
    charter.report = null;
    charter.lastReport = saved.lastReport || null;
    charter.history = Array.isArray(saved.history) ? saved.history.slice(-60) : [];
    charter.journal = Array.isArray(saved.journal) ? saved.journal.slice(-120) : [];
    charter.request = saved.request ? { ...saved.request } : charter.buildDailyRequest();
    charter.bulletin = charter.buildBulletin(charter.pendingArrivals, charter.lastRivalMoves);
}
