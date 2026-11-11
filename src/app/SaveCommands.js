import { GamePhase } from '../state/GamePhase.js';

/** Export, import and write the local save for the current charter. */
export function exportSave(game) {
    const text = game.saveManager.exportText();
    if (!text) {
        game.gameScreen?.toast('There is no charter to export yet.', 'coral');
        return false;
    }
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `falesc-save-day-${game.charter?.day || 1}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    game.gameScreen?.toast('Charter exported.', 'mint', 1800);
    return true;
}

export function importSave(game, text) {
    const result = game.saveManager.importText(text);
    if (!result.ok) return result;
    if (game.screenStateMachine.state !== GamePhase.MENU) game.disposeCharter();
    const loaded = game.continueCharter();
    if (!loaded) return { ok: false, error: 'The imported charter could not be loaded.' };
    return { ok: true };
}

export function saveGame(game) {
    if (!game.charter) return false;
    if (![GamePhase.PLAYING, GamePhase.REPORT].includes(game.screenStateMachine.state)) return false;
    return game.saveManager.write({
        phase: game.screenStateMachine.state,
        settings: { ...game.settings },
        charter: game.charter.serialize(),
        camera: {
            x: game.world.camera.position.x,
            y: game.world.camera.position.y,
            zoom: game.world.camera.zoom
        }
    });
}
