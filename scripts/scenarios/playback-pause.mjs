/**
 * Day playback can be paused and resumed without changing the precomputed day.
 */
export default async function ({ page, assert, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    await page.pause(400);
    await page.click('[data-testid=day-pause]');
    const paused = await page.evaluate("window.__falesc.app.playback.clock");
    await page.pause(700);
    const still = await page.evaluate("window.__falesc.app.playback.clock");
    assert.equal(still, paused);
    assert.equal(await page.text('[data-testid=day-pause]'), 'Play');
    await page.pause(200);
    await screenshot('playback-paused.png');
    await page.click('[data-testid=day-pause]');
    await page.pause(700);
    const resumed = await page.evaluate("window.__falesc.app.playback.clock");
    assert.ok(resumed > still);
    assert.equal(await page.text('[data-testid=day-pause]'), 'Pause');
    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
}
