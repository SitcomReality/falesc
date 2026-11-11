/**
 * Shared Commons Beacon: a cross-chapter civic project, funded from player and
 * rival lumen, activates as a passive night comfort for every resident, and
 * survives reload.
 */
export default async function ({ page, assert, log, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'contest')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    const founded = await page.evaluate("window.__falesc.snapshot()");
    log(JSON.stringify({ founded: { commons: founded.commons, allServices: founded.allServices } }));
    assert.equal(founded.commons.target, 20);
    assert.equal(founded.commons.active, false);
    assert.equal(founded.allServices, 6, 'the reserved Beacon should count as a service site');
    assert.ok(await page.visible('[data-role=commons]'), 'the HUD should show the Commons');

    // Give the player a test grant so both 10-lumen contributions can be made
    // through the real modal; the production flow permits repeated giving.
    await page.evaluate("window.__falesc.app.charter.player.lumen = 30; window.__falesc.app.gameScreen.updateHud(true)");
    await page.click('[data-testid=commons-open]');
    await page.waitFor("window.__falesc.app.commonsModal.isOpen === true");
    await page.click('[data-testid=commons-give-10]');
    const halfway = await page.evaluate("window.__falesc.snapshot()");
    assert.equal(halfway.commons.fund, 10);
    assert.equal(halfway.lumen, 20);
    await page.click('[data-testid=commons-give-10]');
    const lit = await page.evaluate("window.__falesc.snapshot()");
    log(JSON.stringify({ lit: { commons: lit.commons, allServices: lit.allServices } }));
    assert.equal(lit.commons.active, true);
    assert.equal(lit.commons.fund, 20);
    assert.equal(lit.lumen, 10);
    assert.equal(lit.commons.contributors.player, 20);
    assert.ok(await page.text('[data-testid=commons-modal]').then((text) => text.includes('Beacon is lit')));
    await screenshot('commons-active.png');
    await page.click('[data-testid=commons-close]');
    await page.waitFor("window.__falesc.app.commonsModal.isOpen === false");
    const hudCommons = await page.evaluate("document.querySelector('[data-role=commons-name]').textContent");
    assert.ok(hudCommons.includes('lit'), 'the HUD should show the lit Beacon');

    await page.evaluate("window.__falesc.app.saveGame()");
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    const restored = await page.evaluate("window.__falesc.snapshot()");
    log(JSON.stringify({ restored: { commons: restored.commons, allServices: restored.allServices } }));
    assert.equal(restored.commons.active, true);
    assert.ok(restored.allServices >= 6);

    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    const report = await page.evaluate("window.__falesc.snapshot()");
    assert.equal(report.report.commons.active, true);
    assert.ok(await page.text('[data-testid=report-screen]').then((text) => text.includes('Beacon is lit')));
    await page.pause(400);
}
