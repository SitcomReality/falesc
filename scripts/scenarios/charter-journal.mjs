/**
 * The charter journal records short milestones and is reachable from the pause
 * menu. It is display data, separate from the daily ledger.
 */
export default async function ({ page, assert, log, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    const built = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const cell = window.__falesc.findFreeCell('canteen');
        const result = app.charter.build({ programId: 'canteen', sectorId: cell.sectorId, u: cell.u, v: cell.v, name: 'Journal Canteen' });
        app.syncViews();
        return { ok: result.ok, journal: app.charter.journal };
    })()`);
    assert.equal(built.ok, true);
    log(JSON.stringify({ built }));
    assert.equal(built.journal.length, 1);
    assert.ok(built.journal[0].text.includes('Journal Canteen'));

    await page.click('[data-testid=hud-menu]');
    await page.click('[data-testid=open-journal]');
    await page.waitFor("window.__falesc.app.journal.isOpen === true");
    const text = await page.text('[data-testid=journal]');
    assert.ok(text.includes('What happened here'));
    assert.ok(text.includes('Journal Canteen'));
    await page.pause(300);
    await screenshot('charter-journal.png');
    await page.click('[data-testid=journal-done]');
    await page.waitFor("window.__falesc.app.journal.isOpen === false");

    await page.evaluate("window.__falesc.app.saveGame()");
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    const restored = await page.evaluate("window.__falesc.app.charter.journal.length");
    assert.equal(restored, 1);
    await page.pause(300);
}
