/**
 * Closed charters are recorded and can be reviewed from the menu. This closes
 * a live run by abandonment so the real write path is exercised.
 */
export default async function ({ page, assert, log, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2'); localStorage.removeItem('falesc.charters.v1')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.evaluate("window.__falesc.app.charter.motto = 'Every door open.'");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    await page.evaluate("window.__falesc.app.charter.day = 5; window.__falesc.app.endCharter('abandon')");
    await page.waitFor("window.__falesc.snapshot().state === 'END'");
    await page.click('[data-testid=end-menu]');
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    const records = await page.evaluate("JSON.parse(localStorage.getItem('falesc.charters.v1') || '[]')");
    log(JSON.stringify({ records }));
    assert.equal(records.length, 1);
    assert.equal(records[0].outcome, 'abandon');
    assert.equal(records[0].day, 5);
    assert.equal(records[0].mode, 'first-light');
    assert.equal(records[0].motto, 'Every door open.');

    assert.ok(await page.visible('[data-testid=menu-archive]'));
    await page.click('[data-testid=menu-archive]');
    await page.waitFor("window.__falesc.app.charterArchive.isOpen === true");
    const text = await page.text('[data-testid=charter-archive]');
    assert.ok(text.includes('First Light · abandoned'));
    assert.ok(text.includes('Day 5'));
    assert.ok(text.includes('Every door open.'));
    assert.ok(text.includes('Best so far:'));
    assert.ok(text.includes('visits'));
    await page.pause(300);
    await screenshot('charter-archive.png');
    await page.click('[data-testid=charter-archive-clear]');
    const afterClear = await page.text('[data-testid=charter-archive]');
    assert.ok(afterClear.includes('No charters have closed yet.'));
    await page.click('[data-testid=charter-archive-done]');
    await page.waitFor("window.__falesc.app.charterArchive.isOpen === false");
    assert.equal(await page.visible('[data-testid=menu-archive]'), false);
    await page.pause(300);
}
