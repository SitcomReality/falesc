/**
 * A resident can be moved to a free bed on the floor above.
 */
export default async function ({ page, assert, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    const setup = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const home = app.charter.services.services.find((service) => service.programId === 'housing');
        home.floorPlans = ['dormer'];
        home.capacity = 8;
        app.charter.assignHomes();
        app.charter.refreshDerived();
        app.serviceCard.show(home);
        return { id: home.id };
    })()`);
    await page.click('[data-testid=service-interior-open]');
    await page.waitFor("window.__falesc.app.serviceInterior.isOpen === true");
    assert.equal(await page.evaluate("document.querySelectorAll('.interior-room').length"), 2);
    await page.click('[data-move-resident]');
    const moved = await page.evaluate("window.__falesc.app.charter.activeResidents.filter((resident) => resident.homeFloor === 1).length");
    assert.equal(moved, 1);
    const upper = await page.evaluate("document.querySelectorAll('.interior-room')[1].querySelectorAll('.interior-room__move').length");
    assert.equal(upper, 2);
    await page.click('[data-move-direction=down]:not([disabled])');
    assert.equal(await page.evaluate("window.__falesc.app.charter.activeResidents.filter((resident) => resident.homeFloor === 1).length"), 0);
    await page.pause(300);
    await screenshot('housing-bed-move.png');
}
