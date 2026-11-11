/**
 * After three closed charters the drift remembers, adding 1 starting lumen.
 */
export default async function ({ page, assert, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2'); localStorage.removeItem('falesc.charters.v1')");
    await page.evaluate(`localStorage.setItem('falesc.charters.v1', JSON.stringify([
        { chapterName: 'One', mode: 'first-light', day: 5, outcome: 'abandon', population: 4, flourishing: 40, visits: 1, devotion: 1, chosenAt: new Date().toISOString() },
        { chapterName: 'Two', mode: 'first-light', day: 6, outcome: 'abandon', population: 5, flourishing: 45, visits: 2, devotion: 2, chosenAt: new Date().toISOString() },
        { chapterName: 'Three', mode: 'contest', day: 14, outcome: 'victory', population: 9, flourishing: 80, visits: 20, devotion: 5, chosenAt: new Date().toISOString() }
    ]))`);
    await page.reload();
    assert.ok((await page.text('[data-testid=menu-drift]')).includes('Drift rank 1'));
    await page.pause(300);
    await screenshot('drift-menu.png');
    await page.click('[data-testid=menu-archive]');
    const archive = await page.text('[data-testid=charter-archive]');
    assert.ok(archive.includes('Drift rank 1'));
    assert.ok(archive.includes('+1 starting lumen'));
    await page.pause(300);
    await screenshot('drift-rank-archive.png');
    await page.click('[data-testid=charter-archive-done]');
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    assert.equal(await page.evaluate("window.__falesc.app.charter.player.lumen"), 11);
    await page.evaluate("localStorage.removeItem('falesc.charters.v1')");
    await page.pause(300);
    await screenshot('drift-rank.png');
}
