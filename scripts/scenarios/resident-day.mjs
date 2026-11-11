/**
 * Resident loop acceptance: a Tidelander chooses the Canteen, enters it, emerges
 * with a better need, and the resident card explains why.
 */
export default async function ({ page, assert, screenshot, log }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.click('[data-testid=menu-start]');
    await page.waitFor("document.querySelector('[data-testid=lobby-screen]') !== null");
    await page.evaluate("(() => { const i = document.querySelector('[data-testid=lobby-seed]'); i.value='12345'; i.dispatchEvent(new Event('change',{bubbles:true})); return true; })()");
    await page.click('[data-testid=lobby-start]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    const built = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        app.selectProgram('canteen');
        const cell = window.__falesc.findFreeCell('canteen');
        app.onWorldTap(cell.x, cell.y);
        const result = app.finalizeBuild('Test Canteen');
        app.buildModal.hide(false);
        return { result, cell };
    })()`);
    log(JSON.stringify(built));
    assert.ok(built.result?.ok, 'canteen should break ground');

    // Day 1 lets the Canteen finish construction. Day 2 is the first service day.
    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    await page.evaluate("window.__falesc.beginNextDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING' && window.__falesc.snapshot().day === 2");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    await page.pause(1400);
    const moving = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const agents = [...app.crowd.agents.values()];
        return {
            clock: app.playback?.clock || 0,
            walking: agents.filter((agent) => agent.character.state === 'WALK').length,
            inside: agents.filter((agent) => agent.hidden).length,
            visible: agents.filter((agent) => !agent.hidden).length
        };
    })()`);
    log(JSON.stringify(moving));
    assert.ok(moving.walking + moving.inside > 0, 'residents should be walking into or using the canteen during playback');
    await screenshot('resident-walking.png');
    await page.pause(1600);
    await screenshot('resident-inside.png');

    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    const result = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const report = app.charter.lastReport;
        const canteen = app.charter.services.services.find((service) => service.programId === 'canteen');
        const event = report.events.find((entry) => entry.serviceId === canteen.id);
        const resident = app.charter.activeResidents.find((entry) => entry.id === event.residentId);
        return {
            visits: report.visits,
            canteenVisits: canteen.visits,
            event: event ? {
                residentId: event.residentId,
                resident: event.residentName,
                reason: event.reason,
                needBefore: event.needBefore,
                needAfter: event.needAfter,
                enterTime: event.enterTime,
                exitTime: event.exitTime
            } : null,
            lastChoice: resident?.memory.lastChoice || null
        };
    })()`);
    log(JSON.stringify(result));
    assert.ok(result.visits > 0, 'the day should record visits');
    assert.ok(result.canteenVisits > 0, 'the Canteen should be used');
    assert.ok(result.event, 'there should be a visit event for the Canteen');
    assert.ok(result.event.needAfter < result.event.needBefore, 'a visit should reduce the chosen need');
    assert.ok(result.lastChoice && result.lastChoice.serviceName === 'Test Canteen', 'the resident should remember the Canteen');
    assert.ok(result.lastChoice.reason.includes('Test Canteen'), 'the why line should name the place');

    await page.evaluate("window.__falesc.beginNextDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    await page.evaluate(`window.__falesc.openResident('${result.event.residentId}')`);
    const cardText = await page.text('[data-testid=resident-modal]');
    assert.ok(cardText.includes('Last choice'), 'resident card should show the last choice');
    assert.ok(cardText.includes('Test Canteen'), 'resident card should quote the why line');
    await screenshot('resident-choice.png');
}
