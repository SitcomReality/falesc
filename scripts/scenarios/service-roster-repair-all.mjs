/**
 * The service roster can repair every worn player service in one action.
 */
export default async function ({ page, assert, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    await page.evaluate("window.__falesc.app.charter.services.services[0].condition = 40");
    await page.evaluate("window.__falesc.app.gameScreen.updateHud(true)");
    await page.click('[data-testid=hud-menu]');
    await page.click('[data-testid=open-service-roster]');
    await page.waitFor("window.__falesc.app.serviceRoster.isOpen === true");
    assert.ok(await page.visible('[data-testid=service-roster-repair-all]'));
    await page.pause(300);
    await screenshot('service-roster-repair-all.png');
    await page.click('[data-testid=service-roster-repair-all]');
    assert.equal(await page.evaluate("window.__falesc.app.charter.services.services.every((service) => service.condition === 100)"), true);
    assert.equal(await page.evaluate("document.querySelector('[data-testid=service-roster-repair-all]').disabled"), true);
}
