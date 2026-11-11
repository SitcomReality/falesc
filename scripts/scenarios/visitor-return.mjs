/**
 * A charmed visitor who is not offered a bed returns on a later day with the
 * same name, memory and affinity.
 */
export default async function ({ page, assert, log, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'contest')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const cell = window.__falesc.findFreeCell('canteen');
        const result = app.charter.build({ programId: 'canteen', sectorId: cell.sectorId, u: cell.u, v: cell.v, name: 'Our Canteen' });
        app.syncViews();
        return result.ok;
    })()`);

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

    const dayTwo = await page.evaluate("window.__falesc.snapshot().report.visitorDetails");
    log(JSON.stringify({ dayTwo }));
    assert.ok(dayTwo.some((visitor) => visitor.affinity >= 0.15), 'a visitor should be charmed by the canteen');

    await page.evaluate("window.__falesc.app.beginNextDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    const remembered = await page.evaluate("window.__falesc.app.charter.returningVisitors.map(v => ({ name: v.name, affinity: v.getAffinity('player') }))");
    log(JSON.stringify({ remembered }));
    assert.ok(remembered.length > 0, 'charmed visitors should be remembered');

    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    const returned = await page.evaluate("window.__falesc.app.charter.visitors.filter(v => v.returned).map(v => ({ name: v.name, affinity: v.getAffinity('player') }))");
    log(JSON.stringify({ returned }));
    assert.ok(returned.length > 0, 'at least one visitor should return');
    await page.pause(300);
    await screenshot('visitor-return-day.png');
    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    assert.ok(await page.text('[data-testid=report-screen]').then((text) => text.includes('returning')));
}
