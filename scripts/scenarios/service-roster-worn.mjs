/**
 * The roster can filter down to services that need a repair.
 */
export default async function ({ page, assert, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const cell = window.__falesc.findFreeCell('canteen');
        app.charter.build({ programId: 'canteen', sectorId: cell.sectorId, u: cell.u, v: cell.v, name: 'Worn Canteen' });
        app.syncViews();
        app.charter.services.services[0].condition = 40;
        app.gameScreen.updateHud(true);
    })()`);
    await page.click('[data-testid=hud-menu]');
    await page.click('[data-testid=open-service-roster]');
    await page.waitFor("window.__falesc.app.serviceRoster.isOpen === true");
    await page.click('[data-testid=service-roster-worn]');
    assert.equal(await page.evaluate("document.querySelectorAll('.service-roster__row').length"), 1);
    assert.equal(await page.text('[data-testid=service-roster-worn]'), 'All services');
    await page.pause(300);
    await screenshot('service-roster-worn.png');
    await page.click('[data-testid=service-roster-worn]');
    assert.equal(await page.evaluate("document.querySelectorAll('.service-roster__row').length"), 2);
}
