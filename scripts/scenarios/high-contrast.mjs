/**
 * High contrast is a persisted display preference, toggled from the pause menu.
 */
export default async function ({ page, assert, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2'); localStorage.removeItem('falesc.contrast.v1')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    assert.equal(await page.evaluate("document.documentElement.classList.contains('is-high-contrast')"), false);
    await page.click('[data-testid=hud-menu]');
    await page.click('[data-testid=contrast-toggle]');
    assert.equal(await page.evaluate("document.documentElement.classList.contains('is-high-contrast')"), true);
    assert.equal(await page.evaluate("localStorage.getItem('falesc.contrast.v1')"), 'high');
    assert.equal(await page.text('[data-testid=contrast-toggle]'), 'Contrast: high');
    await page.pause(300);
    await screenshot('high-contrast.png');
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    assert.equal(await page.evaluate("document.documentElement.classList.contains('is-high-contrast')"), true);
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.click('[data-testid=hud-menu]');
    await page.click('[data-testid=contrast-toggle]');
    assert.equal(await page.evaluate("document.documentElement.classList.contains('is-high-contrast')"), false);
    assert.equal(await page.evaluate("localStorage.getItem('falesc.contrast.v1')"), 'normal');
    await page.pause(300);
}
