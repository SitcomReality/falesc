/**
 * The HUD hint advances from the first Canteen through the next unmet need
 * instead of disappearing after the first build.
 */
export default async function ({ page, assert, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    const first = await page.text('[data-role=hint-copy]');
    assert.ok(first.includes('Build a Canteen'));

    const built = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const cell = window.__falesc.findFreeCell('canteen');
        const result = app.charter.build({ programId: 'canteen', sectorId: cell.sectorId, u: cell.u, v: cell.v, name: 'Hint Canteen' });
        app.syncViews();
        app.gameScreen.updateHud(true);
        return result.ok;
    })()`);
    assert.equal(built, true);
    const pending = await page.text('[data-role=hint-copy]');
    assert.ok(pending.includes('opens tomorrow'));

    await page.evaluate("window.__falesc.app.charter.services.services.forEach((service) => { if (service.programId === 'canteen') service.state = 'ACTIVE'; }); window.__falesc.app.gameScreen.updateHud(true)");
    const next = await page.text('[data-role=hint-copy]');
    assert.ok(next.includes('Tea House'));
    await page.pause(300);
    await screenshot('onboarding-hints.png');
}
