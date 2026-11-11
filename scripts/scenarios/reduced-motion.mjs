/**
 * Reduced motion is a persisted display preference, toggled from the pause
 * menu. It does not alter the simulation or the day length.
 */
export default async function ({ page, assert, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2'); localStorage.removeItem('falesc.motion.v1')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    assert.equal(await page.evaluate("document.documentElement.classList.contains('is-reduced-motion')"), false);

    await page.click('[data-testid=hud-menu]');
    await page.click('[data-testid=motion-toggle]');
    assert.equal(await page.evaluate("document.documentElement.classList.contains('is-reduced-motion')"), true);
    assert.equal(await page.evaluate("localStorage.getItem('falesc.motion.v1')"), 'reduced');
    assert.equal(await page.text('[data-testid=motion-toggle]'), 'Motion: reduced');
    await page.pause(300);
    await screenshot('reduced-motion.png');

    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    assert.equal(await page.evaluate("document.documentElement.classList.contains('is-reduced-motion')"), true);
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.click('[data-testid=hud-menu]');
    assert.equal(await page.text('[data-testid=motion-toggle]'), 'Motion: reduced');
    await page.click('[data-testid=motion-toggle]');
    assert.equal(await page.evaluate("document.documentElement.classList.contains('is-reduced-motion')"), false);
    assert.equal(await page.evaluate("localStorage.getItem('falesc.motion.v1')"), 'full');
    await page.pause(300);
}
