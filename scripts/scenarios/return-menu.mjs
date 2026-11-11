/**
 * Save & menu leaves a live charter without ending it. Continue returns to the
 * same planning day and the service built before leaving is still there.
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
        const result = app.charter.build({ programId: 'canteen', sectorId: cell.sectorId, u: cell.u, v: cell.v, name: 'Departure Canteen' });
        app.syncViews();
        return { ok: result.ok, id: result.service?.id, day: app.charter.day };
    })()`);
    assert.equal(built.ok, true);

    await page.click('[data-testid=hud-menu]');
    await page.click('[data-testid=save-return-menu]');
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    assert.ok(await page.visible('[data-testid=menu-continue]'));
    assert.ok(await page.visible('[data-testid=menu-export]'));
    await page.pause(300);
    await screenshot('return-menu.png');

    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    const restored = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const service = app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(built.id)});
        return { day: app.charter.day, service: service?.name, state: service?.state };
    })()`);
    assert.equal(restored.day, built.day);
    assert.equal(restored.service, 'Departure Canteen');
    assert.equal(restored.state, 'PENDING');
    await page.pause(300);
}
