/**
 * Festival days bring one extra visitor because the archipelago is celebrating.
 */
export default async function ({ page, assert, log, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'contest')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    await page.evaluate("window.__falesc.app.charter.day = 12; window.__falesc.app.charter.campaign = { active: true, eventFor: () => null }");
    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    const during = await page.evaluate("({ visitors: window.__falesc.app.charter.visitors.length, surge: window.__falesc.app.charter.lastFestivalVisitors })");
    log(JSON.stringify(during));
    assert.equal(during.surge, 1);
    assert.ok(during.visitors >= 3);
    await page.pause(300);
    await screenshot('festival-surge.png');
}
