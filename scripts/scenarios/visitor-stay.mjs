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
    await page.evaluate("document.querySelector('[data-testid=invite-visitor]').scrollIntoView({block:'center'})");
    await page.pause(200);
    await screenshot('visitor-stay-offer.png');

    const beforeCount = before.snapshot.population;
    const beforeVisitors = before.visitors.length;
    const beforeSpare = before.snapshot.spareBeds;
    await page.click('[data-testid=invite-visitor]');
    const after = await page.evaluate("window.__falesc.snapshot()");
    log(JSON.stringify({ after: { population: after.population, visitors: after.visitors, spareBeds: after.spareBeds } }));
    assert.equal(after.population, beforeCount + 1, 'the visitor joins the resident population');
    assert.equal(after.visitors, beforeVisitors - 1, 'the visitor stops being a visitor');
    assert.equal(after.spareBeds, beforeSpare - 1, 'one spare bed is used');
    assert.ok(await page.text('[data-testid=report-screen]').then((text) => text.includes('chose a bed and stayed')));
    await page.evaluate("document.querySelector('[data-testid=report-screen] .report__sheet').scrollTop = 0");
    await page.pause(200);
    await screenshot('visitor-stay-report.png');

    await page.evaluate("window.__falesc.app.saveGame()");
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    const restored = await page.evaluate("window.__falesc.snapshot()");
    assert.equal(restored.population, beforeCount + 1, 'the new resident should survive a reload');
    assert.ok(visitorId);
}
