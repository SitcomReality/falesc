/**
 * Stepping inside a service shows its floor stack and who uses it.
 */
export default async function ({ page, assert, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    const built = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const cell = window.__falesc.findFreeCell('canteen');
        const result = app.charter.build({ programId: 'canteen', sectorId: cell.sectorId, u: cell.u, v: cell.v, name: 'The Long Table' });
        app.syncViews();
        app.serviceCard.show(result.service);
        return { ok: result.ok, id: result.service.id };
    })()`);
    assert.equal(built.ok, true);
    await page.click('[data-testid=service-interior-open]');
    await page.waitFor("window.__falesc.app.serviceInterior.isOpen === true");
    assert.equal(await page.evaluate("document.querySelectorAll('.interior-room').length"), 1);
    const text = await page.text('[data-testid=service-interior]');
    assert.ok(text.includes('Inside the door'));
    assert.ok(text.includes('The Long Table'));
    assert.ok(text.includes('4 seats'));
    await page.pause(300);
    await screenshot('service-interior.png');
    await page.click('[data-testid=service-interior-done]');
    assert.equal(await page.evaluate("window.__falesc.app.serviceInterior.isOpen"), false);
}
