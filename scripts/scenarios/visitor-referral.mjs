/**
 * Charmed visitors who are not staying recommend the chapter, adding one extra
 * visitor to the next day's arrivals.
 */
export default async function ({ page, assert, log, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'contest')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    const before = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const visitor = app.charter.visitors[0];
        visitor.affinity.player = 0.3;
        app.charter.rememberVisitors();
        return { referrals: app.charter.referrals, visitor: visitor.name };
    })()`);
    log(JSON.stringify({ before }));
    assert.equal(before.referrals, 1);
    await page.evaluate("window.__falesc.app.beginNextDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    const during = await page.evaluate("({ visitors: window.__falesc.snapshot().visitors, referrals: window.__falesc.app.charter.referrals, referred: window.__falesc.app.charter.lastReferralVisitors })");
    log(JSON.stringify({ during }));
    assert.equal(during.referrals, 0);
    assert.equal(during.referred, 1);
    assert.ok(during.visitors >= 3);
    await page.pause(300);
    await screenshot('visitor-referral.png');
}
