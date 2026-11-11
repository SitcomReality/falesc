/**
 * Drift rank 2 adds a bed; rank 3 also seeds the commons.
 */
export default async function ({ page, assert, screenshot }) {
    const records = (count) => Array.from({ length: count }, (_, index) => ({ chapterName: `House ${index + 1}`, mode: 'first-light', day: 8, outcome: index === 0 ? 'victory' : 'abandon', population: 5, flourishing: 55, visits: 5, devotion: 2, chosenAt: new Date().toISOString() }));
    await page.evaluate("localStorage.removeItem('falesc.save.v2'); localStorage.removeItem('falesc.charters.v1')");
    await page.evaluate(`localStorage.setItem('falesc.charters.v1', JSON.stringify(${JSON.stringify(records(6))}))`);
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    const rank2 = await page.evaluate("({ lumen: window.__falesc.app.charter.player.lumen, beds: window.__falesc.app.charter.welcomePost.capacity, fund: window.__falesc.app.charter.commons.fund })");
    assert.equal(rank2.lumen, 12);
    assert.equal(rank2.beds, 7);
    assert.equal(rank2.fund, 0);
    await page.evaluate("localStorage.setItem('falesc.charters.v1', JSON.stringify(" + JSON.stringify(records(8)) + "))");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    const rank3 = await page.evaluate("({ lumen: window.__falesc.app.charter.player.lumen, beds: window.__falesc.app.charter.welcomePost.capacity, fund: window.__falesc.app.charter.commons.fund })");
    assert.equal(rank3.lumen, 13);
    assert.equal(rank3.beds, 7);
    assert.equal(rank3.fund, 5);
    await page.evaluate("localStorage.removeItem('falesc.charters.v1')");
    await page.pause(300);
    await screenshot('drift-bonuses.png');
}
