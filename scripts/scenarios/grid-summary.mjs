/**
 * The grid summary exposes every buildable cell as a readable table, so the
 * planning grid is not only a canvas.
 */
export default async function ({ page, assert, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'contest')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    await page.click('[data-testid=hud-menu]');
    await page.click('[data-testid=open-grid-summary]');
    await page.waitFor("window.__falesc.app.gridSummary.isOpen === true");
    const text = await page.text('[data-testid=grid-summary]');
    assert.ok(text.includes('The build grid'));
    assert.ok(text.includes('Home shard'));
    assert.ok(text.includes('Commons isle'));
    const tables = await page.evaluate("document.querySelectorAll('.grid-summary__table').length");
    assert.equal(tables, 3);
    const rows = await page.evaluate("document.querySelectorAll('.grid-summary__table tbody tr').length");
    assert.ok(rows > 10);
    const occupied = await page.evaluate("document.querySelectorAll('.grid-summary__table td.is-occupied').length");
    assert.ok(occupied > 0);
    const label = await page.evaluate("document.querySelector('.grid-summary__table td').getAttribute('aria-label')");
    assert.ok(label.includes('cell 0, 0'));
    await page.pause(300);
    await screenshot('grid-summary.png');
    await page.click('[data-testid=grid-summary-done]');
    await page.waitFor("window.__falesc.app.gridSummary.isOpen === false");
    await page.pause(300);
}
