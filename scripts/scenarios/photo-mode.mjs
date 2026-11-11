/**
 * Photo mode clears the HUD without leaving the planning state.
 */
export default async function ({ page, assert, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    await page.click('[data-testid=hud-menu]');
    await page.click('[data-testid=photo-mode]');
    await page.waitFor("document.body.classList.contains('is-photo-mode')");
    assert.equal(await page.evaluate("window.__falesc.app.photoMode"), true);
    assert.equal(await page.visible('.objective-card'), false);
    assert.ok(await page.visible('[data-testid=photo-exit]'));
    await page.pause(300);
    await screenshot('photo-mode.png');
    await page.click('[data-testid=photo-exit]');
    await page.waitFor("!document.body.classList.contains('is-photo-mode')");
    assert.ok(await page.visible('.objective-card'));
    await page.click('[data-testid=hud-menu]');
    await page.click('[data-testid=photo-mode]');
    await page.waitFor("document.body.classList.contains('is-photo-mode')");
    await page.evaluate("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))");
    await page.waitFor("!document.body.classList.contains('is-photo-mode')");
}
