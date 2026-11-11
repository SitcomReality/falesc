/**
 * Service atmosphere is a free player-set policy. It changes which temperament
 * the room fits, not its seats or upkeep.
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
        const result = app.charter.build({ programId: 'canteen', sectorId: cell.sectorId, u: cell.u, v: cell.v, name: 'Atmosphere Canteen' });
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
        return { vibe: service.policy?.vibe, capacity: service.capacity, upkeep: app.charter.services.upkeepFor(service) };
    })()`);
    log(JSON.stringify({ before }));
    await page.evaluate("(() => { const select = document.querySelector('[data-testid=service-vibe]'); select.value = 'lively'; select.dispatchEvent(new Event('change', { bubbles: true })); })()");
    await page.waitFor("window.__falesc.app.serviceCard.isOpen === true");
    const after = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const service = app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(built.id)});
        return { vibe: service.policy?.vibe, capacity: service.capacity, upkeep: app.charter.services.upkeepFor(service) };
    })()`);
    assert.equal(after.vibe, 'lively');
    assert.equal(after.capacity, before.capacity);
    assert.equal(after.upkeep, before.upkeep);
    assert.ok(await page.text('[data-testid=structure-modal]').then((text) => text.includes('Lively')));
    await screenshot('service-vibe.png');

    await page.evaluate("window.__falesc.app.saveGame()");
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    const restored = await page.evaluate(`(() => { const service = window.__falesc.app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(built.id)}); return service?.policy?.vibe; })()`);
    assert.equal(restored, 'lively');
    await page.pause(400);
}
