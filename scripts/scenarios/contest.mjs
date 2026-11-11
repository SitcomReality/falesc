/**
 * Contest preview: two rival chapters share the home shard, residents choose
 * their services, and the HUD/report expose Devotion and patronage standings.
 */
export default async function ({ page, assert, screenshot, log }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.click('[data-testid=menu-start]');
    await page.waitFor("document.querySelector('[data-testid=lobby-screen]') !== null");
    await page.evaluate("(() => { const i=document.querySelector('[data-testid=lobby-seed]'); i.value='12345'; i.dispatchEvent(new Event('change',{bubbles:true})); const m=document.querySelector('[data-testid=lobby-mode]'); m.value='contest'; m.dispatchEvent(new Event('change',{bubbles:true})); return m.value; })()");
    await page.click('[data-testid=lobby-start]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    await page.pause(300);
    await screenshot('contest-hud.png');

    const founded = await page.evaluate("window.__falesc.snapshot()");
    log(JSON.stringify({ mode: founded.mode, rivals: founded.rivalCount, allServices: founded.allServices, chapters: founded.chapters }));
    assert.equal(founded.mode, 'contest');
    assert.equal(founded.rivalCount, 2, 'two rival chapters should exist');
    assert.equal(founded.allServices, 6, 'Welcome Post, rival housing/services and the reserved Commons Beacon');
    assert.equal(founded.chapters.length, 3);
    assert.equal(founded.chapters.find((chapter) => chapter.id === 'gardener').residents, 3, 'each chapter should start with three residents');
    assert.ok(await page.visible('[data-testid=standings-card]'), 'the Devotion standings should be visible');

    const rival = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const service = app.charter.rivals[0].services.services[0];
        const point = app.world.homeSector._project(service.u + 0.5, service.v + 0.5);
        app.onWorldTap(point.x, point.y);
        return { id: service.id, chapter: service.chapterName, program: service.programId };
    })()`);
    assert.ok(await page.visible('[data-testid=structure-modal]'));
    const rivalCard = await page.text('[data-testid=structure-modal]');
    assert.ok(rivalCard.includes('The Gardener'), 'the rival service card should name its chapter');
    assert.ok(rivalCard.includes('Rival service'), 'the rival service must not be dismantlable');
    await page.click('[data-testid=structure-cancel]');

    await page.evaluate("window.__falesc.openResident('r01')");
    await page.waitFor("window.__falesc.snapshot().residentCardOpen === true");
    const residentCard = await page.text('[data-testid=resident-modal]');
    assert.ok(residentCard.includes('Favourite'), 'the contest resident card should show a favourite chapter');
    assert.ok(residentCard.includes('The Host') || residentCard.includes('The Gardener'), 'the contest card should show rival hearts');
    await screenshot('contest-resident.png');
    await page.click('[data-testid=resident-close]');

    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    await page.pause(300);
    const dayOne = await page.evaluate("window.__falesc.snapshot()");
    log(JSON.stringify({ dayOne: dayOne.report, standings: dayOne.chapters }));
    assert.ok(dayOne.report.visits > 0, 'residents should visit the rival services');
    assert.ok((dayOne.report.patronageByChapter.host || 0) > 0, 'the Host should receive patronage');
    assert.ok(dayOne.report.chapters.find((chapter) => chapter.id === 'gardener').upkeep >= 4, 'rivals should pay upkeep');
    assert.ok(dayOne.chapters.find((chapter) => chapter.id === 'host').devotion > 0, 'the Host should gain Devotion');
    assert.ok(await page.visible('[data-testid=report-screen]'));
    await screenshot('contest-report.png');

    await page.evaluate("window.__falesc.beginNextDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    await page.click('[data-testid=patronage-toggle]');
    await page.pause(300);
    const flows = await page.evaluate("window.__falesc.snapshot()");
    log(JSON.stringify({ flows: { visible: flows.patronageVisible, lines: flows.patronageLines } }));
    assert.ok(flows.patronageVisible, 'the patronage flow overlay should toggle on');
    assert.ok(flows.patronageLines > 0, 'the overlay should draw at least one last-choice arc');
    await screenshot('contest-flows.png');
    await page.click('[data-testid=patronage-toggle]');

    const built = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        app.selectProgram('canteen');
        const cell = window.__falesc.findFreeCell('canteen');
        app.onWorldTap(cell.x, cell.y);
        const result = app.finalizeBuild('Our Canteen');
        app.buildModal.hide(false);
        return { result, rivalMoves: app.charter.lastRivalMoves, standings: app.charter.standings() };
    })()`);
    log(JSON.stringify({ built }));
    assert.ok(built.result.ok, 'the player should still be able to build on the shared shard');
    assert.ok(built.rivalMoves.length > 0, 'a rival should make a move at the start of the day');

    // The Canteen opens overnight; day 3 is the first day it can earn visits.
    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    await page.evaluate("window.__falesc.beginNextDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    const dayThree = await page.evaluate("window.__falesc.snapshot()");
    const canteen = dayThree.services.find((service) => service.programId === 'canteen');
    log(JSON.stringify({ dayThree: dayThree.report, canteen }));
    assert.ok(canteen.visits > 0, 'the player response should earn visits');
    assert.ok((dayThree.report.patronageByChapter.player || 0) > 0, 'the player should enter the patronage standings');
    await page.evaluate("window.__falesc.app.saveGame()");
    await page.evaluate("window.__falesc.beginNextDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    await page.pause(300);
    await screenshot('contest-standings.png');

    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.pause(400);
    const restored = await page.evaluate("window.__falesc.snapshot()");
    log(JSON.stringify({ restored: { mode: restored.mode, rivals: restored.rivalCount, allServices: restored.allServices, chapters: restored.chapters } }));
    assert.equal(restored.mode, 'contest', 'contest mode should survive a reload');
    assert.equal(restored.rivalCount, 2, 'rival chapters should restore');
    assert.ok(restored.allServices >= 6, 'rival services and the Commons Beacon should restore');
    assert.equal(restored.chapters.length, 3);
    assert.ok(restored.chapters.find((chapter) => chapter.id === 'host').residents > 3, 'a growing rival should win residents into its housing');
    await page.click('[data-testid=patronage-toggle]');
    await page.pause(200);
    const restoredFlows = await page.evaluate("window.__falesc.snapshot()");
    assert.ok(restoredFlows.patronageVisible, 'the patronage overlay should survive a reload');
    assert.ok(restoredFlows.patronageLines > 0, 'restored residents should still have last-choice arcs');
    await page.click('[data-testid=patronage-toggle]');

    await page.evaluate("window.__falesc.app.charter.day = window.__falesc.app.charter.dayLimit");
    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    const final = await page.evaluate("window.__falesc.snapshot()");
    log(JSON.stringify({ final: { outcome: final.report.outcome, confluenceReady: final.confluenceReady } }));
    assert.equal(final.report.outcome, 'confluence', 'the day limit should convene the Confluence');
    assert.equal(final.confluenceReady, true);
    await page.evaluate("window.__falesc.app.saveGame()");
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    const limitRestored = await page.evaluate("window.__falesc.snapshot()");
    assert.equal(limitRestored.confluenceReady, true, 'the pending Confluence should survive a reload');
    await page.click('[data-testid=report-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'CONFLUENCE'");
    assert.ok(await page.visible('[data-testid=confluence-screen]'));
    await page.evaluate("document.querySelector('[data-testid=pledge-company]').click()");
    await screenshot('confluence.png');
    await page.click('[data-testid=confluence-vote]');
    await page.waitFor("document.querySelector('[data-testid=confluence-result]') !== null");
    const vote = await page.evaluate("(() => { const app=window.__falesc.app; return { ending: app.charter.ending, resultKeys: app.confluenceScreen.result ? Object.keys(app.confluenceScreen.result) : null, countsKeys: app.confluenceScreen.result ? Object.keys(app.confluenceScreen.result.counts) : null, counts: app.confluenceScreen.result?.counts, endingVotes: app.charter.ending?.confluence?.votes, result: app.confluenceScreen.result ? { pledge: app.confluenceScreen.result.pledge.id, votes: app.confluenceScreen.result.votes.length } : null }; })()");
    log(JSON.stringify({ vote }));
    assert.ok(vote.result, 'the Confluence should tally a result');
    assert.equal(vote.result.votes, final.population, 'every active resident should vote');
    assert.ok(['victory', 'defeat'].includes(vote.ending.outcome));
    await screenshot('confluence-result.png');
    await page.click('[data-testid=confluence-close]');
    await page.waitFor("window.__falesc.snapshot().state === 'STEWARDSHIP'");
    assert.ok(await page.visible('[data-testid=stewardship-screen]'));
    await screenshot('stewardship.png');
    await page.evaluate("document.querySelector('[data-testid=stewardship-universal_care]').click()");
    await page.click('[data-testid=stewardship-confirm]');
    await page.waitFor("window.__falesc.snapshot().state === 'END'");
    assert.ok(await page.visible('[data-testid=end-screen]'));
    const stewardship = await page.evaluate("window.__falesc.app.charter.ending.stewardship");
    assert.equal(stewardship.id, 'universal_care');
}
