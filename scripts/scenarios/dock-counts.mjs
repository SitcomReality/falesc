/**
 * Service cards show how many of that program the player has built.
 */
export default async function ({ page, assert, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    const built = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const ids = [];
        for (let index = 0; index < 2; index++) {
            const cell = window.__falesc.findFreeCell('canteen');
            const result = app.charter.build({ programId: 'canteen', sectorId: cell.sectorId, u: cell.u, v: cell.v, name: 'Counted Canteen ' + (index + 1) });
            app.syncViews();
            if (result.ok) ids.push(result.service.id);
        }
        app.gameScreen.updateHud(true);
        return ids;
    })()`);
    assert.equal(built.length, 2);
    const counts = await page.evaluate(`(() => ({
        canteen: document.querySelector('[data-testid=program-canteen] [data-role=count]').textContent,
        housing: document.querySelector('[data-testid=program-housing] [data-role=count]').textContent
    }))()`);
    assert.equal(counts.canteen, '2');
    assert.equal(counts.housing, '1');
    await page.pause(300);
    await screenshot('dock-counts.png');
}
