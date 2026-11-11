/**
 * The paper almanac is available before a charter and from the pause menu. It
 * is a read-only reference built from the same design data as the game.
 */
export default async function ({ page, assert, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    await page.click('[data-testid=menu-guide]');
    await page.waitFor("window.__falesc.app.fieldGuide.isOpen === true");
    const menuText = await page.text('[data-testid=field-guide]');
    assert.ok(menuText.includes('How a charter works'));
    assert.ok(menuText.includes('Observatory'));
    assert.ok(menuText.includes('Visitors first'));
    assert.ok(menuText.includes('1–9'));
    assert.ok(menuText.includes('Care and repair'));
    await page.pause(300);
    await screenshot('field-guide-menu.png');
    await page.click('[data-testid=field-guide-done]');
    await page.waitFor("window.__falesc.app.fieldGuide.isOpen === false");

    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    await page.click('[data-testid=hud-menu]');
    await page.waitFor("window.__falesc.app.gameScreen.pausePanel.hidden === false");
    await page.click('[data-testid=open-field-guide]');
    await page.waitFor("window.__falesc.app.fieldGuide.isOpen === true");
    assert.ok(await page.visible('[data-testid=field-guide]'));
    await page.pause(300);
    await screenshot('field-guide-charter.png');
    await page.click('[data-testid=field-guide-close]');
    await page.waitFor("window.__falesc.app.fieldGuide.isOpen === false");
    await page.pause(300);
}
