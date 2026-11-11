/** Commons Beacon, capital, purse and Assembly commands invoked from the UI. */
export function showCommons(game) {
    if (!game.charter?.commons) return false;
    game.commonsModal.show(game.charter);
    return true;
}

export function contributeCapital(game, amount) {
    if (!game.charter) return { ok: false, reason: 'No charter.' };
    const result = game.charter.contributeCapital(amount);
    if (!result.ok) return result;
    game.gameScreen.updateHud(true);
    game.saveGame();
    game.audio.play('mint');
    game.gameScreen.toast(`${result.gave} lumen into the shared capital budget.`, 'mint', 2200);
    return result;
}

export function contributePurse(game, amount) {
    if (!game.charter) return { ok: false, reason: 'No charter.' };
    const result = game.charter.contributePurse(amount);
    if (!result.ok) return result;
    game.gameScreen.updateHud(true);
    game.saveGame();
    game.audio.play('mint');
    game.gameScreen.toast(`${result.gave} lumen into the commons purse.`, 'mint', 2200);
    return result;
}

export function nominateCommonsPolicy(game, policyId) {
    if (!game.charter) return { ok: false, reason: 'No charter.' };
    const result = game.charter.nominateCommonsPolicy(policyId);
    if (!result.ok) return result;
    game.gameScreen.updateHud(true);
    game.saveGame();
    game.gameScreen.toast(`${result.policy.name} is on the ballot.`, 'mint', 2200);
    return result;
}

export function callSecondReading(game) {
    if (!game.charter) return { ok: false, reason: 'No charter.' };
    const result = game.charter.callSecondReading();
    if (!result.ok) return result;
    game.gameScreen.updateHud(true);
    game.saveGame();
    game.gameScreen.toast('The second reading is open.', 'mint', 2400);
    return result;
}

export function resolveCommonsAssembly(game) {
    if (!game.charter) return { ok: false, reason: 'No charter.' };
    const result = game.charter.resolveCommonsAssembly();
    if (!result.ok) return result;
    game.syncViews();
    game.gameScreen.updateHud(true);
    game.saveGame();
    game.gameScreen.toast(`${result.policy.name} wins the Commons Assembly.`, 'mint', 2600);
    return result;
}

export function upgradeCommons(game) {
    if (!game.charter) return { ok: false, reason: 'No charter.' };
    const result = game.charter.upgradeCommons();
    if (!result.ok) return result;
    game.gameScreen.updateHud(true);
    game.saveGame();
    game.gameScreen.toast('The Beacon gains an annex.', 'mint', 2200);
    return result;
}

export function contributeCommons(game, amount) {
    if (!game.charter) return { ok: false, reason: 'No charter.' };
    const result = game.charter.contributeCommons(game.charter.player, amount);
    if (!result.ok) return result;
    game.gameScreen.updateHud(true);
    game.saveGame();
    if (result.activated) {
        game.gameScreen.toast('The Commons Beacon is lit — every resident rests a little easier.', 'mint', 2600);
    }
    return result;
}
