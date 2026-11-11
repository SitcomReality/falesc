/**
 * The Creche is the ninth buildable service: a 2×2 daytime/evening room for
 * Company with a Rest secondary.
 */
export default async function ({ page, assert, log, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    const dock = await page.evaluate("({ present: Boolean(document.querySelector('[data-testid=program-creche]')), shortcut: document.querySelector('[data-testid=program-creche]')?.getAttribute('aria-keyshortcuts') })");
    assert.equal(dock.present, true);
    assert.equal(dock.shortcut, '8');
    await page.pause(300);
    await screenshot('creche-dock.png');

    const built = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const cell = window.__falesc.findFreeCell('creche');
        if (!cell) return { ok: false, reason: 'no plot' };
        const result = app.charter.build({ programId: 'creche', sectorId: cell.sectorId, u: cell.u, v: cell.v, name: 'The Bright Room' });
        app.syncViews();
        if (!result.ok) return { ok: false, reason: result.reason };
        const pos = result.service.sector._project(result.service.u + 1, result.service.v + 1);
        app.world.camera.position.x = pos.x;
        app.world.camera.position.y = pos.y;
        app.world.camera.zoom = 0.95;
        app.world.camera.updateTransform();
        return { ok: true, id: result.service.id, capacity: result.service.capacity, cost: result.cost, footprint: result.service.cells.length };
    })()`);
    log(JSON.stringify({ built }));
    assert.equal(built.ok, true, built.reason);
    assert.equal(built.capacity, 4);
    assert.equal(built.cost, 5);
    assert.equal(built.footprint, 4);
    await page.pause(500);
    await screenshot('creche-planning.png');

    for (let day = 1; day <= 2; day++) {
        await page.evaluate("window.__falesc.openDay()");
        await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
        await page.evaluate("window.__falesc.skipDay()");
        await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
        if (day === 1) {
            await page.evaluate("window.__falesc.app.beginNextDay()");
            await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
            await page.evaluate("window.__falesc.app.bulletinModal.hide()");
        }
    }
    const report = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const service = app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(built.id)});
        return { visits: app.charter.lastReport?.visits, service: { state: service?.state, visits: service?.visits, capacity: service?.capacity } };
    })()`);
    assert.equal(report.service.state, 'ACTIVE');
    assert.equal(report.service.capacity, 4);
    assert.ok(report.service.visits > 0, 'residents should visit the Creche');
    await page.pause(400);
    await screenshot('creche-report.png');
}
