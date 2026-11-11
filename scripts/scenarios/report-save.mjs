/** Reloading on the evening report must reopen the same report, not replay the day. */
export default async function ({ page, assert, log }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(4242, 'medium')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    const before = await page.evaluate("window.__falesc.snapshot()");
    const save = await page.evaluate("JSON.parse(localStorage.getItem('falesc.save.v2'))");
    log(JSON.stringify({ before: before.report, phase: save?.phase, saveReport: !!save?.charter?.lastReport }));
    assert.equal(save?.phase, 'REPORT', 'the report should be saved while it is on screen');
    assert.ok(save?.charter?.lastReport, 'the report summary should be in the save');

    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    await page.pause(300);
    const after = await page.evaluate("window.__falesc.snapshot()");
    assert.equal(after.report?.day, before.report?.day);
    assert.equal(after.report?.visits, before.report?.visits);
    assert.equal(after.report?.lumenAfter, before.report?.lumenAfter);
    assert.ok(await page.visible('[data-testid=report-screen]'), 'the report screen should reopen');
    await page.click('[data-testid=report-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    assert.equal(await page.evaluate("window.__falesc.snapshot().day"), 2, 'Begin Day should advance from the restored report');
}
