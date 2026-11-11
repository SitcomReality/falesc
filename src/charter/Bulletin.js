import { BALANCE } from '../design/balance.js';
import { NEEDS } from '../design/needs.js';
import { servesNeed, isOpenAt } from '../design/programs.js';

/**
 * Morning bulletin copy: one unmet need, one people item, optional commons,
 * campaign, rival and trial items, then word of mouth. Pure rendering over the
 * charter; it owns no state.
 */
export function buildBulletin(charter, arrivals = [], rivalMoves = charter.lastRivalMoves || []) {

    const items = [];
    const residents = charter.activeResidents;
    const averages = {};
    for (const need of NEEDS) {
        averages[need.id] = residents.length
            ? residents.reduce((sum, resident) => sum + resident.needs[need.id], 0) / residents.length
            : 0;
    }
    const topNeed = NEEDS.reduce((best, need) => (!best || averages[need.id] > averages[best.id] ? need : best), null);
    const urgentCount = topNeed ? residents.filter((resident) => resident.needs[topNeed.id] >= BALANCE.needs.bulletinThreshold).length : 0;
    const matching = topNeed ? charter.allServices.filter((service) => servesNeed(service.program, topNeed.id)) : [];
    const openNow = matching.filter((service) => service.state === 'ACTIVE' && !service.closed && !service.program?.passive && isOpenAt(service.program, 'morning'));
    const later = matching.filter((service) => service.state === 'ACTIVE' && !service.closed && !service.program?.passive && !isOpenAt(service.program, 'morning'));
    const passive = matching.filter((service) => service.state === 'ACTIVE' && !service.closed && service.program?.passive);
    const pending = matching.filter((service) => service.state === 'PENDING');
    const closed = matching.filter((service) => service.closed);
    let serviceHint = `Nobody serves ${topNeed?.short?.toLowerCase()} yet.`;
    if (topNeed?.id === 'rest' && passive.length > 0) serviceHint = 'Residents recover Rest in their own beds overnight.';
    else if (openNow.length > 0) serviceHint = `${charter.serviceLabel(openNow[0])} is open now.`;
    else if (pending.length > 0) serviceHint = `${charter.serviceLabel(pending[0])} opens tomorrow.`;
    else if (closed.length > 0) serviceHint = `${charter.serviceLabel(closed[0])} is closed after an upkeep shortfall.`;
    else if (later.length > 0) serviceHint = `${charter.serviceLabel(later[0])} opens later today.`;

    items.push({
        kicker: 'Unmet need',
        title: topNeed ? `${topNeed.name} is on everyone's mind` : 'A quiet morning',
        text: topNeed
            ? `${urgentCount} Tidelanders need ${topNeed.short.toLowerCase()}. ${serviceHint}`
            : 'No one is urgent yet. The day is yours.'
    });

    if (charter.lastReport?.departures?.length && arrivals.length > 0) {
        items.push({
            kicker: 'People',
            title: `${arrivals.length} arrive, ${charter.lastReport.departures.length} leave`,
            text: `${arrivals.map((arrival) => arrival.name).join(', ')} find beds; ${charter.lastReport.departures.map((departure) => departure.name).join(', ')} leave.`
        });
    } else if (charter.lastReport?.departures?.length) {
        const departure = charter.lastReport.departures[0];
        items.push({
            kicker: 'Departure',
            title: charter.lastReport.departures.length === 1 ? `${departure.name} left` : `${charter.lastReport.departures.length} Tidelanders left`,
            text: departure.reason
        });
    } else if (arrivals.length > 0) {
        items.push({
            kicker: 'Arrivals',
            title: arrivals.length === 1 ? `${arrivals[0].name} arrives` : `${arrivals.length} Tidelanders arrive`,
            text: 'New faces at the Welcome Post, looking for a bed and a reason to stay.'
        });
    } else if (charter.lastReport?.complaints?.length) {
        const complaint = charter.lastReport.complaints[0];
        items.push({
            kicker: 'Complaint',
            title: complaint.residentName,
            text: complaint.text
        });
    } else {
        items.push({
            kicker: 'The chapter',
            title: `${charter.population} residents, ${charter.spareBeds} spare beds`,
            text: charter.spareBeds > 0
                ? 'There is room for someone new. Housing is the first invitation.'
                : 'Every bed is taken. Build housing before more people can stay.'
        });
    }

    if (charter.lastCapitalGifts?.length) {
        items.push({
            kicker: 'Commons capital',
            title: 'The commons fills its purse',
            text: `${charter.lastCapitalGifts.map((gift) => gift.chapterName).join(' and ')} put lumen into the shared capital budget.`
        });
    }

    for (const trial of charter.lastTrialResults || []) {
        items.push({
            kicker: 'Trial stay',
            title: trial.outcome === 'stayed' ? `${trial.name} stays` : `${trial.name} returns to the drift`,
            text: trial.outcome === 'stayed'
                ? 'The trial day was enough. A bed is theirs by right now.'
                : 'The trial day was not the right fit. They leave with the evening shuttle.'
        });
    }

    if (charter.legacyNote && charter.day === 1) {
        items.push({
            kicker: 'A legacy',
            title: charter.legacy.policyId === 'universal_care' ? 'Universal Care'
                : charter.legacy.policyId === 'open_table' ? 'The Open Table'
                    : charter.legacy.policyId === 'commons_assembly' ? 'The Commons Assembly'
                        : 'The Garden Charter',
            text: charter.legacyNote
        });
    }

    if (charter.commons.active && charter.commons.activatedDay === charter.day) {
        items.push({
            kicker: 'The commons',
            title: 'The Commons Beacon rises',
            text: 'Every chapter put something in. The shared tower is lit, and the whole archipelago sleeps a little easier.'
        });
    }

    if (charter.campaign?.active) {
        const event = charter.campaignEvent;
        const rivalPromises = charter.rivals
            .map((rival) => {
                const pledge = charter.campaign.pledgeFor(rival.id);
                return pledge ? `${rival.name}: ${pledge.name}` : null;
            })
            .filter(Boolean);
        items.push({
            kicker: 'Campaign',
            title: event ? `Campaign: ${event.title}` : charter.campaign.playerPledgeName ? `Your promise: ${charter.campaign.playerPledgeName}` : 'Choose a campaign promise',
            text: `${event ? `${event.blurb} ` : ''}${rivalPromises.length ? `The rivals are promising: ${rivalPromises.join('; ')}.` : 'The archipelago is listening for a promise.'}`
        });
    }

    if (rivalMoves?.length) {
        const first = rivalMoves[0];
        const moveText = rivalMoves.map((move) => move.action === 'reopened'
            ? `${move.chapterName} reopened ${move.programName}.`
            : `${move.chapterName} put up a ${move.programName}.`).join(' ');
        items.push({
            kicker: 'Rival move',
            title: rivalMoves.length === 1 ? `${first.chapterName} ${first.action}` : 'Rivals make their moves',
            text: `${moveText} The room to be loved just got a little more crowded.`
        });
    }

    const quote = charter.lastReport?.quotes?.[0] || charter.activeResidents.find((resident) => resident.memory.lastChoice)?.memory?.lastChoice;
    items.push({
        kicker: 'Word of mouth',
        title: quote?.resident || quote?.residentName || 'The square',
        text: quote?.text || quote?.reason || 'The island is quiet. Someone is humming near the garden.'
    });

    return {
        day: charter.day,
        items,
        quote: quote?.text || quote?.reason || null
    };
}
