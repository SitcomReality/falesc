/**
 * A resident can staff an open service; working lowers their Purpose.
 */
export default async function ({ page, assert, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    const setup = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const cell = window.__falesc.findFreeCell('canteen');
        const result = app.charter.build({ programId: 'canteen', sectorId: cell.sectorId, u: cell.u, v: cell.v, name: 'Staffed Canteen' });
        result.service.promote();
        for (const resident of app.charter.activeResidents) resident.needs.purpose = 90;
        app.syncViews();
        app.serviceCard.show(result.service);
        return { ok: result.ok, id: result.service.id, resident: app.charter.activeResidents[0].id };
    })()`);
    assert.equal(setup.ok, true);
    await page.click('[data-testid=service-interior-open]');
    await page.waitFor("window.__falesc.app.serviceInterior.isOpen === true");
    await page.evaluate(`(() => { const select = document.querySelector('[data-testid=service-staff]'); select.value = ${JSON.stringify(setup.resident)}; select.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    const staff = await page.evaluate(`(() => { const app = window.__falesc.app; const service = app.charter.services.services.find((entry) => entry.id === ${JSON.stringify(setup.id)}); return { staffId: service.staffId, work: app.charter.activeResidents.find((resident) => resident.id === ${JSON.stringify(setup.resident)}).workServiceId }; })()`);
    assert.equal(staff.staffId, setup.resident);
    assert.equal(staff.work, setup.id);
    const saved = await page.evaluate(`window.__falesc.app.saveManager.read().charter.services.find((entry) => entry.id === ${JSON.stringify(setup.id)}).staffId`);
    assert.equal(saved, setup.resident);
    await page.pause(300);
    await screenshot('service-staff.png');
    await page.click('[data-testid=service-interior-done]');
    assert.ok((await page.text('[data-testid=structure-modal]')).includes('Staff'));
    await page.evaluate(`window.__falesc.app.residentCard.show(window.__falesc.app.charter.activeResidents.find((resident) => resident.id === ${JSON.stringify(setup.resident)}))`);
    const card = await page.text('[data-testid=resident-modal]');
    assert.ok(card.includes('Work'));
    assert.ok(card.includes('Staffed Canteen'));
    await page.pause(300);
    await screenshot('resident-work.png');
    await page.evaluate("window.__falesc.app.residentCard.hide()");
    await page.evaluate("window.__falesc.app.serviceCard.hide()");
    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    const purpose = await page.evaluate(`window.__falesc.app.charter.activeResidents.find((resident) => resident.id === ${JSON.stringify(setup.resident)}).needs.purpose`);
    assert.ok(purpose < 90);
}
