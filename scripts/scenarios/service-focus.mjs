/**
 * Dual-need services can lean toward one of their needs. The choice is saved.
 */
export default async function ({ page, assert, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    const built = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        app.charter.player.lumen = 20;
        const cell = window.__falesc.findFreeCell('clinic');
        const result = app.charter.build({ programId: 'clinic', sectorId: cell.sectorId, u: cell.u, v: cell.v, name: 'Focus Clinic' });
        app.syncViews();
        return { ok: result.ok, id: result.service?.id, program: result.service?.programId };
    })()`);
    assert.equal(built.ok, true);
    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    await page.evaluate("window.__falesc.app.beginNextDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const service = app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(built.id)});
        app.serviceCard.show(service);
    })()`);
    assert.ok(await page.visible('[data-testid=service-focus]'));
    await page.evaluate(`(() => {
        const select = document.querySelector('[data-testid=service-focus]');
        select.value = 'primary';
        select.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await page.waitFor("window.__falesc.app.serviceCard.isOpen === true");
    const focused = await page.evaluate(`window.__falesc.app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(built.id)}).policy.focus`);
    assert.equal(focused, 'primary');
    await page.pause(300);
    await screenshot('service-focus.png');
    await page.evaluate("window.__falesc.app.saveGame()");
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    const restored = await page.evaluate(`window.__falesc.app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(built.id)}).policy.focus`);
    assert.equal(restored, 'primary');
}
