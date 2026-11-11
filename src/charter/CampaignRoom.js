/**
 * The final-days campaign: festival kitchen, sponsored bells and the promise
 * the chapter carries into the Confluence vote.
 */

import { Campaign } from '../confluence/Campaign.js';
import { chooseCampaignPledge } from '../chapters/RivalAI.js';
import { ConfluenceVote } from '../confluence/ConfluenceVote.js';
import { PLEDGE_BY_ID } from '../confluence/Pledges.js';

export function startCampaign(charter) {
    if (!charter.contest || charter.campaign) return charter.campaign;
    const campaign = new Campaign({
        startedDay: charter.day,
        dayLimit: charter.dayLimit,
        seed: charter.seed
    });
    campaign.rivalPledges = Object.fromEntries(
        charter.rivals.map((rival) => [rival.id, chooseCampaignPledge(rival, charter, campaign)])
    );
    charter.campaign = campaign;
    charter.spawnFestivalKitchen();
    return charter.campaign;
}
export function festivalKitchenNeed(charter) {
    return charter.campaign?.eventsFor?.(charter.day)?.[0]?.need || 'sustenance';
}

export function updateFestivalKitchenNeed(charter) {
    const service = charter.services.services.find((entry) => entry.programId === 'festival_kitchen');
    if (!service || !charter.campaign?.active) return false;
    service.setNeedOverride(charter.festivalKitchenNeed());
    return true;
}

export function spawnFestivalKitchen(charter) {
    if (charter.services.services.some((service) => service.programId === 'festival_kitchen')) return null;
    const sector = charter.homeSector;
    if (!sector) return null;
    for (let v = 0; v < sector.gridSize; v++) {
        for (let u = 0; u < sector.gridSize; u++) {
            const check = charter.services.canPlace('festival_kitchen', sector.id, u, v);
            if (!check.ok) continue;
            const result = charter.services.place({
                programId: 'festival_kitchen',
                sectorId: sector.id,
                u,
                v,
                name: 'Festival Kitchen',
                state: 'ACTIVE',
                fixed: true
            });
            if (result.ok) {
                result.service.festival = true;
                result.service.setNeedOverride(charter.festivalKitchenNeed());
                charter.log('campaign', 'A Festival Kitchen opened for the celebration.');
                charter.refreshDerived();
                return result.service;
            }
        }
    }
    return null;
}

export function removeFestivalKitchen(charter) {
    const service = charter.services.services.find((entry) => entry.programId === 'festival_kitchen');
    if (!service) return false;
    charter.services.remove(service);
    charter.refreshDerived();
    return true;
}

export function resolveConfluence(charter, pledgeId) {
    if (!charter.confluenceReady) return null;
    const result = ConfluenceVote.tally(charter, pledgeId);
    charter.removeFestivalKitchen();
    charter.confluenceReady = false;
    charter.ending = result.ending;
    charter.refreshDerived();
    return result;
}

export function applyStewardship(charter, policy) {
    if (!policy || !charter.ending?.confluence || charter.ending.outcome !== 'victory') return false;
    charter.stewardship = { ...policy };
    charter.ending.stewardship = { ...policy };
    return true;
}

export function sponsorCampaign(charter, needId) {
    if (!charter.campaign?.active) return { ok: false, reason: 'There is no festival to sponsor.' };
    if (charter.campaign.sponsored) return { ok: false, reason: 'Your chapter already sponsored a bell.' };
    if (charter.lumen < 5) return { ok: false, reason: 'A sponsored bell costs 5 lumen.' };
    const event = charter.campaign.sponsor(needId, charter.day);
    if (!event) return { ok: false, reason: 'That needs a festival bell.' };
    charter.lumen -= 5;
    charter.refreshDerived();
    return { ok: true, event, cost: 5 };
}

export function setCampaignPledge(charter, pledgeId) {
    if (!charter.campaign?.active) return { ok: false, reason: 'The campaign has not started.' };
    if (!PLEDGE_BY_ID[pledgeId]) return { ok: false, reason: 'That is not a campaign promise.' };
    charter.campaign.setPlayerPledge(pledgeId);
    charter.log('campaign', `Campaign promise: ${charter.campaign.playerPledgeName}.`);
    return { ok: true, campaign: charter.campaign };
}
