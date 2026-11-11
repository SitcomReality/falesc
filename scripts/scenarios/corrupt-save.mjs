/**
 * Corrupt save guard: a parseable v2 payload with the wrong service shape must
 * be discarded, not half-loaded into the charter.
 */
export default async function ({ page, assert, log }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate(`(() => {
        localStorage.setItem('falesc.save.v2', JSON.stringify({
            version: 2,
            savedAt: Date.now(),
            settings: { mapSeed: 7, mapSize: 'medium' },
            charter: {
                seed: 7,
                mapSize: 'medium',
                day: 3,
                lumen: 12,
                works: 2,
                residents: [{ id: 'r01', name: 'Broken', traits: {}, needs: {} }],
                services: {}
            }
        }));
        return true;
    })()`);
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    await page.pause(400);
    const result = await page.evaluate("(() => ({ save: localStorage.getItem('falesc.save.v2'), continueVisible: !document.querySelector('[data-testid=menu-continue]').hidden }))()");
    log(JSON.stringify(result));
    assert.equal(result.save, null, 'corrupt v2 save should be removed');
    assert.equal(result.continueVisible, false, 'Continue should be hidden when the save is corrupt');
}
