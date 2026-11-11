/**
 * Clearing one archive mode leaves the other mode's charters alone.
 */
export default async function ({ page, assert, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.charters.v1')");
    await page.evaluate(`localStorage.setItem('falesc.charters.v1', JSON.stringify([
        { chapterName: 'Solo House', mode: 'first-light', day: 8, outcome: 'defeat', population: 6, flourishing: 50, visits: 10, chosenAt: new Date().toISOString() },
        { chapterName: 'Contest House', mode: 'contest', day: 14, outcome: 'victory', population: 9, flourishing: 80, visits: 40, chosenAt: new Date().toISOString() }
    ]))`);
    await page.reload();
    await page.click('[data-testid=menu-archive]');
    await page.click('[data-testid=archive-sort-best]');
    const bestFirst = await page.evaluate("document.querySelector('.charter-archive__row strong').textContent");
    assert.equal(bestFirst, 'Contest House');
    await page.pause(300);
    await screenshot('archive-best-sort.png');
    await page.click('[data-testid=archive-sort-newest]');
    await page.click('[data-testid=archive-filter-contest]');
    assert.equal(await page.evaluate("document.querySelectorAll('.charter-archive__row').length"), 1);
    assert.equal(await page.text('[data-testid=charter-archive-clear]'), 'Clear Contest');
    await page.click('[data-testid=charter-archive-clear]');
    assert.ok((await page.text('[data-testid=charter-archive]')).includes('No charters'));
    assert.equal(await page.evaluate("JSON.parse(localStorage.getItem('falesc.charters.v1')).length"), 1);
    await page.click('[data-testid=archive-filter-all]');
    assert.equal(await page.evaluate("document.querySelectorAll('.charter-archive__row').length"), 1);
    await page.evaluate("localStorage.removeItem('falesc.charters.v1')");
}
