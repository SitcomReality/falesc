/**
 * Rivals can spend the shared capital budget on commons works. They choose from
 * their own program palette, pay from capital rather than their private lumen,
 * and their name stays on the builder line.
 */
export default async function ({ page, assert, log, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'contest')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    await page.evaluate("window.__falesc.app.charter.player.lumen = 30; window.__falesc.app.charter.contributeCapital(10)");
    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    await page.evaluate("window.__falesc.app.beginNextDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    const result = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const charter = app.charter;
        const works = charter.sharedWorkServices().map((service) => ({ id: service.id, name: service.name, builder: service.builderChapterId, state: service.state, cost: service.program.cost }));
        return { capital: charter.commons.capital, works, moves: charter.lastRivalMoves?.map((move) => move.action) };
    })()`);
    log(JSON.stringify({ result }));
    assert.ok(result.works.length >= 1, 'a rival should build on the commons');
    assert.ok(result.works.every((work) => work.builder === 'gardener' || work.builder === 'host'));
    assert.ok(result.works.some((work) => work.builder !== 'player'));
    assert.ok(result.capital < 10);
    assert.ok(result.moves.some((action) => action.includes('commons')));
    await page.evaluate("window.__falesc.app.saveGame()");
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    const restored = await page.evaluate("window.__falesc.app.charter.sharedWorkServices().map((service) => ({ name: service.name, builder: service.builderChapterId }))");
    assert.equal(restored.length, result.works.length);
    assert.deepEqual(restored, result.works.map((work) => ({ name: work.name, builder: work.builder })));
    await page.evaluate(`(() => { const app = window.__falesc.app; const service = app.charter.sharedWorkServices().find((entry) => entry.id === ${JSON.stringify(result.works[0].id)}); app.serviceCard.show(service); })()`);
    await page.waitFor("window.__falesc.app.serviceCard.isOpen === true");
    assert.ok(await page.text('[data-testid=structure-modal]').then((text) => text.includes('Built by')));
    await page.pause(300);
    await screenshot('commons-rival-work.png');
    await page.click('[data-testid=structure-close]');
}
