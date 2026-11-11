/**
 * A campaign opens a temporary free Festival Kitchen on the home shard.
 */
export default async function ({ page, assert, log, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'contest')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    const opened = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        app.charter.day = 12;
        app.charter.startCampaign();
        const service = app.charter.services.services.find((entry) => entry.programId === 'festival_kitchen');
        return service ? {
            name: service.name,
            state: service.state,
            capacity: service.capacity,
            upkeep: app.charter.services.upkeepFor(service),
            cells: service.cells.length,
            id: service.id
        } : null;
    })()`);
    log(JSON.stringify({ opened }));
    assert.ok(opened);
    assert.equal(opened.name, 'Festival Kitchen');
    assert.equal(opened.state, 'ACTIVE');
    assert.equal(opened.capacity, 5);
    assert.equal(opened.upkeep, 0);
    assert.equal(opened.cells, 1);
    await page.evaluate(`window.__falesc.app.serviceCard.show(window.__falesc.app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(opened.id)}))`);
    await page.pause(300);
    await screenshot('festival-kitchen.png');
    await page.evaluate("window.__falesc.app.serviceCard.hide()");
    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    const removed = await page.evaluate("window.__falesc.app.charter.removeFestivalKitchen()");
    assert.equal(removed, true);
    assert.equal(await page.evaluate("window.__falesc.app.charter.services.services.some((entry) => entry.programId === 'festival_kitchen')"), false);
}
