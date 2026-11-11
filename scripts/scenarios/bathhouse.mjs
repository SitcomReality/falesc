/**
 * The Bathhouse is the fifth buildable service: a two-by-two care building that
 * serves Rest and Company and stays open late.
 */
export default async function ({ page, assert, log, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    const dock = await page.evaluate("({ visible: !!document.querySelector('[data-testid=program-bathhouse]'), shortcut: document.querySelector('[data-testid=program-bathhouse]')?.getAttribute('aria-keyshortcuts') })");
    assert.equal(dock.visible, true);
    assert.equal(dock.shortcut, '5');

    const built = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const cell = window.__falesc.findFreeCell('bathhouse');
        if (!cell) return { ok: false };
        const result = app.charter.build({ programId: 'bathhouse', sectorId: cell.sectorId, u: cell.u, v: cell.v, name: 'The Bathhouse' });
        app.syncViews();
        return { ok: result.ok, id: result.service?.id, capacity: result.service?.capacity, footprint: result.service?.cells?.length };
    })()`);
    log(JSON.stringify({ built }));
    assert.equal(built.ok, true);
    assert.equal(built.capacity, 5);
    assert.equal(built.footprint, 4);
    await page.evaluate(`(() => { const app = window.__falesc.app; const service = app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(built.id)}); if (service) { app.world.camera.position.x = service.container.x; app.world.camera.position.y = service.container.y; app.world.camera.zoom = 0.9; app.world.camera.updateTransform(); } })()`);
    await page.pause(500);
    await screenshot('bathhouse-planning.png');

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
    const report = await page.evaluate("window.__falesc.snapshot()");
    const service = await page.evaluate(`(() => { const entry = window.__falesc.app.charter.services.services.find((s) => s.id === ${JSON.stringify(built.id)}); return { state: entry?.state, capacity: entry?.capacity, visits: entry?.visits, programId: entry?.programId }; })()`);
    log(JSON.stringify({ report: { visits: report.report.visits }, service }));
    assert.equal(service.state, 'ACTIVE');
    assert.equal(service.capacity, 5);
    assert.ok(service.visits > 0, 'the Bathhouse should receive visits');
    assert.ok(await page.text('[data-testid=report-screen]').then((text) => text.includes('Bathhouse')));
    await screenshot('bathhouse-report.png');

    await page.evaluate("window.__falesc.app.saveGame()");
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    const restored = await page.evaluate(`(() => { const entry = window.__falesc.app.charter.services.services.find((s) => s.id === ${JSON.stringify(built.id)}); return { state: entry?.state, capacity: entry?.capacity, visits: entry?.visits }; })()`);
    assert.equal(restored.state, 'ACTIVE');
    assert.equal(restored.capacity, 5);
    await page.pause(500);
}
