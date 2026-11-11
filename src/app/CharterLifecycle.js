import { Charter } from '../charter/Charter.js';
import { GamePhase } from '../state/GamePhase.js';
import { readLegacy } from '../confluence/StewardshipLegacy.js';
import { readDriftRank } from '../persistence/DriftRank.js';
import { recordCharter, recordFromCharter } from '../persistence/CharterArchive.js';
import { recordMilestones } from '../persistence/MilestoneArchive.js';
import { defaultProgramId } from '../design/programs.js';

/** Starting, restoring, archiving and closing a charter run. */
export function startCharter(game) {
    game.setWorldVisible(true);
    const seed = Number.isInteger(game.settings.mapSeed) ? game.settings.mapSeed : 1;
    const size = game.settings.mapSize || 'medium';
    game.initializeWorld(seed, size);
    const legacy = readLegacy();
    const drift = readDriftRank();
    game.charter = new Charter({
        seed,
        startingLumenBonus: drift.bonus,
        startingBedBonus: drift.beds,
        startingCommonsBonus: drift.commons,
        mapSize: size,
        mode: game.settings.mode || 'first-light',
        chapterName: game.settings.chapterName || 'Home Chapter',
        chapterMotto: game.settings.chapterMotto || '',
        map: game.world.map,
        parentContainer: game.world.objectLayer,
        legacy
    });
    game.crowd.setCharter(game.charter);
    game.patronageFlow.setCharter(game.charter);
    game.transitGate.setCharter(game.charter);
    game.districtOverlay.setCharter(game.charter);
    game.gameScreen?.setPatronageState?.(false);
    game.crowd.sync();
    game.syncViews();
    game.selectedProgramId = defaultProgramId();
    game.hintDismissed = false;
    game.endResult = null;
    game.chatter.reseed(seed);
    game.screenStateMachine.setState(GamePhase.PLAYING);
    game.showBulletin();
    game.saveGame();
    return true;
}

export function continueCharter(game) {
    game._archiveRecorded = false;
    game.setWorldVisible(true);
    const save = game.saveManager.read();
    if (!save?.charter) return false;
    game.settings.mapSeed = save.charter.seed;
    game.settings.mapSize = save.charter.mapSize;
    game.settings.mode = save.charter.mode || 'first-light';
    game.initializeWorld(save.charter.seed, save.charter.mapSize);
    game.charter = Charter.fromSave({
        saved: save.charter,
        map: game.world.map,
        parentContainer: game.world.objectLayer
    });
    game.crowd.setCharter(game.charter);
    game.patronageFlow.setCharter(game.charter);
    game.transitGate.setCharter(game.charter);
    game.districtOverlay.setCharter(game.charter);
    game.gameScreen?.setPatronageState?.(false);
    game.crowd.sync();
    game.syncViews();
    game.selectedProgramId = defaultProgramId();
    game.chatter.reseed(game.charter.seed);
    if (save.camera && Number.isFinite(save.camera.x) && Number.isFinite(save.camera.y)) {
        game.world.camera.position.x = save.camera.x;
        game.world.camera.position.y = save.camera.y;
        game.world.camera.zoom = Math.max(0.15, Math.min(4, save.camera.zoom || 0.5));
        game.world.camera.updateTransform();
    }
    const restorePhase = save.phase === GamePhase.REPORT && game.charter.lastReport
        ? GamePhase.REPORT
        : GamePhase.PLAYING;
    game.screenStateMachine.setState(restorePhase);
    if (restorePhase === GamePhase.PLAYING) {
        game.gameScreen.toast('Charter restored. The day is yours.', 'mint');
    }
    game.saveGame();
    return true;
}

export function initializeWorld(game, seed, size) {
    game.disposeCharter();
    game.world.generate({ seed, size });
    game.crowd.setCharter(null);
    game.selectedProgramId = defaultProgramId();
    game.pendingBuildLocation = null;
    game.world.clearHover();
    game.world.rebuildPaths([]);
}

export function disposeCharter(game) {
    game.playback = null;
    game.crowd.clear();
    if (game.charter) {
        game.charter.services.clear();
        game.charter.rivals.forEach((rival) => rival.services.clear());
        game.charter.commonsManager?.clear();
        game.charter = null;
    }
    game.patronageFlow.hide();
    game.patronageFlow.setCharter(null);
    game.transitGate.clear();
    game.districtOverlay.clear();
    game.clearKeyboardCursor();
    game.visitorCard.hide();
    game.gameScreen?.setPatronageState?.(false);
    game.chatter?.clear();
    game.buildModal.hide(false);
    game.serviceCard.hide();
    game.bulletinModal.hide();
    game.residentCard.hide();
    game.campaignModal.hide();
    game.commonsModal.hide();
    game.retrofitModal.hide();
    game.floorPlan.hide();
    game.fieldGuide.hide();
    game.departureArchive.hide();
    game.charterArchive.hide();
    game.needSurvey.hide();
    game.ledger.hide();
    game.rivalDossier.hide();
    game.journal.hide();
    game.milestones.hide();
    game.residentRoster.hide();
    game.serviceRoster.hide();
    game.gridSummary.hide();
    game.visitorCard.hide();
}

export function archiveFinishedCharter(game) {
    if (!game.charter || game._archiveRecorded) return;
    recordMilestones(game.charter.milestones().filter((entry) => entry.done).map((entry) => entry.id));
    game._archiveRecorded = true;
    recordCharter(recordFromCharter(game.charter, game.endResult || game.charter.ending));
}

export function finishCharter(game) {
    if (!game.charter) return;
    game.endResult = game.charter.ending || { outcome: 'abandon' };
    game.archiveFinishedCharter();
    game.saveManager.clear();
    game.screenStateMachine.setState(GamePhase.END);
}

export function returnToMenu(game) {
    if (!game.charter) return false;
    game.saveGame();
    game.setWorldVisible(false);
    game.screenStateMachine.setState(GamePhase.MENU);
    return true;
}

export function endCharter(game, outcome) {
    if (!game.charter) {
        game.screenStateMachine.setState(GamePhase.MENU);
        return;
    }
    game.charter.ending = {
        outcome,
        day: game.charter.day,
        title: outcome === 'abandon' ? 'You leave the lamps burning.' : 'The charter closes.',
        message: outcome === 'abandon'
            ? 'The charter is closed, but the chapter stands.'
            : 'The charter closes before the commons finds its feet.'
    };
    game.endResult = game.charter.ending;
    game.archiveFinishedCharter();
    game.saveManager.clear();
    game.screenStateMachine.setState(GamePhase.END);
}
