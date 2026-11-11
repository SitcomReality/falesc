/**
 * The Observatory is the eighth buildable service: a two-by-two night building
 * for Wonder, open evening and night.
 */
export default async function ({ page, assert, log, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    const dock = await page.evaluate("({ present: Boolean(document.querySelector('[data-testid=program-observatory]')), shortcut: document.querySelector('[data-testid=program-observatory]')?.getAttribute('aria-keyshortcuts') })");
    assert.equal(dock.present, true);
    assert.equal(dock.shortcut, '8');
    await page.pause(300);
    await screenshot('observatory-dock.png');

    const built = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const cell = window.__falesc.findFreeCell('observatory');
        if (!cell) return { ok: false, reason: 'no plot' };
        const result = app.charter.build({ programId: 'observatory', sectorId: cell.sectorId, u: cell.u, v: cell.v, name: 'The Long View' });
        app.syncViews();
        if (!result.ok) return { ok: false, reason: result.reason };
        const pos = result.service.sector._project(result.service.u + 1, result.service.v + 1);
        app.world.camera.position.x = pos.x;
        app.world.camera.position.y = pos.y;
        app.world.camera.zoom = 0.9;
        app.world.camera.updateTransform();
        return { ok: true, id: result.service.id, capacity: result.service.capacity, cost: result.cost, footprint: result.service.cells.length };
    })()`);
    log(JSON.stringify({ built }));
    assert.equal(built.ok, true, built.reason);
    assert.equal(built.capacity, 3);
    assert.equal(built.cost, 6);
    assert.equal(built.footprint, 4);
    await page.pause(500);
    await screenshot('observatory-planning.png');

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
    assert.ok(report.service.visits > 0, 'residents should visit the Observatory');
    await page.pause(400);
    await screenshot('observatory-report.png');

    await page.evaluate("window.__falesc.app.saveGame()");
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    const restored = await page.evaluate(`(() => { const service = window.__falesc.app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(built.id)}); return { state: service?.state, capacity: service?.capacity, visits: service?.visits }; })()`);
    assert.equal(restored.state, 'ACTIVE');
    assert.equal(restored.capacity, 3);
    assert.equal(restored.visits, report.service.visits);
    await page.pause(600);
}
