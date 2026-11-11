/**
 * A player-built service can be renamed in its record.
 */
export default async function ({ page, assert, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    const id = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const cell = window.__falesc.findFreeCell('canteen');
        const result = app.charter.build({ programId: 'canteen', sectorId: cell.sectorId, u: cell.u, v: cell.v, name: 'Canteen' });
        app.syncViews();
        app.serviceCard.show(result.service);
        return result.service.id;
    })()`);
    await page.click('[data-testid=service-rename]');
    assert.equal(await page.evaluate("document.querySelector('[data-testid=service-name-input]').value"), 'Canteen');
    await page.evaluate(`(() => {
        const input = document.querySelector('[data-testid=service-name-input]');
        input.value = 'The Long Table';
        document.querySelector('[data-testid=service-name-save]').click();
    })()`);
    await page.waitFor("window.__falesc.app.serviceCard.isOpen === true");
    const renamed = await page.evaluate(`window.__falesc.app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(id)}).name`);
    assert.equal(renamed, 'The Long Table');
    assert.ok((await page.text('[data-testid=structure-modal]')).includes('The Long Table'));
    await page.pause(300);
    await screenshot('service-rename.png');
    await page.evaluate("window.__falesc.app.saveGame()");
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    assert.equal(await page.evaluate(`window.__falesc.app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(id)}).name`), 'The Long Table');
}
