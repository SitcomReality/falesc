/**
 * The service roster lists every player service and opens its record.
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
        const result = app.charter.build({ programId: 'canteen', sectorId: cell.sectorId, u: cell.u, v: cell.v, name: 'Roster Canteen' });
        app.syncViews();
        return result.ok;
    })()`);
    await page.click('[data-testid=hud-menu]');
    await page.click('[data-testid=open-service-roster]');
    await page.waitFor("window.__falesc.app.serviceRoster.isOpen === true");
    assert.equal(await page.evaluate("document.querySelectorAll('.service-roster__row').length"), 2);
    const text = await page.text('[data-testid=service-roster]');
    assert.ok(text.includes('Welcome Post'));
    assert.ok(text.includes('Roster Canteen'));
    await page.pause(300);
    await screenshot('service-roster.png');
    await page.click('.service-roster__row:nth-child(2)');
    await page.waitFor("window.__falesc.app.serviceCard.isOpen === true");
    assert.ok((await page.text('[data-testid=structure-modal]')).includes('Roster Canteen'));
}
