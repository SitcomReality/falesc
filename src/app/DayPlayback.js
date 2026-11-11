import { BALANCE, DAY_PHASES } from '../design/balance.js';
import { defaultProgramId } from '../design/programs.js';
import { GamePhase } from '../state/GamePhase.js';

/** Opening, replaying and finishing a precomputed day. */
export function openDay(game) {
    if (!game.charter || game.screenStateMachine.state !== GamePhase.PLAYING) return false;
    game.clearKeyboardCursor();
    game.audio.play('day');
    if (game.hasBlockingModal()) return false;
    game.world.clearHover();
    game.buildModal.hide(false);
    game.pendingBuildLocation = null;
    game.patronageFlow.hide();
    game.gameScreen.setPatronageState(false);
    game.chatter.clear();
    const simulation = game.charter.openDay();
    // Anyone who left at dusk no longer has an agent on the shard.
    game.crowd.sync();
    const duration = DAY_PHASES.length * BALANCE.playback.phaseSeconds;
    game.playback = {
        clock: 0,
        duration,
        speed: 1,
        report: simulation.report
    };
    game.playbackSpeed = 1;
    game.playbackPaused = false;
    game.crowd.preparePlayback(simulation.events);
    game.dayScreen.setSpeed(1);
    game.dayScreen.update({ day: game.charter.day, phase: DAY_PHASES[0].name, progress: 0 });
    game.screenStateMachine.setState(GamePhase.DAY);
    return true;
}

export function togglePlaybackPause(game) {
    if (game.screenStateMachine.state !== GamePhase.DAY || !game.playback) return false;
    game.playbackPaused = !game.playbackPaused;
    game.dayScreen.setPaused(game.playbackPaused);
    return game.playbackPaused;
}

export function setPlaybackSpeed(game, speed) {
    const next = [1, 2, 4].includes(Number(speed)) ? Number(speed) : 1;
    game.playbackSpeed = next;
    if (game.playback) game.playback.speed = next;
    game.dayScreen.setSpeed(next);
}

export function skipDay(game) {
    if (!game.playback) return;
    game.playback.clock = game.playback.duration;
    game.finishDayPlayback();
}

export function finishDayPlayback(game) {
    if (game.screenStateMachine.state !== GamePhase.DAY) return;
    game.playback = null;
    game.playbackPaused = false;
    game.crowd.resetToPlanningPositions();
    game.screenStateMachine.setState(GamePhase.REPORT);
    game.saveGame();
}

export function beginNextDay(game) {
    if (!game.charter || game.screenStateMachine.state !== GamePhase.REPORT) return false;
    if (game.charter.confluenceReady) {
        game.showConfluence();
        return true;
    }
    if (game.charter.ending) {
        game.finishCharter();
        return true;
    }
    const result = game.charter.beginNextDay();
    if (result.ended) {
        game.finishCharter();
        return true;
    }
    game.selectedProgramId = defaultProgramId();
    game.hintDismissed = false;
    game.crowd.sync();
    game.syncViews();
    game.screenStateMachine.setState(GamePhase.PLAYING);
    if (game.charter.campaign?.active && !game.charter.campaign.playerPledge) {
        game.showCampaign();
    } else {
        game.showBulletin();
    }
    if (result.arrivals?.length) {
        game.gameScreen.toast(`${result.arrivals.length} new Tidelander${result.arrivals.length === 1 ? '' : 's'} at the Welcome Post.`, 'mint');
    }
    for (const trial of result.trialResults || []) {
        game.gameScreen.toast(trial.outcome === 'stayed' ? `${trial.name} passes the trial and stays.` : `${trial.name} leaves after the trial.`, trial.outcome === 'stayed' ? 'mint' : 'coral', 2400);
    }
    game.saveGame();
    return true;
}

export function updatePlayback(game, dt) {
    if (!game.playback || game.playbackPaused) return;
    game.playback.clock += dt * game.playback.speed;
    const clock = Math.min(game.playback.duration, game.playback.clock);
    const phaseSeconds = BALANCE.playback.phaseSeconds;
    const phaseIndex = Math.min(DAY_PHASES.length - 1, Math.floor(clock / phaseSeconds));
    const phase = DAY_PHASES[phaseIndex];
    game.crowd.updatePlayback(clock, dt * game.playback.speed);
    game.charter?.services.update(dt * game.playback.speed);
    game.dayScreen.update({
        day: game.charter?.day || 1,
        phase: phase.name,
        progress: clock / game.playback.duration
    });
    if (clock >= game.playback.duration) game.finishDayPlayback();
}
