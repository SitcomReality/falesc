/**
 * The procedural soundscape starts only from a gesture. The charter menu's
 * Sound control toggles the pad and click cues and persists the preference.
 */
export default async function ({ page, assert, log, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2'); localStorage.removeItem('falesc.audio.v1')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    await page.click('[data-testid=hud-menu]');
    await page.waitFor("document.querySelector('[data-testid=charter-menu]').hidden === false");
    await screenshot('sound-menu.png');
    await page.click('[data-testid=sound-toggle]');
    const on = await page.evaluate("({ enabled: window.__falesc.app.audio.enabled, label: document.querySelector('[data-testid=sound-toggle]').textContent, stored: localStorage.getItem('falesc.audio.v1'), context: Boolean(window.__falesc.app.audio.context) })");
    log(JSON.stringify({ on }));
    assert.equal(on.enabled, true);
    assert.ok(on.label.includes('on'));
    assert.equal(on.stored, 'on');
    await page.pause(300);
    await screenshot('sound-on.png');

    await page.click('[data-testid=sound-toggle]');
    const off = await page.evaluate("({ enabled: window.__falesc.app.audio.enabled, stored: localStorage.getItem('falesc.audio.v1') })");
    assert.equal(off.enabled, false);
    assert.equal(off.stored, 'off');
    await page.pause(300);
}
