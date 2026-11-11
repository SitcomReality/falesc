/**
 * A working service can grow two extra floors: one more capacity each, one more
 * upkeep, and a visible floor plaque above the building.
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
        const cell = window.__falesc.findFreeCell('canteen');
        const result = app.charter.build({ programId: 'canteen', sectorId: cell.sectorId, u: cell.u, v: cell.v, name: 'Storey Canteen' });
        app.syncViews();
        return { ok: result.ok, id: result.service?.id };
    })()`);
    assert.equal(built.ok, true);

    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    await page.evaluate("window.__falesc.app.beginNextDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    const before = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const service = app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(built.id)});
        app.serviceCard.show(service);
        return { capacity: service.capacity, floors: service.floors, upkeep: app.charter.services.upkeepFor(service), lumen: app.charter.player.lumen };
    })()`);
    log(JSON.stringify({ before }));
    await page.click('[data-testid=structure-floor]');
    await page.waitFor("window.__falesc.app.serviceCard.isOpen === true");
    const after = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const service = app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(built.id)});
        return { capacity: service.capacity, floors: service.floors, upkeep: app.charter.services.upkeepFor(service), lumen: app.charter.player.lumen };
    })()`);
    log(JSON.stringify({ after }));
    assert.equal(after.floors, 2);
    assert.equal(after.capacity, before.capacity + 1);
    assert.equal(after.upkeep, before.upkeep + 1);
    assert.equal(after.lumen, before.lumen - 4);
    await screenshot('service-floors-two.png');

    await page.click('[data-testid=structure-floor]');
    await page.waitFor("window.__falesc.app.serviceCard.isOpen === true");
    const top = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const service = app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(built.id)});
        return { floors: service.floors, capacity: service.capacity, button: Boolean(document.querySelector('[data-testid=structure-floor]:not([hidden])')) };
    })()`);
    log(JSON.stringify({ top }));
    assert.equal(top.floors, 3);
    assert.equal(top.capacity, before.capacity + 2);
    assert.equal(top.button, false, 'the floor button hides at three floors');
    await screenshot('service-floors-top.png');
    await page.click('[data-testid=structure-cancel]');
    await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const service = app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(built.id)});
        const pos = service.sector._project(service.u + 0.5, service.v + 0.5);
        app.world.camera.position.x = pos.x;
        app.world.camera.position.y = pos.y;
        app.world.camera.zoom = 1.1;
        app.world.camera.updateTransform();
    })()`);
    await page.pause(500);
    await screenshot('service-floors-world.png');

    await page.evaluate("window.__falesc.app.saveGame()");
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    const restored = await page.evaluate(`(() => { const service = window.__falesc.app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(built.id)}); return { floors: service?.floors, capacity: service?.capacity }; })()`);
    assert.equal(restored.floors, 3);
    assert.equal(restored.capacity, before.capacity + 2);
    await page.pause(400);
}
