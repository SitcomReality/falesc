/**
 * Floor assignments survive save and reload.
 */
export default async function ({ page, assert }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    const before = await page.evaluate("window.__falesc.app.charter.activeResidents.slice(0, 2).map((resident) => resident.homeFloor)");
    assert.equal(before.every((floor) => floor === 0), true);
    await page.evaluate("window.__falesc.saveGame()");
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    await page.evaluate("window.__falesc.continueGame()");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    const after = await page.evaluate("window.__falesc.app.charter.activeResidents.slice(0, 2).map((resident) => resident.homeFloor)");
    assert.equal(after.every((floor) => floor === 0), true);
    await page.pause(600);
}
