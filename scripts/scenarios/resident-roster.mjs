/**
 * The resident roster is a scannable list of everyone active, with the highest
 * need, wellbeing and a crisis highlight. Clicking opens the full card.
 */
export default async function ({ page, assert, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const resident = app.charter.activeResidents[0];
        resident.needs.sustenance = 92;
        resident.memory.homelessDays = 1;
        app.gameScreen.updateHud(true);
    })()`);

    await page.click('[data-testid=hud-menu]');
    await page.click('[data-testid=open-residents]');
    await page.waitFor("window.__falesc.app.residentRoster.isOpen === true");
    const text = await page.text('[data-testid=resident-roster]');
    assert.ok(text.includes('Who is here'));
    assert.ok(text.includes('Resident roster'));
    const rows = await page.evaluate("document.querySelectorAll('.resident-roster__row button').length");
    assert.equal(rows, 6);
    assert.ok(await page.visible('.resident-roster__row.is-at-risk'));
    await page.pause(300);
    await screenshot('resident-roster.png');
    await page.click('.resident-roster__row button');
    await page.waitFor("window.__falesc.app.residentCard.isOpen === true");
    assert.ok((await page.text('[data-testid=resident-modal]')).includes('Resident record'));
    await page.click('[data-testid=resident-close]');
    await page.waitFor("window.__falesc.app.residentCard.isOpen === false");
    await page.pause(300);
}
