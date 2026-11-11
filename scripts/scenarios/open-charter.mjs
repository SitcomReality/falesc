/**
 * Open Charter is the sandbox mode: no day limit, no victory or defeat, and the
 * same planning, services and residents as First Light.
 */
export default async function ({ page, assert, log, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'open')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    const opened = await page.evaluate("({ mode: window.__falesc.snapshot().mode, dayLimit: window.__falesc.app.charter.dayLimit, dayLabel: document.querySelector('[data-role=day-limit]').textContent, deadline: document.querySelector('[data-role=days-left]').textContent, name: document.querySelector('.objective-card__name').textContent })");
    log(JSON.stringify({ opened }));
    assert.equal(opened.mode, 'open');
    assert.equal(opened.dayLimit, 999);
    assert.equal(opened.dayLabel, '/ open');
    assert.equal(opened.deadline, 'No deadline');
    assert.equal(opened.name, 'Build without a deadline');
    await page.pause(300);
    await screenshot('open-charter.png');

    await page.evaluate("window.__falesc.app.charter.day = 998");
    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    const report = await page.evaluate("window.__falesc.snapshot()");
    assert.equal(report.ending, null);
    assert.ok(report.state === 'REPORT');
    await page.evaluate("window.__falesc.app.beginNextDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    const after = await page.evaluate("window.__falesc.snapshot()");
    assert.equal(after.day, 999);
    assert.equal(after.ending, null);
    await page.pause(300);
}
