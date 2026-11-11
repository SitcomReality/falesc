/** Shared overlay stack: closing one modal must not clear the HUD inert/body lock while another is open. */
export default async function ({ page, assert, log }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    await page.evaluate("window.__falesc.showBulletin()");
    await page.waitFor("window.__falesc.snapshot().bulletinOpen === true");
    await page.evaluate("(() => { const app = window.__falesc.app; app.residentCard.show(app.charter.activeResidents[0], 0); return true; })()");
    await page.waitFor("window.__falesc.snapshot().residentCardOpen === true");
    await page.pause(150);
    const inTop = await page.evaluate("(() => { const m = document.querySelector('[data-testid=resident-modal]'); return m.contains(document.activeElement); })()");
    assert.equal(await page.evaluate("window.__falesc.app.overlays.size"), 2, 'both overlays should be stacked');
    assert.ok(await page.evaluate("document.body.classList.contains('has-modal')"));
    assert.ok(await page.evaluate("document.querySelector('[data-testid=game-hud]').hasAttribute('inert')"));
    assert.ok(inTop, 'focus should move into the top resident card');

    await page.evaluate("window.__falesc.app.residentCard.hide()");
    assert.equal(await page.evaluate("window.__falesc.app.overlays.size"), 1);
    assert.ok(await page.evaluate("document.body.classList.contains('has-modal')"), 'body lock should remain for the bulletin');
    assert.ok(await page.evaluate("document.querySelector('[data-testid=game-hud]').hasAttribute('inert')"), 'HUD should remain inert for the bulletin');

    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    assert.equal(await page.evaluate("window.__falesc.app.overlays.size"), 0);
    assert.ok(!(await page.evaluate("document.body.classList.contains('has-modal')")));
    assert.ok(!(await page.evaluate("document.querySelector('[data-testid=game-hud]').hasAttribute('inert')")));
    log('overlay stack closed cleanly');
}
