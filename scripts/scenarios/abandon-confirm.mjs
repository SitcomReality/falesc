/** Abandoning a charter is a two-step action; the save is not lost on one click. */
export default async function ({ page, assert }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    await page.click('[data-testid=hud-menu]');
    await page.click('[data-testid=end-game]');
    assert.ok(await page.visible('[data-testid=confirm-abandon]'), 'abandon should ask for confirmation');
    assert.equal(await page.evaluate("window.__falesc.snapshot().state"), 'PLAYING', 'the first click must not end the run');

    await page.click('[data-testid=cancel-abandon]');
    assert.ok(!(await page.visible('[data-testid=confirm-abandon]')), 'cancel should hide the confirmation');
    assert.ok(await page.visible('[data-testid=end-game]'), 'the abandon action should return after cancel');

    await page.click('[data-testid=end-game]');
    await page.click('[data-testid=confirm-abandon]');
    await page.waitFor("window.__falesc.snapshot().state === 'END'");
    assert.ok(await page.visible('[data-testid=end-screen]'));
}
