/**
 * Day visitors: transient people who arrive in the Contest, use services, pay
 * their way in lumen, and leave without joining the resident roster or vote.
 */
export default async function ({ page, assert, log, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'contest')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    const before = await page.evaluate("window.__falesc.snapshot()");
    assert.equal(before.visitors, 0, 'visitors arrive with the day, not during planning');
    assert.equal(before.population, 9, 'three residents per Contest chapter before visitors');

    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    const during = await page.evaluate("({ snapshot: window.__falesc.snapshot(), agents: window.__falesc.app.crowd.agents.size, present: window.__falesc.app.charter.presentResidents.length })");
    log(JSON.stringify({ during: { visitors: during.snapshot.visitors, agents: during.agents, present: during.present } }));
    assert.ok(during.snapshot.visitors >= 2, 'at least two day visitors should arrive');
    assert.equal(during.snapshot.population, 9, 'visitors do not join the resident population');
    assert.equal(during.present, 9 + during.snapshot.visitors);
    assert.equal(during.agents, during.present, 'every visitor gets a crowd agent');
    await page.pause(300);
    await screenshot('visitors-day.png');

    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    const report = await page.evaluate("window.__falesc.snapshot()");
    log(JSON.stringify({ report: { visitors: report.report.visitors, visits: report.report.visits, visitorFees: report.report.visitorFees, playerVisitorFees: report.report.playerVisitorFees, byChapter: report.report.visitorFeesByChapter } }));
    assert.ok(report.report.visitors >= 2);
    assert.ok(report.report.visits > 0, 'visitors and residents should visit services');
    assert.ok(report.report.visitorFees > 0, 'visitors should pay for at least one visit');
    const feeSum = Object.values(report.report.visitorFeesByChapter || {}).reduce((sum, value) => sum + value, 0);
    assert.equal(feeSum, report.report.visitorFees);
    assert.ok(await page.text('[data-testid=report-screen]').then((text) => text.includes('day visitors')));
    await screenshot('visitors-report.png');

    await page.evaluate("window.__falesc.app.beginNextDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    const next = await page.evaluate("window.__falesc.snapshot()");
    assert.equal(next.visitors, 0, 'day visitors leave when the next day begins');
}
