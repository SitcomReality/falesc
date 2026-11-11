/**
 * Rivals put one lumen a day into the shared capital budget, so the commons is
 * funded by more than the player.
 */
export default async function ({ page, assert, log, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'contest')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    await page.evaluate("window.__falesc.app.beginNextDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    const capital = await page.evaluate("({ capital: window.__falesc.app.charter.commons.capital, contributors: window.__falesc.app.charter.commons.capitalContributors })");
    log(JSON.stringify({ capital }));
    assert.ok(capital.capital >= 2);
    assert.ok(Object.keys(capital.contributors).length >= 2);
    await page.evaluate("window.__falesc.showCommons()");
    await page.waitFor("window.__falesc.app.commonsModal.isOpen === true");
    await screenshot('commons-rival-capital.png');
    await page.click('[data-testid=commons-close-x]');

    await page.evaluate("window.__falesc.app.saveGame()");
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    const restored = await page.evaluate("({ capital: window.__falesc.app.charter.commons.capital, contributors: window.__falesc.app.charter.commons.capitalContributors })");
    assert.equal(restored.capital, capital.capital);
    assert.deepEqual(restored.contributors, capital.contributors);
    await page.pause(400);
}
