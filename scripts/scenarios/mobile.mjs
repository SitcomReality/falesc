/** Capture the main screens at a narrow phone viewport for layout review. */
export default async function ({ page, screenshot, assert }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v1')");
    await page.reload();
    await screenshot('mobile-menu.png');
    await page.click('[data-testid=menu-start]');
    await page.waitFor("document.querySelector('[data-testid=lobby-screen]') !== null");
    await screenshot('mobile-lobby.png');
    await page.click('[data-testid=lobby-start]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.pause(400);
    await screenshot('mobile-hud.png');

    await page.evaluate("(() => { const c = window.__falesc.findFreeCell(); window.__falesc.app.onWorldTap(c.x,c.y); return c; })()");
    await page.waitFor("window.__falesc.snapshot().buildModalOpen === true");
    await screenshot('mobile-modal.png');
    assert.ok(await page.visible('[data-testid=build-modal]'));
}
