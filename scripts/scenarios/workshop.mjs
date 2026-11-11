/**
 * The Workshop is the tenth service and the only door for Purpose.
 */
export default async function ({ page, assert, log, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    const built = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const cell = window.__falesc.findFreeCell('workshop');
        if (!cell) return { ok: false, reason: 'no plot' };
        const result = app.charter.build({ programId: 'workshop', sectorId: cell.sectorId, u: cell.u, v: cell.v, name: 'The Purpose Bench' });
        app.syncViews();
        for (const resident of app.charter.activeResidents) resident.needs.purpose = 90;
        return { ok: result.ok, id: result.service.id, need: result.service.program.need };
    })()`);
    log(JSON.stringify({ built }));
    assert.equal(built.ok, true);
    assert.equal(built.need, 'purpose');
    await page.pause(300);
    await screenshot('workshop-dock.png');
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
    const report = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const service = app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(built.id)});
        return { visits: service.visits, purpose: app.charter.activeResidents.map((resident) => resident.needs.purpose) };
    })()`);
    log(JSON.stringify({ report }));
    assert.ok(report.visits > 0);
    assert.ok(report.purpose.some((value) => value < 90));
}
