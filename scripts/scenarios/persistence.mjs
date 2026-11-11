/**
 * Save v2: day, lumen, works, services, residents, needs, affinity and the last
 * choice survive a reload. Continuing rebuilds the seeded world and the views.
 */
export default async function ({ page, assert, screenshot, log }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(424242, 'medium')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    await page.evaluate(`(() => {
        const app = window.__falesc.app;
        app.selectProgram('canteen');
        const cell = window.__falesc.findFreeCell('canteen');
        app.onWorldTap(cell.x, cell.y);
        app.finalizeBuild('Persisted Canteen');
        app.buildModal.hide(false);
        return true;
    })()`);

    for (let day = 1; day <= 2; day++) {
        await page.evaluate("window.__falesc.openDay()");
        await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
        await page.evaluate("window.__falesc.skipDay()");
        await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
        await page.evaluate("window.__falesc.beginNextDay()");
        await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
        await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    }

    const before = await page.evaluate("window.__falesc.snapshot()");
    const save = await page.evaluate("(() => { const raw = localStorage.getItem('falesc.save.v2'); return raw ? JSON.parse(raw) : null; })()");
    log(JSON.stringify({ before: { day: before.day, lumen: before.lumen, works: before.works, services: before.services.length, residents: before.residents.length, needs: before.residents[0].needs, lastChoice: before.residents.find((resident) => resident.lastChoice)?.lastChoice }, saveVersion: save?.version, saveDay: save?.charter?.day }));
    assert.equal(before.day, 3);
    assert.equal(save?.version, 2, 'save should use the v2 schema');
    assert.equal(save?.charter?.day, 3);
    assert.equal(save?.charter?.services.length, before.services.length);
    assert.equal(save?.charter?.residents.filter((resident) => resident.active).length, before.residents.length);
    assert.ok(before.residents.some((resident) => resident.lastChoice), 'at least one resident should have chosen a service');

    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    assert.ok(await page.visible('[data-testid=menu-continue]'), 'Continue should be visible after a reload with a save');
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.pause(500);

    const after = await page.evaluate("window.__falesc.snapshot()");
    log(JSON.stringify({ after: { day: after.day, lumen: after.lumen, works: after.works, population: after.population, services: after.services.length, residents: after.residents.length, needs: after.residents[0].needs, lastChoice: after.residents.find((resident) => resident.lastChoice)?.lastChoice } }));
    assert.equal(after.day, before.day);
    assert.equal(after.lumen, before.lumen);
    assert.equal(after.works, before.works);
    assert.equal(after.population, before.population);
    assert.equal(after.services.length, before.services.length);
    assert.equal(after.residents[0].needs.sustenance, before.residents[0].needs.sustenance);
    assert.equal(after.residents[0].needs.rest, before.residents[0].needs.rest);
    assert.equal(JSON.stringify(after.residents.find((resident) => resident.lastChoice)?.lastChoice), JSON.stringify(before.residents.find((resident) => resident.lastChoice)?.lastChoice));
    assert.equal(after.services.find((service) => service.programId === 'canteen')?.state, 'ACTIVE');
    assert.ok(Number.isFinite(after.devotion), 'Devotion must survive the save round-trip');
    assert.ok(Number.isFinite(after.flourishing), 'Flourishing must survive the save round-trip');

    await page.evaluate("window.__falesc.openResident('r01')");
    await page.waitFor("window.__falesc.snapshot().residentCardOpen === true");
    const cardText = await page.text('[data-testid=resident-modal]');
    assert.ok(cardText.includes('Devotion'), 'resident card should render after Continue');
    assert.ok(!cardText.includes('NaN'), 'resident card must not contain NaN after Continue');
    await page.click('[data-testid=resident-close]');
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    const rebuilt = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        app.selectProgram('housing');
        const cell = window.__falesc.findFreeCell('housing');
        app.onWorldTap(cell.x, cell.y);
        const result = app.finalizeBuild('Post Script House');
        app.buildModal.hide(false);
        const s = window.__falesc.snapshot();
        return { result, ids: s.services.map((service) => service.id), state: s };
    })()`);
    log(JSON.stringify({ rebuilt: { ids: rebuilt.ids, services: rebuilt.state.services.length, works: rebuilt.state.works, lumen: rebuilt.state.lumen } }));
    assert.ok(rebuilt.result.ok, 'building after Continue should work');
    assert.equal(new Set(rebuilt.ids).size, rebuilt.ids.length, 'service ids must stay unique after Continue');

    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    await page.evaluate("window.__falesc.beginNextDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    const nextDay = await page.evaluate("window.__falesc.snapshot()");
    log(JSON.stringify({ nextDay: { day: nextDay.day, population: nextDay.population, capacity: nextDay.housingCapacity, spareBeds: nextDay.spareBeds, homes: nextDay.residents.map((resident) => resident.homeServiceId), ids: nextDay.services.map((service) => service.id) } }));
    assert.equal(new Set(nextDay.services.map((service) => service.id)).size, nextDay.services.length, 'service ids must stay unique after a new build');
    assert.ok(nextDay.residents.every((resident) => resident.homeServiceId), 'new arrivals should receive a real bed after Continue');
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    await screenshot('persisted.png');
}
