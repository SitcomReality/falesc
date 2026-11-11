/**
 * Care watch surfaces residents in crisis and links straight to the need survey.
 */
export default async function ({ page, assert, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    assert.equal(await page.visible('[data-testid=care-watch]'), false);

    const name = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const resident = app.charter.activeResidents[0];
        resident.needs.sustenance = 95;
        resident.memory.homelessDays = 1;
        app.gameScreen.updateHud(true);
        return resident.name;
    })()`);
    assert.ok(await page.visible('[data-testid=care-watch]'));
    const label = await page.text('[data-testid=care-watch]');
    assert.ok(label.includes('1 resident need care'));
    await page.pause(900);
    await screenshot('care-watch.png');
    await page.click('[data-testid=care-watch]');
    await page.waitFor("window.__falesc.app.needSurvey.isOpen === true");
    const survey = await page.text('[data-testid=need-survey]');
    assert.ok(survey.includes('Sustenance'));
    assert.ok(survey.includes(name));
    assert.ok(survey.includes('Residents needing care'));
    await page.click(`[data-resident-id]`);
    await page.waitFor("window.__falesc.app.residentCard.isOpen === true");
    const card = await page.text('[data-testid=resident-modal]');
    assert.ok(card.includes(name));
    await page.click('[data-testid=resident-close]');
    await page.waitFor("window.__falesc.app.residentCard.isOpen === false");
    await page.pause(300);
}
