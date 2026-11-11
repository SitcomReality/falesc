/**
 * Civic-energy economy: residents contribute according to wellbeing, services
 * draw upkeep, construction takes a work, and the projection matches the report.
 */
export default async function ({ page, assert, screenshot, log }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(24680, 'medium')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    const initial = await page.evaluate("window.__falesc.snapshot()");
    log(JSON.stringify({ initial: { lumen: initial.lumen, works: initial.works, population: initial.population, upkeep: initial.report } }));
    assert.equal(initial.lumen, 10);
    assert.equal(initial.works, 2);
    assert.equal(initial.population, 6);
    assert.equal(initial.housingCapacity, 6);

    const built = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const out = [];
        for (const programId of ['canteen', 'housing']) {
            app.selectProgram(programId);
            const cell = window.__falesc.findFreeCell(programId);
            app.onWorldTap(cell.x, cell.y);
            out.push(app.finalizeBuild(programId === 'canteen' ? 'Test Canteen' : 'Test House'));
            app.buildModal.hide(false);
        }
        return { out, snapshot: window.__falesc.snapshot() };
    })()`);
    log(JSON.stringify(built));
    assert.ok(built.out.every((entry) => entry.ok), 'both services should break ground');
    assert.equal(built.snapshot.lumen, 2, 'two 4-lumen services should leave 2 lumen');
    assert.equal(built.snapshot.works, 0, 'two works should be spent');

    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    const dayOne = await page.evaluate("(() => { const r = window.__falesc.snapshot().report; return r; })()");
    log(JSON.stringify({ dayOne }));
    assert.equal(dayOne.lumenAfter, 2 + dayOne.contributions - dayOne.upkeep);
    assert.equal(dayOne.net, dayOne.contributions - dayOne.upkeep);

    await page.evaluate("window.__falesc.beginNextDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    const dayTwo = await page.evaluate("window.__falesc.snapshot()");
    log(JSON.stringify({ dayTwo: { day: dayTwo.day, population: dayTwo.population, capacity: dayTwo.housingCapacity, spareBeds: dayTwo.spareBeds, works: dayTwo.works, projectedNet: dayTwo.projectedNet, services: dayTwo.services } }));
    assert.equal(dayTwo.day, 2);
    assert.equal(dayTwo.housingCapacity, 10, 'the new Welcome House should add four beds');
    assert.ok(dayTwo.population >= 8, 'spare beds should attract arrivals');
    assert.equal(dayTwo.works, 2);
    assert.ok(dayTwo.services.every((service) => service.state === 'ACTIVE'), 'both services should open overnight');
    assert.equal(dayTwo.projectedNet, dayTwo.projectedContributions - dayTwo.projectedUpkeep);

    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    const reportTwo = await page.evaluate("window.__falesc.snapshot().report");
    log(JSON.stringify({ reportTwo }));
    assert.ok(reportTwo.upkeep >= 4, 'Welcome Post, Canteen and new housing should draw upkeep');
    assert.equal(reportTwo.net, reportTwo.contributions - reportTwo.upkeep);
    assert.equal(reportTwo.lumenAfter, dayOne.lumenAfter + reportTwo.net);
    await screenshot('economy-report.png');
}
