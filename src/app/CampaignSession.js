import { GamePhase } from '../state/GamePhase.js';
import { STEWARDSHIP_BY_ID } from '../confluence/Stewardship.js';
import { writeLegacy } from '../confluence/StewardshipLegacy.js';

/** Campaign promises, sponsored bells and the post-vote stewardship choice. */
export function showCampaign(game) {
    if (!game.charter?.campaign?.active) return false;
    game.campaignModal.show(game.charter.campaign, game.charter);
    return true;
}

export function sponsorCampaign(game, needId) {
    if (!game.charter) return { ok: false, reason: 'No charter.' };
    const result = game.charter.sponsorCampaign(needId);
    if (!result.ok) return result;
    game.gameScreen.updateHud(true);
    game.saveGame();
    game.audio.play('build');
    game.gameScreen.toast('A sponsored bell joins the festival.', 'mint', 2200);
    return result;
}

export function chooseCampaignPledge(game, pledgeId) {
    if (!game.charter) return { ok: false };
    const result = game.charter.setCampaignPledge(pledgeId);
    if (!result.ok) return result;
    game.campaignModal.hide();
    game.gameScreen.updateHud(true);
    game.gameScreen.toast(`Campaign promise: ${game.charter.campaign.playerPledgeName}.`, 'mint', 2200);
    game.saveGame();
    return result;
}

export function showConfluence(game) {
    if (!game.charter?.confluenceReady) return false;
    game.screenStateMachine.setState(GamePhase.CONFLUENCE);
    return true;
}

export function showStewardship(game) {
    if (!game.charter?.ending?.confluence || game.charter.ending.outcome !== 'victory') return false;
    game.screenStateMachine.setState(GamePhase.STEWARDSHIP);
    return true;
}

export function chooseStewardship(game, policyId) {
    const policy = STEWARDSHIP_BY_ID[policyId];
    if (!policy || !game.charter?.ending?.confluence || game.charter.ending.outcome !== 'victory') return false;
    if (!game.charter.applyStewardship(policy)) return false;
    writeLegacy({ policyId, chapterName: game.charter.player.name, day: game.charter.day });
    game.finishCharter();
    return true;
}
