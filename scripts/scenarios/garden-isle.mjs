/**
 * The Contest has a third buildable shard: a garden isle linked to the home
 * shuttle pad. Player services there are private chapter works, not commons.
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
            home: charter.homeSector.id,
            commons: charter.commonsSector?.id,
            garden: charter.gardenSector?.id,
            enabled: Boolean(charter.map.gardenEnabled),
            transit: charter.transit
        };
    })()`);
    log(JSON.stringify({ setup }));
    assert.ok(setup.garden && setup.garden !== setup.home && setup.garden !== setup.commons);
    assert.equal(setup.enabled, true);
    assert.ok(setup.transit.garden);

    const built = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const charter = app.charter;
        const sector = charter.gardenSector;
        for (let v = 0; v < sector.gridSize; v++) {
            for (let u = 0; u < sector.gridSize; u++) {
                if (!charter.services.canPlace('canteen', sector.id, u, v).ok) continue;
                const result = charter.build({ programId: 'canteen', sectorId: sector.id, u, v, name: 'Garden Canteen' });
                if (!result.ok) return { ok: false, reason: result.reason };
                app.syncViews();
                const pos = sector._project(u + 0.5, v + 0.5);
                app.world.camera.position.x = pos.x;
                app.world.camera.position.y = pos.y;
                app.world.camera.zoom = 0.95;
                app.world.camera.updateTransform();
                return { ok: true, id: result.service.id, sectorId: result.service.sectorId, chapterId: result.service.chapterId };
            }
        }
        return { ok: false, reason: 'no garden plot' };
    })()`);
    log(JSON.stringify({ built }));
    assert.equal(built.ok, true, built.reason);
    assert.equal(built.sectorId, setup.garden);
    assert.equal(built.chapterId, 'player');
    await page.pause(500);
    await screenshot('garden-isle-planning.png');

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
        return { service: { state: service?.state, visits: service?.visits, sectorId: service?.sectorId } };
    })()`);
    log(JSON.stringify({ report }));
    assert.equal(report.service.state, 'ACTIVE');
    assert.equal(report.service.sectorId, setup.garden);
    assert.ok(report.service.visits > 0, 'residents should shuttle to the garden isle');
    await page.pause(300);
    await screenshot('garden-isle-report.png');

    await page.evaluate("window.__falesc.app.saveGame()");
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    const restored = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const service = app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(built.id)});
        return { garden: app.charter.gardenSector?.id, enabled: Boolean(app.charter.map.gardenEnabled), transit: app.charter.transit.garden, sectorId: service?.sectorId };
    })()`);
    assert.equal(restored.garden, setup.garden);
    assert.equal(restored.enabled, true);
    assert.ok(restored.transit);
    assert.equal(restored.sectorId, setup.garden);
}
