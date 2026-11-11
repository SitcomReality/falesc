/**
 * The Clinic is the sixth buildable service: a two-by-two care building for
 * Rest with a little Sustenance, open morning through evening.
 */
export default async function ({ page, assert, log, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    const dock = await page.evaluate(`(() => { const card = document.querySelector('[data-testid=program-clinic]'); return { present: Boolean(card), shortcut: card?.getAttribute('aria-keyshortcuts') || null }; })()`);
    log(JSON.stringify({ dock }));
    assert.equal(dock.present, true);
    assert.equal(dock.shortcut, '6');
    await screenshot('clinic-dock.png');

    const built = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const cell = window.__falesc.findFreeCell('clinic');
        if (!cell) return { ok: false, reason: 'no plot' };
        const result = app.charter.build({ programId: 'clinic', sectorId: cell.sectorId, u: cell.u, v: cell.v, name: 'Neighbourhood Clinic' });
        app.syncViews();
        if (!result.ok) return { ok: false, reason: result.reason };
        const pos = result.service.sector._project(result.service.u + 1, result.service.v + 1);
        app.world.camera.position.x = pos.x;
        app.world.camera.position.y = pos.y;
        app.world.camera.zoom = 1;
        app.world.camera.updateTransform();
        return { ok: true, id: result.service.id, capacity: result.service.capacity, cost: result.cost, footprint: result.service.cells.length };
    })()`);
    log(JSON.stringify({ built }));
    assert.equal(built.ok, true, built.reason);
    assert.equal(built.capacity, 3);
    assert.equal(built.cost, 5);
    assert.equal(built.footprint, 4);
    await page.pause(500);
    await screenshot('clinic-planning.png');

    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    await page.evaluate("window.__falesc.app.beginNextDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    const report = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const service = app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(built.id)});
        return { visits: app.charter.lastReport?.visits, service: { state: service?.state, visits: service?.visits, capacity: service?.capacity } };
    })()`);
    log(JSON.stringify({ report }));
    assert.equal(report.service.state, 'ACTIVE');
    assert.equal(report.service.capacity, 3);
    assert.ok(report.service.visits > 0, 'residents should visit the Clinic');
    await page.pause(400);
    await screenshot('clinic-report.png');

    await page.evaluate("window.__falesc.app.saveGame()");
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    const restored = await page.evaluate(`(() => { const service = window.__falesc.app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(built.id)}); return { state: service?.state, capacity: service?.capacity, visits: service?.visits }; })()`);
    assert.equal(restored.state, 'ACTIVE');
    assert.equal(restored.capacity, 3);
    assert.equal(restored.visits, report.service.visits);
}
