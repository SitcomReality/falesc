/**
 * The Repair Corps commons policy cuts a repair from 3 lumen to 1.
 */
export default async function ({ page, assert }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    const setup = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const cell = window.__falesc.findFreeCell('canteen');
        const result = app.charter.build({ programId: 'canteen', sectorId: cell.sectorId, u: cell.u, v: cell.v, name: 'Mutual Canteen' });
        app.syncViews();
        const service = result.service;
        service.state = 'ACTIVE';
        service.condition = 40;
        app.charter.commons.policy = 'repair_corps';
        app.serviceCard.show(service);
        return { id: service.id, lumen: app.charter.lumen };
    })()`);
    assert.equal(await page.evaluate("window.__falesc.app.charter.repairCost()"), 1);
    assert.ok((await page.text('[data-testid=structure-repair]')).includes('1'));
    await page.click('[data-testid=structure-repair]');
    await page.waitFor("window.__falesc.app.serviceCard.isOpen === true");
    const after = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const service = app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(setup.id)});
        return { lumen: app.charter.lumen, condition: service.condition };
    })()`);
    assert.equal(after.condition, 100);
    assert.equal(after.lumen, setup.lumen - 1);
}
