/**
 * Persistence scenario: play one turn, reload the page, and continue the saved
 * charter from the menu. Run with:
 *   webgame_smoke --scenario scripts/scenarios/persistence.mjs
 */
export default async function ({ page, assert, screenshot, log }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v1')");
    await page.reload();
    await page.click('[data-testid=menu-start]');
    await page.waitFor("document.querySelector('[data-testid=lobby-screen]') !== null");
    await page.evaluate("(() => { const i = document.querySelector('[data-testid=lobby-seed]'); i.value='424242'; i.dispatchEvent(new Event('change',{bubbles:true})); return i.value; })()");
    await page.click('[data-testid=lobby-start]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING' && window.__falesc.snapshot().sectors > 0");

    await page.evaluate("(() => { const c = window.__falesc.findFreeCell(); window.__falesc.app.onWorldTap(c.x,c.y); return c; })()");
    await page.click('[data-testid=build-submit]');
    await page.pause(250);
    await page.click('[data-testid=end-turn]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING' && window.__falesc.snapshot().turn === 2", 6000);

    const before = await page.evaluate(`(() => {
        const s = window.__falesc.snapshot();
        const save = JSON.parse(localStorage.getItem('falesc.save.v1'));
        return { turn: s.turn, lumen: s.lumen, buildings: s.buildings, states: s.buildingStates, seed: s.seed, saveTurn: save && save.turn, saveBuildings: save && save.buildings.length };
    })()`);
    log(JSON.stringify(before));
    assert.equal(before.turn, 2);
    assert.equal(before.buildings, 1);
    assert.equal(before.saveTurn, 2);
    assert.equal(before.saveBuildings, 1);

    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    assert.ok(await page.visible('[data-testid=menu-continue]'), 'Continue should be visible after a reload with a save');
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");

    const after = await page.evaluate(`(() => {
        const s = window.__falesc.snapshot();
        return { turn: s.turn, lumen: s.lumen, buildings: s.buildings, states: s.buildingStates, seed: s.seed, dayLimit: s.dayLimit };
    })()`);
    log(JSON.stringify(after));
    assert.equal(after.turn, 2);
    assert.equal(after.lumen, before.lumen);
    assert.equal(after.buildings, 1);
    assert.equal(after.states[0], 'RESERVED');
    assert.equal(after.seed, 424242);

    await screenshot('continued.png');
}
