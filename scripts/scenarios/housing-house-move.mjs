/**
 * A resident can move from one player house to a free bed in another.
 */
export default async function ({ page, assert, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    const setup = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const cell = window.__falesc.findFreeCell('housing');
        const result = app.charter.build({ programId: 'housing', sectorId: cell.sectorId, u: cell.u, v: cell.v, name: 'Second House' });
        result.service.promote();
        app.charter.assignHomes();
        app.syncViews();
        const welcome = app.charter.services.services.find((service) => service.id === app.charter.welcomePost.id);
        app.serviceCard.show(welcome);
        return { ok: result.ok, target: result.service.id, welcome: welcome.id };
    })()`);
    assert.equal(setup.ok, true);
    await page.click('[data-testid=service-interior-open]');
    await page.waitFor("window.__falesc.app.serviceInterior.isOpen === true");
    assert.ok(await page.visible('[data-move-house]'));
    await page.click('[data-move-house]');
    const moved = await page.evaluate(`window.__falesc.app.charter.activeResidents.filter((resident) => resident.homeServiceId === ${JSON.stringify(setup.target)}).length`);
    assert.equal(moved, 1);
    const movedState = await page.evaluate(`window.__falesc.app.charter.activeResidents.filter((resident) => resident.homeServiceId === ${JSON.stringify(setup.target)}).map((resident) => ({ name: resident.name, floor: resident.homeFloor }))`);
    assert.equal(movedState.length, 1);
    assert.equal(movedState[0].floor, 0);
    assert.equal(await page.evaluate("document.querySelectorAll('.service-interior__people li').length"), 5);
    await page.pause(300);
    await screenshot('housing-house-move.png');
}
