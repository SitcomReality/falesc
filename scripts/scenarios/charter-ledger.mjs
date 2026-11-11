/**
 * The ledger keeps a daily summary of every finished day and a flourishing
 * sparkline. It survives save/reload and is reachable from the pause menu.
 */
export default async function ({ page, assert, log, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    for (let day = 1; day <= 2; day++) {
        await page.evaluate("window.__falesc.openDay()");
        await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
        await page.evaluate("window.__falesc.skipDay()");
        await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
        if (day === 1) {
            await page.evaluate("window.__falesc.app.beginNextDay()");
            await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
            await page.evaluate("window.__falesc.app.bulletinModal.hide()");
        }
    }
    const history = await page.evaluate("window.__falesc.app.charter.history");
    log(JSON.stringify({ history }));
    assert.equal(history.length, 2);
    assert.equal(history[0].day, 1);
    assert.equal(history[1].day, 2);
    assert.ok(Number.isFinite(history[0].flourishing));

    await page.evaluate("window.__falesc.app.beginNextDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    await page.click('[data-testid=hud-menu]');
    await page.click('[data-testid=open-ledger]');
    await page.waitFor("window.__falesc.app.ledger.isOpen === true");
    const text = await page.text('[data-testid=ledger]');
    assert.ok(text.includes('The run so far'));
    assert.ok(text.includes('Visits'));
    assert.ok(text.includes('Day'));
    const rows = await page.evaluate("document.querySelectorAll('.charter-ledger__table tbody tr').length");
    assert.equal(rows, 2);
    assert.ok(await page.visible('.charter-ledger__spark'));
    await page.pause(300);
    await screenshot('charter-ledger.png');
    await page.click('[data-testid=ledger-done]');
    await page.waitFor("window.__falesc.app.ledger.isOpen === false");

    await page.evaluate("window.__falesc.app.saveGame()");
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    const restored = await page.evaluate("window.__falesc.app.charter.history");
    assert.equal(restored.length, 2);
    assert.equal(restored[1].day, 2);
    await page.pause(300);
}
