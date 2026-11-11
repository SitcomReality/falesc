/**
 * The roster can switch between the player's services and every chapter's.
 */
export default async function ({ page, assert, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'contest')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    await page.click('[data-testid=hud-menu]');
    await page.click('[data-testid=open-service-roster]');
    await page.waitFor("window.__falesc.app.serviceRoster.isOpen === true");
    assert.equal(await page.evaluate("document.querySelectorAll('.service-roster__row').length"), 1);
    assert.equal(await page.text('[data-testid=service-roster-all]'), 'All chapters');
    await page.click('[data-testid=service-roster-all]');
    assert.equal(await page.evaluate("document.querySelectorAll('.service-roster__row').length"), 6);
    assert.equal(await page.text('[data-testid=service-roster-all]'), 'Mine only');
    const text = await page.text('[data-testid=service-roster]');
    assert.ok(text.includes('The Gardener'));
    await page.pause(300);
    await screenshot('service-roster-all.png');
}
