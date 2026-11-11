/**
 * The housing interior assigns each resident to a bed on a floor.
 */
export default async function ({ page, assert, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    await page.evaluate("window.__falesc.app.charter.assignHomes(); window.__falesc.app.charter.refreshDerived()");
    await page.evaluate("window.__falesc.app.serviceCard.show(window.__falesc.app.charter.services.services.find((service) => service.programId === 'housing'))");
    await page.click('[data-testid=service-interior-open]');
    await page.waitFor("window.__falesc.app.serviceInterior.isOpen === true");
    assert.equal(await page.evaluate("document.querySelectorAll('.interior-room').length"), 1);
    assert.equal(await page.evaluate("document.querySelectorAll('.interior-room__people').length"), 1);
    const text = await page.text('.interior-room__people');
    for (const name of ['Bex', 'Sable', 'Sen', 'Cass']) assert.ok(text.includes(name));
    await page.pause(300);
    await screenshot('housing-interior.png');
}
