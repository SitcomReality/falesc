/**
 * The Workshop Charter legacy gives the next chapter's first Workshop one more
 * bench.
 */
export default async function ({ page, assert }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.evaluate("localStorage.setItem('falesc.legacy.v1', JSON.stringify({ policyId: 'workshop_charter', chapterName: 'House Twelve', day: 14, chosenAt: new Date().toISOString() }))");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    const built = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const cell = window.__falesc.findFreeCell('workshop');
        const result = app.charter.build({ programId: 'workshop', sectorId: cell.sectorId, u: cell.u, v: cell.v, name: 'Legacy Bench' });
        app.syncViews();
        return { ok: result.ok, capacity: result.service.capacity };
    })()`);
    assert.equal(built.ok, true);
    assert.equal(built.capacity, 4);
    await page.evaluate("localStorage.removeItem('falesc.legacy.v1')");
    await page.pause(600);
}
