/**
 * A housing record names the residents who actually live there, not visitors.
 */
export default async function ({ page, assert, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    const setup = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const home = app.charter.services.services.find((service) => service.programId === 'housing' && service.fixed);
        app.serviceCard.show(home);
        return { names: app.charter.activeResidents.filter((resident) => resident.homeServiceId === home.id).map((resident) => resident.name) };
    })()`);
    assert.ok(setup.names.length > 0);
    const text = await page.text('[data-testid=structure-modal]');
    assert.ok(text.includes('Residents here'));
    assert.ok(text.includes(setup.names[0]));
    await page.pause(300);
    await screenshot('housing-residents.png');
    await page.click('[data-resident-id]');
    await page.waitFor("window.__falesc.app.residentCard.isOpen === true");
    await page.click('[data-testid=resident-close]');
}
