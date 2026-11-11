/**
 * Shared works draw upkeep from a commons purse filled by every chapter. When
 * the purse cannot cover the day, the shared doors close together.
 */
export default async function ({ page, assert, log, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'contest')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    const built = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const charter = app.charter;
        const sector = charter.commonsSector;
        const placed = [];
        for (const programId of ['bathhouse', 'canteen']) {
            let done = null;
            for (let v = 0; v < sector.gridSize && !done; v++) {
                for (let u = 0; u < sector.gridSize && !done; u++) {
                    if (!charter.services.canPlace(programId, sector.id, u, v).ok) continue;
                    const result = charter.build({ programId, sectorId: sector.id, u, v, name: programId === 'bathhouse' ? 'Commons Baths' : 'Commons Kitchen' });
                    if (result.ok) {
                        placed.push({ id: result.service.id, programId });
                        done = result;
                    }
                }
            }
            if (!done) return { ok: false, reason: programId + ' did not fit' };
        }
        app.syncViews();
        const pos = sector._project(1.5, 1.5);
        app.world.camera.position.x = pos.x;
        app.world.camera.position.y = pos.y;
        app.world.camera.zoom = 0.95;
        app.world.camera.updateTransform();
        return { ok: true, placed };
    })()`);
    log(JSON.stringify({ built }));
    assert.equal(built.ok, true, built.reason);
    await page.pause(400);
    await screenshot('commons-purse-planning.png');

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
        const services = app.charter.sharedWorkServices().map((service) => ({ name: service.name, closed: service.closed, state: service.state }));
        return { purse: app.charter.lastReport?.commonsPurse, upkeep: app.charter.lastReport?.commonsUpkeep, closed: app.charter.lastReport?.commonsClosed, services };
    })()`);
    log(JSON.stringify({ report }));
    assert.equal(report.purse, 0);
    assert.equal(report.upkeep, 4);
    assert.equal(report.closed.length, 2);
    assert.ok(report.services.every((service) => service.closed));
    assert.ok(await page.text('[data-testid=report-screen]').then((text) => text.includes('Commons purse')));
    await page.pause(300);
    await screenshot('commons-purse-report.png');
}
