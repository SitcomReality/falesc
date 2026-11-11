/**
 * The service record names the residents whose last visit was here. Clicking a
 * name opens that resident's card.
 */
export default async function ({ page, assert, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    const built = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const cell = window.__falesc.findFreeCell('canteen');
        const result = app.charter.build({ programId: 'canteen', sectorId: cell.sectorId, u: cell.u, v: cell.v, name: 'Regulars Canteen' });
        app.syncViews();
        return { ok: result.ok, id: result.service.id };
    })()`);
    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    await page.evaluate("window.__falesc.app.beginNextDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    const setup = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const service = app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(built.id)});
        app.serviceCard.show(service);
        return { names: app.charter.activeResidents.filter((resident) => resident.memory?.lastChoice?.serviceId === service.id).map((resident) => resident.name) };
    })()`);
    assert.ok(setup.names.length > 0, 'at least one resident should have last visited');
    const text = await page.text('[data-testid=structure-modal]');
    assert.ok(text.includes('Last seen here'));
    assert.ok(text.includes(setup.names[0]));
    await page.pause(300);
    await screenshot('service-regulars.png');
    await page.click(`[data-resident-id]`);
    await page.waitFor("window.__falesc.app.residentCard.isOpen === true");
    assert.ok((await page.text('[data-testid=resident-modal]')).includes(setup.names[0]));
    await page.click('[data-testid=resident-close]');
    await page.waitFor("window.__falesc.app.residentCard.isOpen === false");
}
