/**
 * The lit Commons Beacon can gain two capital-funded annexes, each adding a seat
 * and nightly comfort. The upgrade is saved with the charter.
 */
export default async function ({ page, assert, log, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'contest')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    const before = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        app.charter.commons.fund = 20;
        app.charter.activateCommons();
        app.charter.commons.capital = 20;
        const service = app.charter.commonsManager.findById(app.charter.commons.serviceId);
        return { level: app.charter.commons.level, capacity: service.capacity };
    })()`);
    assert.equal(before.level, 1);
    await page.evaluate("window.__falesc.app.showCommons()");
    await page.waitFor("window.__falesc.app.commonsModal.isOpen === true");
    assert.ok(await page.visible('[data-testid=commons-annex]'));
    await page.pause(300);
    await screenshot('commons-annex-before.png');
    await page.click('[data-testid=commons-annex]');
    await page.pause(300);
    const after = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const service = app.charter.commonsManager.findById(app.charter.commons.serviceId);
        return { level: app.charter.commons.level, capacity: service.capacity, capital: app.charter.commons.capital, annex: Boolean(document.querySelector('[data-testid=commons-annex]')) };
    })()`);
    log(JSON.stringify({ before, after }));
    assert.equal(after.level, 2);
    assert.equal(after.capacity, before.capacity + 1);
    assert.equal(after.capital, 12);
    assert.equal(after.annex, false);
    await screenshot('commons-annex.png');
    await page.click('[data-testid=commons-close]');
    await page.evaluate("window.__falesc.app.saveGame()");
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    const restored = await page.evaluate("({ level: window.__falesc.app.charter.commons.level, capacity: window.__falesc.app.charter.commonsManager.findById(window.__falesc.app.charter.commons.serviceId).capacity })");
    assert.equal(restored.level, 2);
    assert.equal(restored.capacity, before.capacity + 1);
    await page.pause(300);
}
