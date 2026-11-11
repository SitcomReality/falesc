/**
 * The Commons Assembly: each chapter nominates a policy, every resident votes,
 * and the winner applies to existing and future services.
 */
export default async function ({ page, assert, log, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'contest')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    const built = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        app.charter.player.lumen = 50;
        app.charter.works = 5;
        for (const programId of ['canteen', 'garden_dome', 'housing']) {
            const cell = window.__falesc.findFreeCell(programId);
            if (!cell) return { ok: false, reason: programId + ' has no plot' };
            const result = app.charter.build({ programId, sectorId: cell.sectorId, u: cell.u, v: cell.v, name: programId === 'garden_dome' ? 'Assembly Garden' : programId === 'housing' ? 'Assembly House' : 'Assembly Canteen' });
            if (!result.ok) return { ok: false, reason: result.reason };
        }
        app.syncViews();
        const capacity = {};
        for (const programId of ['canteen', 'garden_dome', 'housing']) {
            capacity[programId] = app.charter.services.services.find((service) => service.programId === programId)?.capacity;
        }
        return { ok: true, capacity, lumen: app.charter.player.lumen };
    })()`);
    assert.equal(built.ok, true, built.reason || 'the assembly test services should build');
    log(JSON.stringify({ built }));

    await page.evaluate("window.__falesc.app.charter.player.lumen = 30; window.__falesc.app.gameScreen.updateHud(true); window.__falesc.app.showCommons()");
    await page.click('[data-testid=commons-give-10]');
    await page.click('[data-testid=commons-give-10]');
    const lit = await page.evaluate("window.__falesc.snapshot()");
    assert.equal(lit.commons.active, true);
    assert.equal(lit.commons.assembly.stage, 'nominations');
    assert.ok(lit.commons.assembly.petition?.policyId, 'residents should have a petition');
    assert.ok(lit.commons.assembly.petition.signatures > 0);
    assert.ok(await page.text('[data-testid=commons-modal]').then((text) => text.includes("Residents' petition")));
    await page.click('[data-testid=commons-policy-open_beds]');
    const ballot = await page.evaluate("window.__falesc.snapshot()");
    log(JSON.stringify({ ballot: ballot.commons.assembly }));
    assert.equal(ballot.commons.assembly.stage, 'ballot');
    assert.equal(ballot.commons.assembly.playerNomination, 'open_beds');
    assert.ok(ballot.commons.assembly.finalists.includes('open_beds'));
    assert.ok(ballot.commons.assembly.finalists.includes(ballot.commons.assembly.petition.policyId));
    assert.ok(ballot.commons.assembly.finalists.length >= 2);
    assert.ok(await page.text('[data-testid=commons-modal]').then((text) => text.includes('Call the vote')));
    await screenshot('commons-assembly-ballot.png');

    await page.click('[data-testid=commons-call-vote]');
    const chosen = await page.evaluate("window.__falesc.snapshot()");
    log(JSON.stringify({ chosen: { policy: chosen.commons.policy, assembly: chosen.commons.assembly } }));
    assert.ok(chosen.commons.policy);
    assert.ok(chosen.commons.assembly.finalists.includes(chosen.commons.policy));
    assert.equal(chosen.commons.assembly.stage, 'resolved');
    assert.equal(chosen.commons.assembly.votes.length, chosen.population);
    assert.equal(chosen.commons.assembly.counts[chosen.commons.policy] > 0, true);
    const expectedProgram = chosen.commons.policy === 'shared_table' ? 'canteen' : chosen.commons.policy === 'open_beds' ? 'housing' : 'garden_dome';
    assert.equal(chosen.services.find((service) => service.programId === expectedProgram)?.capacity, built.capacity[expectedProgram] + 2);
    assert.ok(await page.text('[data-testid=commons-modal]').then((text) => text.includes('The assembly has spoken')));
    await screenshot('commons-assembly-chosen.png');
    await page.click('[data-testid=commons-close]');
    await page.waitFor("window.__falesc.app.commonsModal.isOpen === false");

    const hud = await page.evaluate("document.querySelector('[data-role=commons-name]').textContent");
    assert.ok(hud.includes('Beacon lit'));

    const fresh = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const programId = ${JSON.stringify(expectedProgram)};
        app.charter.works = 2;
        const cell = window.__falesc.findFreeCell(programId);
        if (!cell) return { ok: false, reason: 'no plot' };
        const result = app.charter.build({ programId, sectorId: cell.sectorId, u: cell.u, v: cell.v, name: 'Second Assembly Build' });
        app.syncViews();
        return { ok: result.ok, capacity: app.charter.services.services.at(-1)?.capacity };
    })()`);
    assert.equal(fresh.ok, true, fresh.reason);
    assert.equal(fresh.capacity, built.capacity[expectedProgram] + 2, 'new builds inherit the ballot winner');

    await page.evaluate("window.__falesc.app.saveGame()");
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    const restored = await page.evaluate("window.__falesc.snapshot()");
    assert.equal(restored.commons.policy, chosen.commons.policy);
    assert.equal(restored.commons.assembly.stage, 'resolved');

    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    await page.evaluate("window.__falesc.skipDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
    await page.evaluate("window.__falesc.app.beginNextDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    await page.evaluate("window.__falesc.showCommons()");
    await page.waitFor("window.__falesc.app.commonsModal.isOpen === true");
    assert.ok(await page.evaluate("Boolean(document.querySelector('[data-testid=commons-second-reading]'))"));
    await page.click('[data-testid=commons-second-reading]');
    const second = await page.evaluate("window.__falesc.snapshot()");
    assert.equal(second.commons.assembly.reading, 2);
    assert.equal(second.commons.assembly.stage, 'nominations');
    const nextPolicy = chosen.commons.policy === 'open_beds' ? 'commons_garden' : 'open_beds';
    await page.click(`[data-testid=commons-policy-${nextPolicy}]`);
    await page.click('[data-testid=commons-call-vote]');
    const chosenAgain = await page.evaluate("window.__falesc.snapshot()");
    log(JSON.stringify({ secondPolicy: chosenAgain.commons.policy, reading: chosenAgain.commons.assembly.reading }));
    assert.equal(chosenAgain.commons.assembly.reading, 2);
    assert.equal(chosenAgain.commons.assembly.stage, 'resolved');
    assert.ok(chosenAgain.services.find((service) => service.programId === 'canteen').capacity <= built.capacity.canteen + 2, 'policy capacity does not stack across readings');
    await screenshot('commons-second-reading.png');
    await page.click('[data-testid=commons-close]');
    await page.pause(400);
}
