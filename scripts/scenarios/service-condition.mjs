/**
 * Services wear with visits. Low condition lowers their quality; a 3-lumen
 * repair restores them to 100%.
 */
export default async function ({ page, assert, log, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    const setup = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const cell = window.__falesc.findFreeCell('canteen');
        const result = app.charter.build({ programId: 'canteen', sectorId: cell.sectorId, u: cell.u, v: cell.v, name: 'Worn Canteen' });
        app.syncViews();
        const service = app.charter.services.services.find((entry) => entry.id === result.service.id);
        service.state = 'ACTIVE';
        service.condition = 42;
        app.serviceCard.show(service);
        return { id: service.id, condition: service.condition, lumen: app.charter.lumen };
    })()`);
    log(JSON.stringify({ setup }));
    assert.equal(setup.condition, 42);
    const text = await page.text('[data-testid=structure-modal]');
    assert.ok(text.includes('Wear'));
    assert.ok(text.includes('42%'));
    assert.ok(await page.visible('[data-testid=structure-repair]'));
    await page.pause(300);
    await screenshot('service-condition.png');
    await page.click('[data-testid=structure-repair]');
    await page.waitFor("window.__falesc.app.serviceCard.isOpen === true");
    const after = await page.evaluate(`(() => { const app = window.__falesc.app; const service = app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(setup.id)}); return { condition: service.condition, lumen: app.charter.lumen }; })()`);
    assert.equal(after.condition, 100);
    assert.equal(after.lumen, setup.lumen - 3);
    await page.click('[data-testid=structure-cancel]');
    await page.evaluate("window.__falesc.app.saveGame()");
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    const restored = await page.evaluate(`window.__falesc.app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(setup.id)}).condition`);
    assert.equal(restored, 100);
}
