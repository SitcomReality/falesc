/**
 * Confluence defeat: a rival chapter can win the public vote. The run ends on
 * the defeat composition rather than the player's victory record.
 */
export default async function ({ page, assert, log, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'contest')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    await page.evaluate("window.__falesc.app.charter.day = window.__falesc.app.charter.dayLimit");
    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");

    // Give the Host every heart and every home, so the vote cannot be a player
    // formality. The pledge may still move a few residents.
    await page.evaluate(`(() => {
        const charter = window.__falesc.app.charter;
        for (const resident of charter.activeResidents) {
            resident.affinity.player = 0;
            resident.affinity.gardener = 0;
            resident.affinity.host = 3;
            resident.homeChapterId = 'host';
            resident.memory.lastChoice = null;
        }
        return true;
    })()`);

    await page.click('[data-testid=report-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'CONFLUENCE'");
    await page.click('[data-testid=confluence-vote]');
    await page.waitFor("document.querySelector('[data-testid=confluence-result]') !== null");
    const result = await page.evaluate("(() => { const app=window.__falesc.app; return { ending: app.charter.ending, counts: app.confluenceScreen.result.counts, votes: app.confluenceScreen.result.votes.length }; })()");
    log(JSON.stringify({ result }));
    assert.equal(result.ending.outcome, 'defeat', 'the Host should win this forced vote');
    assert.equal(result.ending.confluence.winnerId, 'host');
    assert.ok(result.votes > 0);
    await screenshot('confluence-defeat.png');
    await page.click('[data-testid=confluence-close]');
    await page.waitFor("window.__falesc.snapshot().state === 'END'");
    assert.ok(await page.visible('[data-testid=end-screen]'));
    const classes = await page.evaluate("document.querySelector('[data-testid=end-screen]').className");
    assert.ok(classes.includes('end--defeat'), 'the end screen should use the defeat composition');
}
