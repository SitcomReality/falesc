/**
 * One active resident asks for one need each day. Meeting it earns a little
 * affinity; missing it is recorded in the report and journal.
 */
export default async function ({ page, assert, log, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    const initial = await page.evaluate("window.__falesc.app.charter.request");
    log(JSON.stringify({ initial }));
    assert.ok(initial);
    assert.ok(await page.visible('[data-testid=daily-request]'));
    assert.ok((await page.text('[data-testid=daily-request]')).includes(initial.residentName));
    await page.pause(300);
    await screenshot('daily-request.png');

    await page.click('[data-testid=daily-request]');
    await page.waitFor("window.__falesc.app.residentCard.isOpen === true");
    await page.click('[data-testid=resident-close]');
    await page.waitFor("window.__falesc.app.residentCard.isOpen === false");

    await page.evaluate(`(() => {
        const app = window.__falesc.app;
        app.charter.request.needId = 'wonder';
        app.charter.request.needName = 'Wonder';
        app.gameScreen.updateHud(true);
    })()`);
    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    const report = await page.evaluate("window.__falesc.snapshot()");
    assert.equal(report.report.request.status, 'missed');
    const text = await page.text('[data-testid=report-screen]');
    assert.ok(text.includes('asked for Wonder'));
    assert.ok(text.includes('unmet'));
    await page.pause(300);
    await screenshot('daily-request-report.png');
}
