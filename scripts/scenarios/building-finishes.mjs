/**
 * The shell finish chosen at construction changes cost, capacity, upkeep and
 * the resident standard fit. Grand and humble finishes are saved with the
 * service.
 */
export default async function ({ page, assert, log, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    const built = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        app.charter.player.lumen = 30;
        app.charter.works = 2;
        const make = (programId, finish, name) => {
            const cell = window.__falesc.findFreeCell(programId);
            if (!cell) return null;
            const result = app.charter.build({ programId, sectorId: cell.sectorId, u: cell.u, v: cell.v, name, finish });
            return result.ok ? { id: result.service.id, cost: result.cost, capacity: result.service.capacity, upkeepBonus: result.service.upkeepBonus, finish: result.service.finish } : { error: result.reason };
        };
        const grand = make('canteen', 'grand', 'Grand Canteen');
        const humble = make('tea_house', 'humble', 'Humble Tea');
        app.syncViews();
        const pos = app.world.homeSector._project(3.5, 3.5);
        app.world.camera.position.x = pos.x;
        app.world.camera.position.y = pos.y;
        app.world.camera.updateTransform();
        return { grand, humble };
    })()`);
    log(JSON.stringify({ built }));
    assert.equal(built.grand.finish, 'grand');
    assert.equal(built.grand.cost, 6);
    assert.equal(built.grand.capacity, 5);
    assert.equal(built.grand.upkeepBonus, 1);
    assert.equal(built.humble.finish, 'humble');
    assert.equal(built.humble.cost, 4);
    await page.pause(500);
    await screenshot('building-finishes-planning.png');

    await page.evaluate(`(() => { const app = window.__falesc.app; const service = app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(built.grand.id)}); app.serviceCard.show(service); })()`);
    await page.waitFor("window.__falesc.app.serviceCard.isOpen === true");
    const card = await page.text('[data-testid=structure-modal]');
    assert.ok(card.includes('grand'));
    await screenshot('building-finishes-card.png');
    await page.click('[data-testid=structure-close]');

    await page.evaluate("window.__falesc.app.saveGame()");
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    const restored = await page.evaluate(`(() => { const service = window.__falesc.app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(built.grand.id)}); return { finish: service?.finish, capacity: service?.capacity, upkeepBonus: service?.upkeepBonus }; })()`);
    assert.equal(restored.finish, 'grand');
    assert.equal(restored.capacity, 5);
    assert.equal(restored.upkeepBonus, 1);

    const dialog = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        app.charter.player.lumen = 30;
        app.charter.works = 1;
        app.selectProgram('canteen');
        const free = window.__falesc.findFreeCell('canteen');
        if (!free) return false;
        app.keyboardCursor = { sectorId: free.sectorId, u: free.u, v: free.v };
        app.keyboardCursorActive = true;
        app.confirmKeyboardCursor();
        return app.buildModal.isOpen;
    })()`);
    assert.equal(dialog, true);
    await page.click('[data-finish=grand]');
    const dialogText = await page.text('[data-testid=build-modal]');
    assert.ok(dialogText.includes('Grand'));
    await screenshot('building-finishes-dialog.png');
    await page.click('[data-testid=build-submit]');
    const uiBuilt = await page.evaluate("window.__falesc.app.charter.services.services.at(-1)?.finish");
    assert.equal(uiBuilt, 'grand');
    await page.pause(400);
}
