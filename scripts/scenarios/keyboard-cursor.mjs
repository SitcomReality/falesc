/**
 * The build cursor lets a keyboard player move a footprint over the grid,
 * switch isles and open the build dialog without a pointer.
 */
export default async function ({ page, assert, log, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    await page.pause(600);

    const key = (name, code) => page.evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(name)}, code: ${JSON.stringify(code)}, bubbles: true, cancelable: true }))`);
    await key('c', 'KeyC');
    await page.waitFor("window.__falesc.app.keyboardCursorActive === true");
    assert.ok(await page.evaluate("Boolean(window.__falesc.app.keyboardCursor)"));
    await page.pause(400);
    await screenshot('keyboard-cursor.png');

    const free = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const sector = app.world.homeSector;
        for (let v = 0; v < sector.gridSize; v++) {
            for (let u = 0; u < sector.gridSize; u++) {
                if (app.charter.services.canPlace('canteen', sector.id, u, v).ok) return { sectorId: sector.id, u, v };
            }
        }
        return null;
    })()`);
    assert.ok(free, 'a free cell should exist');
    const before = await page.evaluate(`(() => { window.__falesc.app.keyboardCursor = ${JSON.stringify(free)}; window.__falesc.app.renderKeyboardCursor(); return { ...window.__falesc.app.keyboardCursor }; })()`);
    await key('ArrowRight', 'ArrowRight');
    const moved = await page.evaluate("({ ...window.__falesc.app.keyboardCursor })");
    assert.ok(moved.u >= before.u);
    await page.evaluate(`(() => { window.__falesc.app.keyboardCursor = ${JSON.stringify(free)}; window.__falesc.app.renderKeyboardCursor(); })()`);
    await key('Enter', 'Enter');
    await page.waitFor("window.__falesc.app.buildModal.isOpen === true");
    await screenshot('keyboard-build-dialog.png');
    await page.click('[data-testid=build-submit]');
    const built = await page.evaluate("window.__falesc.app.charter.services.services.at(-1)?.state");
    log(JSON.stringify({ built }));
    assert.equal(built, 'PENDING');
    assert.equal(await page.evaluate("window.__falesc.app.keyboardCursorActive"), false);
}
