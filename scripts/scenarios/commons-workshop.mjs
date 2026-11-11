/**
 * The Common Workshop policy gives every Workshop two more seats.
 */
export default async function ({ page, assert }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'contest')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    const before = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const cell = window.__falesc.findFreeCell('workshop');
        const result = app.charter.build({ programId: 'workshop', sectorId: cell.sectorId, u: cell.u, v: cell.v, name: 'Common Bench' });
        app.syncViews();
        app.charter.commons.active = true;
        return { ok: result.ok, capacity: result.service.capacity, id: result.service.id };
    })()`);
    assert.equal(before.ok, true);
    await page.evaluate("window.__falesc.app.charter.chooseCommonsPolicy('common_workshop')");
    const after = await page.evaluate(`window.__falesc.app.charter.services.services.find((service) => service.id === ${JSON.stringify(before.id)}).capacity`);
    assert.equal(after, before.capacity + 2);
}
