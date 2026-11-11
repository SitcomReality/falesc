/**
 * A completed charter's stewardship promise is visible on the menu and can be
 * released before starting the next one.
 */
export default async function ({ page, assert, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2'); localStorage.removeItem('falesc.legacy.v1')");
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    assert.equal(await page.visible('[data-testid=menu-legacy]'), false);

    await page.evaluate(`localStorage.setItem('falesc.legacy.v1', JSON.stringify({ policyId: 'universal_care', chapterName: 'House Twelve', day: 14, chosenAt: new Date().toISOString() }))`);
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    assert.ok(await page.visible('[data-testid=menu-legacy]'));
    const text = await page.text('[data-testid=menu-legacy]');
    assert.ok(text.includes('Universal Care'));
    assert.ok(text.includes('one more bed'));
    assert.ok(text.includes('day 14'));
    await page.pause(300);
    await screenshot('legacy-menu.png');

    await page.click('[data-testid=menu-clear-legacy]');
    assert.equal(await page.visible('[data-testid=menu-legacy]'), false);
    const stored = await page.evaluate("localStorage.getItem('falesc.legacy.v1')");
    assert.equal(stored, null);
    await page.pause(300);
}
