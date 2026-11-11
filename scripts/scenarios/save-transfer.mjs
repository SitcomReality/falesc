/**
 * Save transfer: the current charter can be exported as JSON and imported back
 * into a fresh browser state without hand-editing localStorage.
 */
export default async function ({ page, assert, log, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'contest')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    await page.evaluate("window.__falesc.app.saveGame()");
    const text = await page.evaluate("window.__falesc.app.saveManager.exportText()");
    const parsed = JSON.parse(text);
    log(JSON.stringify({ version: parsed.version, day: parsed.charter.day, services: parsed.charter.services.length }));
    assert.equal(parsed.version, 2);
    assert.equal(parsed.charter.day, 1);
    assert.ok(parsed.charter.services.length >= 1);
    assert.equal(parsed.charter.rivals.length, 2);

    const invalid = await page.evaluate("window.__falesc.app.importSave('{\"version\":1}')");
    assert.equal(invalid.ok, false);
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    const imported = await page.evaluate(`window.__falesc.app.importSave(${JSON.stringify(text)})`);
    assert.equal(imported.ok, true);
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    const restored = await page.evaluate("window.__falesc.snapshot()");
    assert.equal(restored.day, 1);
    assert.equal(restored.mode, 'contest');
    assert.ok(restored.services.length >= 1);
    await page.pause(400);
    await screenshot('save-transfer-report.png');
}
