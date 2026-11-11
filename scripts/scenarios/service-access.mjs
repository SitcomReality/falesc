/**
 * Service access is a welcome policy, not exclusion: everyone can enter, but
 * the room reads better to the chapter, to visitors, or to everyone equally.
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
        const result = app.charter.build({ programId: 'canteen', sectorId: cell.sectorId, u: cell.u, v: cell.v, name: 'Welcome Canteen' });
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
        return { access: service.policy?.access, capacity: service.capacity };
    })()`);
    assert.equal(before.access, 'open');
    await page.evaluate("(() => { const select = document.querySelector('[data-testid=service-access]'); select.value = 'visitors'; select.dispatchEvent(new Event('change', { bubbles: true })); })()");
    await page.waitFor("window.__falesc.app.serviceCard.isOpen === true");
    const after = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const service = app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(built.id)});
        return { access: service.policy?.access, capacity: service.capacity };
    })()`);
    log(JSON.stringify({ after }));
    assert.equal(after.access, 'visitors');
    assert.equal(after.capacity, before.capacity);
    assert.ok(await page.text('[data-testid=structure-modal]').then((text) => text.includes('Visitors first')));
    await page.evaluate("(() => { const select = document.querySelector('[data-testid=service-access]'); select.value = 'care'; select.dispatchEvent(new Event('change', { bubbles: true })); })()");
    await page.waitFor("window.__falesc.app.serviceCard.isOpen === true");
    const care = await page.evaluate(`(() => { const service = window.__falesc.app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(built.id)}); return service?.policy?.access; })()`);
    assert.equal(care, 'care');
    assert.ok(await page.text('[data-testid=structure-modal]').then((text) => text.includes('Care first')));
    await screenshot('service-access.png');

    await page.evaluate("window.__falesc.app.saveGame()");
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    const restored = await page.evaluate(`(() => { const service = window.__falesc.app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(built.id)}); return service?.policy?.access; })()`);
    assert.equal(restored, 'care');
    await page.pause(400);
}
