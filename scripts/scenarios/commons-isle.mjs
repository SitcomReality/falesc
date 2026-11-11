/**
 * The outer commons isle is a second buildable shard. Residents reach it by
 * shuttle; a Bathhouse built there is visited across the void and persisted.
 */
export default async function ({ page, assert, log, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'contest')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    const setup = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const charter = app.charter;
        return {
            commons: charter.commonsSector?.id || null,
            home: charter.homeSector.id,
            enabled: Boolean(charter.map.commonsEnabled),
            transit: charter.transit,
            gate: charter.services.serviceAt(charter.transit.home.sectorId, charter.transit.home.u, charter.transit.home.v)?.isTransit || false
        };
    })()`);
    log(JSON.stringify({ setup }));
    assert.ok(setup.commons && setup.commons !== setup.home);
    assert.equal(setup.enabled, true);
    assert.ok(setup.transit.home && setup.transit.commons);
    assert.equal(setup.gate, true);

    const built = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const charter = app.charter;
        const sector = charter.commonsSector;
        for (let v = 0; v < sector.gridSize; v++) {
            for (let u = 0; u < sector.gridSize; u++) {
                const check = charter.services.canPlace('bathhouse', sector.id, u, v);
                if (!check.ok) continue;
                const result = charter.build({ programId: 'bathhouse', sectorId: sector.id, u, v, name: 'Commons Baths' });
                app.syncViews();
                const pos = sector._project(u + 0.5, v + 0.5);
                app.world.camera.position.x = pos.x;
                app.world.camera.position.y = pos.y;
                app.world.camera.zoom = 0.95;
                app.world.camera.updateTransform();
                return { ok: result.ok, reason: result.reason || null, id: result.service?.id, sectorId: result.service?.sectorId, u, v };
            }
        }
        return { ok: false, reason: 'no space on the commons isle' };
    })()`);
    log(JSON.stringify({ built }));
    assert.equal(built.ok, true, built.reason);
    assert.equal(built.sectorId, setup.commons);
    await page.pause(500);
    await screenshot('commons-isle-planning.png');

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
        return { visits: app.charter.lastReport?.visits, service: { state: service?.state, visits: service?.visits, sectorId: service?.sectorId } };
    })()`);
    log(JSON.stringify({ report }));
    assert.equal(report.service.state, 'ACTIVE');
    assert.equal(report.service.sectorId, setup.commons);
    assert.ok(report.service.visits > 0, 'residents should shuttle to the commons isle');
    assert.ok(await page.text('[data-testid=report-screen]').then((text) => text.includes('Commons Baths')));
    await screenshot('commons-isle-report.png');

    await page.evaluate("window.__falesc.app.saveGame()");
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    const restored = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const service = app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(built.id)});
        return { sectorId: service?.sectorId, transit: app.charter.transit, enabled: Boolean(app.charter.map.commonsEnabled) };
    })()`);
    assert.equal(restored.sectorId, setup.commons);
    assert.ok(restored.transit.home && restored.transit.commons);
    assert.equal(restored.enabled, true);
    await page.pause(400);
}
