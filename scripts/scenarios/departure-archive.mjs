/**
 * Departed residents stay in the charter record with the day, the reason and
 * their last choice. The archive is reachable from the pause menu.
 */
export default async function ({ page, assert, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    const departedName = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const resident = app.charter.activeResidents[0];
        resident.active = false;
        resident.state = 'departed';
        resident.memory.departure = { day: 3, reason: 'Two nights without a bed.' };
        resident.memory.lastChoice = { day: 2, phase: 'evening', serviceName: 'Welcome Post', reason: 'No bed was free.' };
        app.gameScreen.updateHud(true);
        return resident.name;
    })()`);

    await page.click('[data-testid=hud-menu]');
    const label = await page.text('[data-testid=open-departures]');
    assert.ok(label.includes('Past residents'));
    assert.ok(label.includes('1'));
    await page.click('[data-testid=open-departures]');
    await page.waitFor("window.__falesc.app.departureArchive.isOpen === true");
    const text = await page.text('[data-testid=departure-archive]');
    assert.ok(text.includes(departedName));
    assert.ok(text.includes('Two nights without a bed.'));
    assert.ok(text.includes('left day 3'));
    assert.ok(text.includes('Last door: Welcome Post'));
    await page.pause(300);
    await screenshot('departure-archive.png');
    await page.click('[data-testid=departure-done]');
    await page.waitFor("window.__falesc.app.departureArchive.isOpen === false");
    await page.pause(300);
}
