/** Inspect and dismantle a service, with a half-cost refund. */
export default async function ({ page, assert, screenshot, log }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    const built = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        app.selectProgram('canteen');
        const cell = window.__falesc.findFreeCell('canteen');
        app.onWorldTap(cell.x, cell.y);
        const result = app.finalizeBuild('Refund Canteen');
        app.buildModal.hide(false);
        return { cell, result, snapshot: window.__falesc.snapshot() };
    })()`);
    log(JSON.stringify(built));
    assert.ok(built.result.ok);
    assert.equal(built.snapshot.services.length, 2);
    assert.equal(built.snapshot.lumen, 6);

    const cell = await page.evaluate(`(() => {
        const service = window.__falesc.app.charter.services.services.find((entry) => entry.programId === 'canteen');
        const sector = window.__falesc.app.world.homeSector;
        const point = sector._project(service.u + 0.5, service.v + 0.5);
        return { x: point.x, y: point.y };
    })()`);
    await page.evaluate(`window.__falesc.app.onWorldTap(${cell.x}, ${cell.y})`);
    assert.ok(await page.visible('[data-testid=structure-modal]'), 'clicking an occupied plot should inspect the service');
    await screenshot('demolition-dialog.png');
    await page.click('[data-testid=structure-demolish]');
    await page.pause(200);

    const after = await page.evaluate("window.__falesc.snapshot()");
    log(JSON.stringify({ before: built.snapshot.lumen, after: after.lumen, services: after.services.length }));
    assert.equal(after.services.length, 1);
    assert.equal(after.lumen, 8, 'dismantling should refund half the 4-lumen canteen cost');

    const free = await page.evaluate(`(() => {
        const service = window.__falesc.app.charter.services.services.find((entry) => entry.programId === 'canteen');
        return !service;
    })()`);
    assert.equal(free, true, 'the canteen should be gone from the model');
}
