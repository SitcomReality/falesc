import { GamePhase } from '../state/GamePhase.js';
import { SERVICE_HOURS_BY_ID } from '../services/ServicePolicies.js';

/** Build placement and the service commands the card, dock and menus invoke. */
export function finalizeBuild(game, name, finish) {
    const charter = game.charter;
    if (!charter || !game.pendingBuildLocation) return { ok: false, error: 'Choose a free plot first.' };
    if (game.screenStateMachine.state !== GamePhase.PLAYING) return { ok: false, error: 'The day has already begun.' };
    const result = charter.build({
        programId: game.selectedProgramId,
        sectorId: game.pendingBuildLocation.sectorId,
        u: game.pendingBuildLocation.u,
        v: game.pendingBuildLocation.v,
        name,
        finish
    });
    if (!result.ok) return result;
    game.pendingBuildLocation = null;
    game.hintDismissed = true;
    game.syncViews();
    game.audio.play('build');
    game.gameScreen.toast(`${result.service.name} breaks ground — opens tomorrow.`, 'mint');
    game.saveGame();
    return { ok: true };
}

export function renameService(game, service, name) {
    if (!game.charter) return { ok: false, error: 'No charter.' };
    const result = game.charter.renameService(service, name);
    if (!result.ok) return result;
    game.saveGame();
    game.gameScreen.toast(`${result.name} it is.`, 'mint', 1600);
    return result;
}

export function repairAllServices(game) {
    if (!game.charter) return { ok: false, error: 'No charter.' };
    const result = game.charter.repairAllServices();
    if (!result.ok) return { ok: false, error: 'Every service is already in good repair.' };
    game.saveGame();
    game.gameScreen.updateHud(true);
    game.gameScreen.toast(`${result.count} service${result.count === 1 ? '' : 's'} repaired for ${result.spent} lumen.`, 'mint', 2200);
    return result;
}

export function repairService(game, service) {
    if (!game.charter) return { ok: false, error: 'No charter.' };
    const result = game.charter.repairService(service);
    if (!result.ok) return result;
    game.gameScreen.updateHud(true);
    game.saveGame();
    game.gameScreen.toast(`${service.name} is back in good repair.`, 'mint', 1800);
    return result;
}

export function addFloor(game, service, planId) {
    if (!game.charter) return { ok: false, error: 'No charter.' };
    const result = game.charter.addFloor(service, planId);
    if (!result.ok) return result;
    game.crowd.sync();
    game.gameScreen.updateHud(true);
    game.saveGame();
    game.gameScreen.toast(`${service.name} rises to ${service.floors} floors · ${result.plan?.name || 'new floor'}.`, 'mint', 2200);
    return result;
}

export function setServiceFocus(game, service, focusId) {
    if (!game.charter) return { ok: false, error: 'No charter.' };
    const result = game.charter.setServiceFocus(service, focusId);
    if (!result.ok) return result;
    game.saveGame();
    game.gameScreen.toast(`${service.name} now leans ${result.focus.name.toLowerCase()}.`, 'mint', 1800);
    return result;
}

export function setServiceAccess(game, service, accessId) {
    if (!game.charter) return { ok: false, error: 'No charter.' };
    const result = game.charter.setServiceAccess(service, accessId);
    if (!result.ok) return result;
    game.gameScreen.updateHud(true);
    game.saveGame();
    game.gameScreen.toast(`${service.name} now welcomes ${accessId === 'open' ? 'everyone equally' : accessId === 'chapter' ? 'its chapter first' : 'visitors first'}.`, 'mint', 2000);
    return result;
}

export function setServiceVibe(game, service, vibeId) {
    if (!game.charter) return { ok: false, error: 'No charter.' };
    const result = game.charter.setServiceVibe(service, vibeId);
    if (!result.ok) return result;
    game.gameScreen.updateHud(true);
    game.saveGame();
    game.gameScreen.toast(`${service.name} feels more ${vibeId}.`, 'mint', 1800);
    return result;
}

export function setServiceHours(game, service, hoursId) {
    if (!game.charter) return { ok: false, error: 'No charter.' };
    const result = game.charter.setServiceHours(service, hoursId);
    if (!result.ok) return result;
    game.gameScreen.updateHud(true);
    game.saveGame();
    game.gameScreen.toast(`${service.name} switches to ${SERVICE_HOURS_BY_ID[hoursId]?.name || hoursId}.`, 'mint', 2000);
    return result;
}

export function upgradeService(game, service, moduleId) {
    if (!game.charter) return { ok: false, error: 'No charter.' };
    const result = game.charter.upgradeService(service, moduleId);
    if (!result.ok) return result;
    game.syncViews();
    game.gameScreen.updateHud(true);
    game.saveGame();
    game.gameScreen.toast(`${service.name} reopens with a grander finish.`, 'mint', 2200);
    return result;
}

export function dismantleService(game, service) {
    if (!game.charter) return { ok: false, reason: 'No charter.' };
    const result = game.charter.dismantle(service);
    if (!result.ok) return result;
    game.syncViews();
    game.gameScreen.toast(`${result.name} dismantled — +${result.refund} lumen.`, 'sun');
    game.saveGame();
    return result;
}

export function reopenService(game, service) {
    if (!game.charter) return { ok: false, reason: 'No charter.' };
    const result = game.charter.reopen(service);
    if (!result.ok) return result;
    game.syncViews();
    game.gameScreen.toast(`${service.name} reopens — −${result.cost} lumen.`, 'mint');
    game.saveGame();
    return result;
}
