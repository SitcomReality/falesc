/**
 * Player service retrofit: one paid upgrade adds capacity, quality and upkeep,
 * survives save/reload and changes the report economy.
 */
export default async function ({ page, assert, log, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'contest')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    const built = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const cell = window.__falesc.findFreeCell('canteen');
        if (!cell) return { ok: false };
        const result = app.charter.build({ programId: 'canteen', sectorId: cell.sectorId, u: cell.u, v: cell.v, name: 'Our Canteen' });
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
        return { capacity: service.capacity, upkeep: app.charter.services.upkeepFor(service), lumen: app.charter.player.lumen, quality: service.qualityBonus || 0 };
    })()`);
    log(JSON.stringify({ before }));
    assert.equal(before.capacity, 4);
    assert.equal(await page.visible('[data-testid=structure-upgrade]'), true);
    await screenshot('retrofit-offer.png');

    await page.click('[data-testid=structure-upgrade]');
    const after = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const service = app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(built.id)});
        return { capacity: service.capacity, level: service.level, finish: service.finish, quality: service.qualityBonus, upkeep: app.charter.services.upkeepFor(service), lumen: app.charter.player.lumen };
    })()`);
    log(JSON.stringify({ after }));
    assert.equal(after.capacity, before.capacity + 2);
    assert.equal(after.level, 2);
    assert.equal(after.finish, 'grand');
    assert.ok(after.quality > 0);
    assert.equal(after.upkeep, before.upkeep + 1);
    assert.equal(after.lumen, before.lumen - 6);
    await screenshot('retrofit-done.png');

    await page.evaluate("window.__falesc.app.saveGame()");
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    const restored = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const service = app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(built.id)});
        return { capacity: service.capacity, level: service.level, quality: service.qualityBonus, upkeep: app.charter.services.upkeepFor(service) };
    })()`);
    log(JSON.stringify({ restored }));
    assert.equal(restored.capacity, before.capacity + 2);
    assert.equal(restored.level, 2);
    assert.equal(restored.upkeep, before.upkeep + 1);
    await page.pause(400);
}
