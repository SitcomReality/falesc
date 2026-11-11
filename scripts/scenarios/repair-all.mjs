/**
 * Repair all brings every worn player service back to full for 3 lumen each.
 */
export default async function ({ page, assert }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    const before = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const cell = window.__falesc.findFreeCell('canteen');
        const result = app.charter.build({ programId: 'canteen', sectorId: cell.sectorId, u: cell.u, v: cell.v, name: 'Worn Canteen' });
        app.syncViews();
        for (const service of app.charter.services.services) service.condition = 40;
        return { lumen: app.charter.lumen, worn: app.charter.services.services.filter((service) => service.condition < 100).length };
    })()`);
    assert.equal(before.worn, 2);
    await page.click('[data-testid=hud-menu]');
    await page.click('[data-testid=repair-all]');
    const after = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        return {
            lumen: app.charter.lumen,
            worn: app.charter.services.services.filter((service) => service.condition < 100).length
        };
    })()`);
    assert.equal(after.worn, 0);
    assert.equal(after.lumen, before.lumen - 6);
}
