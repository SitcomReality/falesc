/**
 * The need survey is a planning snapshot: urgency, urgent residents, open
 * services and seats for each of the four needs.
 */
export default async function ({ page, assert, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    await page.evaluate("window.__falesc.app.beginNextDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    await page.click('[data-testid=hud-menu]');
    await page.click('[data-testid=open-need-survey]');
    await page.waitFor("window.__falesc.app.needSurvey.isOpen === true");
    const text = await page.text('[data-testid=need-survey]');
    assert.ok(text.includes('What the chapter needs'));
    assert.ok(text.includes('Sustenance'));
    assert.ok(text.includes('Rest'));
    assert.ok(text.includes('Company'));
    assert.ok(text.includes('Wonder'));
    assert.ok(text.includes('urgent'));
    assert.ok(text.includes('seats'));
    const rows = await page.evaluate("document.querySelectorAll('.need-survey__row').length");
    assert.equal(rows, 4);
    await page.pause(300);
    await screenshot('need-survey.png');
    await page.click('[data-testid=need-survey-done]');
    await page.waitFor("window.__falesc.app.needSurvey.isOpen === false");
    await page.pause(300);
}
