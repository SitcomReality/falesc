/**
 * A charmed visitor can be offered a spare bed and becomes a resident.
 */
export default async function ({ page, assert, log, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'contest')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    const built = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const built = [];
        for (const [programId, name] of [['canteen', 'Our Canteen'], ['housing', 'Our Second House']]) {
            const cell = window.__falesc.findFreeCell(programId);
            if (!cell) { built.push({ programId, ok: false, reason: 'no plot' }); continue; }
            const result = app.charter.build({
                programId, sectorId: cell.sectorId, u: cell.u, v: cell.v,
                name
            });
            built.push({ programId, ok: result.ok, reason: result.reason || null });
        }
        app.syncViews();
        return { ok: built.every((entry) => entry.ok), reason: built.map((entry) => entry.reason).filter(Boolean).join(', ') || null, built };
    })()`);
    assert.equal(built.ok, true, 'the player canteen and second house should break ground');

    for (let day = 1; day <= 2; day++) {
        await page.evaluate("window.__falesc.openDay()");
        await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
        await page.evaluate("window.__falesc.skipDay()");
        await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
        if (day === 1) {
            await page.evaluate("window.__falesc.app.beginNextDay()");
            await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
            await page.evaluate("window.__falesc.app.bulletinModal.hide()");
        }
    }

    const before = await page.evaluate("({ snapshot: window.__falesc.snapshot(), visitors: window.__falesc.app.charter.visitors.map(v => ({ id: v.id, name: v.name, affinity: v.getAffinity('player'), visits: v.memory.recentVisits.length })) })");
    log(JSON.stringify({ before: { population: before.snapshot.population, visitors: before.visitors } }));
    assert.ok(before.visitors.length >= 2, 'day two should have visitors');
    assert.ok(before.visitors.some((visitor) => visitor.affinity >= 0.15), 'at least one visitor should be charmed by the player canteen');
    const visitorId = await page.evaluate("document.querySelector('[data-testid=invite-visitor]')?.dataset.visitorId || null");
    assert.ok(visitorId, 'the report should offer a bed to a charmed visitor');
    await page.click(`[data-testid=visitor-open][data-visitor-id="${visitorId}"]`);
    await page.waitFor("window.__falesc.app.visitorCard.isOpen === true");
    const cardText = await page.text('[data-testid=visitor-card]');
    assert.ok(cardText.includes('Player affinity'));
    assert.ok(cardText.includes('Offer a trial stay'));
    assert.ok(await page.visible('.visitor-card__avatar'));
    const history = await page.text('[data-testid=visitor-history]');
    assert.ok(history.length > 0);
    await screenshot('visitor-card.png');
    await page.click('[data-testid=visitor-close]');
    await page.waitFor("window.__falesc.app.visitorCard.isOpen === false");
    await page.evaluate("document.querySelector('[data-testid=invite-visitor]').scrollIntoView({block:'center'})");
    await page.pause(200);
    await screenshot('visitor-stay-offer.png');

    const beforeCount = before.snapshot.population;
    const beforeVisitors = before.visitors.length;
    const beforeSpare = before.snapshot.spareBeds;
    await page.click('[data-testid=invite-visitor]');
    const after = await page.evaluate("window.__falesc.snapshot()");
    log(JSON.stringify({ after: { population: after.population, visitors: after.visitors, spareBeds: after.spareBeds } }));
    const afterState = await page.evaluate("({ population: window.__falesc.app.charter.population, trial: window.__falesc.app.charter.trialVisitors.length })");
    assert.equal(afterState.population, beforeCount, 'the trial stay does not join the population yet');
    assert.equal(after.visitors, beforeVisitors - 1, 'the visitor stops being a visitor');
    assert.equal(after.spareBeds, beforeSpare - 1, 'one spare bed is used');
    assert.equal(afterState.trial, 1, 'the visitor starts a one-day trial');
    assert.ok(await page.text('[data-testid=report-screen]').then((text) => text.includes('On trial')));
    await page.evaluate("document.querySelector('[data-testid=report-screen] .report__sheet').scrollTop = 0");
    await page.pause(200);
    await screenshot('visitor-stay-report.png');

    await page.evaluate("window.__falesc.app.saveGame()");
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    const restored = await page.evaluate("window.__falesc.snapshot()");
    assert.equal(restored.population, beforeCount, 'the trial state should survive a reload');
    const restoredTrial = await page.evaluate("window.__falesc.app.charter.trialVisitors.length");
    assert.equal(restoredTrial, 1);
    await page.evaluate("window.__falesc.app.beginNextDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    assert.equal(await page.evaluate("window.__falesc.app.charter.trialVisitors.length"), 1);

    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    assert.ok(await page.text('[data-testid=report-screen]').then((text) => text.includes('On trial')));
    await page.evaluate("window.__falesc.app.beginNextDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    const resolved = await page.evaluate("({ population: window.__falesc.app.charter.population, trial: window.__falesc.app.charter.trialVisitors.length })");
    log(JSON.stringify({ resolved }));
    assert.equal(resolved.trial, 0, 'the trial resolves at the next day');
    assert.ok(resolved.population >= beforeCount + 1, 'the trial guest joins the resident population');
    const becameResident = await page.evaluate(`window.__falesc.app.charter.roster.some((resident) => resident.id === ${JSON.stringify(visitorId)})`);
    assert.equal(becameResident, true, 'the trial guest is on the roster');
    await page.pause(400);
    assert.ok(visitorId);
}
