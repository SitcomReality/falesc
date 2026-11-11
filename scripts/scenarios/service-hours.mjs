/**
 * Player-set service hours trade opening phases against upkeep and quality.
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
        return { hours: service.policy?.hours || 'as_built', upkeep: app.charter.services.upkeepFor(service), quality: service.qualityBonus || 0 };
    })()`);
    log(JSON.stringify({ before }));
    assert.equal(before.hours, 'as_built');
    assert.equal(before.upkeep, 2);
    await screenshot('service-hours-offer.png');

    await page.evaluate(`(() => { const select = document.querySelector('[data-testid=service-hours]'); select.value = 'all_hours'; select.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await page.waitFor("window.__falesc.app.serviceCard.isOpen === true");
    const after = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const service = app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(built.id)});
        return { hours: service.policy?.hours, upkeep: app.charter.services.upkeepFor(service), quality: service.qualityBonus || 0 };
    })()`);
    log(JSON.stringify({ after }));
    assert.equal(after.hours, 'all_hours');
    assert.equal(after.upkeep, before.upkeep + 2);
    assert.ok(await page.text('[data-testid=structure-modal]').then((text) => text.includes('Round the clock')));
    await screenshot('service-hours-set.png');

    await page.evaluate("window.__falesc.app.saveGame()");
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    const restored = await page.evaluate(`(() => { const entry = window.__falesc.app.charter.services.services.find((service) => service.id === ${JSON.stringify(built.id)}); return { hours: entry?.policy?.hours, upkeep: window.__falesc.app.charter.services.upkeepFor(entry) }; })()`);
    assert.equal(restored.hours, 'all_hours');
    assert.equal(restored.upkeep, before.upkeep + 2);
    await page.pause(400);
}
