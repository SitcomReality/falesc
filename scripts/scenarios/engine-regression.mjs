/**
 * Engine regression: NPC land awareness, camera clamping, and cancellation of
 * a pending turn when the player leaves the game.
 */
export default async function ({ page, assert, log }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v1')");
    await page.reload();
    await page.click('[data-testid=menu-start]');
    await page.waitFor("document.querySelector('[data-testid=lobby-screen]') !== null");
    await page.evaluate("(() => { const i = document.querySelector('[data-testid=lobby-seed]'); i.value='12345'; i.dispatchEvent(new Event('change',{bubbles:true})); return true; })()");
    await page.click('[data-testid=lobby-start]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING' && window.__falesc.snapshot().sectors > 0");

    // Put a structure on the map so NPC building avoidance is exercised too.
    await page.evaluate("(() => { const c = window.__falesc.findFreeCell(); window.__falesc.app.onWorldTap(c.x,c.y); return c; })()");
    await page.click('[data-testid=build-submit]');
    await page.pause(200);

    const npc = await page.evaluate(`(() => {
        const g = window.__falesc.app;
        const controllers = Array.from(g.crowdManager.controllers.values());
        for (let step = 0; step < 3600; step++) {
            for (const controller of controllers) controller.update(0.1);
        }
        const bad = [];
        for (const character of g.characters) {
            const onLand = character.homeSector ? character.homeSector.containsPoint(character.x, character.y) : true;
            const inBuilding = g.buildingManager.isWorldBlocked(character.x, character.y);
            if (!onLand || inBuilding) bad.push({ x: character.x, y: character.y, onLand, inBuilding });
        }
        return { characters: g.characters.length, bad, controllers: controllers.length };
    })()`);
    log(`NPCs: ${npc.characters} checked, ${npc.bad.length} off-land/in-building`);
    assert.equal(npc.bad.length, 0);
    assert.equal(npc.controllers, npc.characters);

    const camera = await page.evaluate(`(() => {
        const c = window.__falesc.app.camera;
        c.position.x = 1e9; c.position.y = -1e9; c.updateTransform();
        const far = { x: c.position.x, y: c.position.y };
        c.position.x = -1e9; c.position.y = 1e9; c.updateTransform();
        const near = { x: c.position.x, y: c.position.y };
        return { far, near, bounds: window.__falesc.app.map.bounds };
    })()`);
    log(`camera clamp: far=(${camera.far.x.toFixed(0)},${camera.far.y.toFixed(0)}) near=(${camera.near.x.toFixed(0)},${camera.near.y.toFixed(0)})`);
    assert.ok(camera.far.x > camera.bounds.minX && camera.far.y < camera.bounds.maxY, 'camera should clamp to world');
    assert.ok(camera.near.x < camera.bounds.maxX && camera.near.y > camera.bounds.minY, 'camera should clamp to world');

    // Leave during the interstitial: the pending turn must be cancelled.
    await page.click('[data-testid=end-turn]');
    await page.waitFor("window.__falesc.snapshot().state === 'INTERSTITIAL'");
    await page.evaluate("window.__falesc.app.stateManager.setState('MENU')");
    await page.pause(2300);
    const stateAfter = await page.evaluate("window.__falesc.snapshot().state");
    log(`state after leaving interstitial: ${stateAfter}`);
    assert.equal(stateAfter, 'MENU');
}
