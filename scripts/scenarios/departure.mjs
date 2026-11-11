/**
 * Residents leave when the chapter cannot house them. Two homeless nights
 * remove the agents, empty the population, and end the charter.
 */
export default async function ({ page, assert, log }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    const removed = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const welcome = app.charter.services.services.find((service) => service.fixed);
        app.charter.services.remove(welcome);
        app.charter.activeResidents.forEach((resident) => { resident.homeServiceId = null; });
        app.crowd.sync();
        return { services: app.charter.services.services.length, characters: app.crowd.agents.size };
    })()`);
    log(JSON.stringify({ removed }));
    assert.equal(removed.characters, 6, 'residents remain on the shard before the first night');

    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    const first = await page.evaluate("window.__falesc.snapshot()");
    assert.equal(first.report.departures.length, 0, 'one homeless night is a warning, not a departure');
    assert.equal(first.population, 6);

    await page.evaluate("window.__falesc.beginNextDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");

    const second = await page.evaluate("window.__falesc.snapshot()");
    log(JSON.stringify({ second: { population: second.population, characters: second.characters, departures: second.report.departures, outcome: second.report.outcome, ending: second.ending } }));
    assert.equal(second.report.departures.length, 6, 'all six residents should leave after two homeless nights');
    assert.equal(second.population, 0, 'the population should empty');
    assert.equal(second.characters, 0, 'departed agents should be removed from the shard');
    assert.equal(second.report.outcome, 'defeat', 'the chapter should lose when it empties');
    assert.ok(second.endResult, 'the defeat should be recorded');

    await page.evaluate("window.__falesc.beginNextDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'END'");
    await page.pause(400);
}
