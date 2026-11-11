import { BALANCE } from '../design/balance.js';
import { VisitorFactory } from '../residents/VisitorFactory.js';

/** Daily visitor arrivals, referrals, trial stays and departures. */
export function spawnVisitors(charter) {
    if (charter.mode !== 'contest') {
        charter.visitors = [];
        return [];
    }
    const returning = charter.returningVisitors.splice(0, charter.returningVisitors.length);
    for (const visitor of returning) visitor.returned = true;
    charter.lastReferralVisitors = charter.referrals;
    charter.lastFestivalVisitors = charter.campaign?.active ? 1 : 0;
    const count = VisitorFactory.countFor(charter.seed, charter.day) + charter.referrals + charter.lastFestivalVisitors;
    charter.referrals = 0;
    charter.visitors = [...returning, ...VisitorFactory.create(charter.seed, charter.day, count)];
    charter.visitorCell = charter.commonsCell || null;
    return charter.visitors;
}

export function rememberVisitors(charter) {
    const candidates = charter.visitors
        .filter((visitor) => visitor.getAffinity('player') >= BALANCE.visitors.returnAffinity)
        .sort((a, b) => b.getAffinity('player') - a.getAffinity('player'))
        .slice(0, BALANCE.visitors.maxReturning);
    charter.returningVisitors = candidates;
    const charmed = charter.visitors.filter((visitor) => visitor.getAffinity('player') >= BALANCE.visitors.referralAffinity).length;
    if (charmed > 0) {
        charter.referrals = Math.min(1, (charter.referrals || 0) + 1);
        charter.log('visitor', `${charmed} charmed visitor${charmed === 1 ? '' : 's'} will recommend the chapter.`);
    }
}

export function clearVisitors(charter) {
    charter.visitors = [];
}

export function inviteVisitor(charter, visitorId) {
    const visitor = charter.visitors.find((entry) => entry.id === visitorId);
    if (!visitor) return { ok: false, reason: 'That visitor has already left.' };
    if (charter.spareBeds <= 0) return { ok: false, reason: 'There is no spare bed.' };
    if (visitor.getAffinity('player') < BALANCE.visitors.stayAffinity) {
        return { ok: false, reason: 'They did not spend enough time with your chapter.' };
    }
    charter.visitors = charter.visitors.filter((entry) => entry.id !== visitorId);
    visitor.visitor = false;
    visitor.trial = true;
    visitor.active = false;
    visitor.state = 'idle';
    visitor.memory.trialStartDay = charter.day;
    visitor.homeChapterId = 'player';
    visitor.homeServiceId = null;
    charter.services.assignHome(visitor, charter.roster);
    if (!visitor.homeServiceId) return { ok: false, reason: 'The bed could not be assigned.' };
    charter.trialVisitors.push(visitor);
    charter.refreshDerived();
    charter.log('visitor', `${visitor.name} began a trial stay.`);
    return { ok: true, trial: visitor };
}

export function resolveTrialStays(charter) {
    const results = [];
    const pending = [];
    for (const visitor of charter.trialVisitors) {
        if ((visitor.memory?.trialStartDay ?? 0) >= charter.day) {
            pending.push(visitor);
            continue;
        }
        if (visitor.wellbeing >= BALANCE.visitors.trialWellbeing) {
            visitor.trial = false;
            visitor.active = true;
            visitor.state = 'idle';
            charter.roster.push(visitor);
            results.push({ name: visitor.name, outcome: 'stayed', wellbeing: visitor.wellbeing });
            charter.log('visitor', `${visitor.name} passed the trial and stayed.`);
        } else {
            visitor.trial = false;
            visitor.visitor = false;
            visitor.active = false;
            visitor.homeServiceId = null;
            visitor.homeChapterId = 'visitor';
            results.push({ name: visitor.name, outcome: 'left', wellbeing: visitor.wellbeing });
            charter.log('visitor', `${visitor.name} left after the trial.`);
        }
    }
    charter.trialVisitors = pending;
    charter.assignHomes();
    charter.refreshDerived();
    return results;
}
