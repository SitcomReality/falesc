/**
 * The first Commons Assembly chooses one shared policy after the Beacon is lit.
 * Open Beds is checked on the existing and newly built Welcome Houses.
 */
export default async function ({ page, assert, log, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'contest')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    const before = await page.evaluate("({ snapshot: window.__falesc.snapshot(), housing: window.__falesc.app.charter.services.services.find(s => s.programId === 'housing')?.capacity })");
    assert.equal(before.housing, 4, 'the starting Welcome House sleeps four');
    assert.equal(before.snapshot.commons.policy, null, 'no assembly has been held');

    await page.evaluate("window.__falesc.app.charter.player.lumen = 30; window.__falesc.app.gameScreen.updateHud(true); window.__falesc.app.showCommons()");
    await page.click('[data-testid=commons-give-10]');
    await page.click('[data-testid=commons-give-10]');
    const lit = await page.evaluate("window.__falesc.snapshot()");
    assert.equal(lit.commons.active, true);
    assert.ok(await page.text('[data-testid=commons-modal]').then((text) => text.includes('first assembly')));
    await screenshot('commons-assembly.png');

    await page.click('[data-testid=commons-policy-open_beds]');
    const chosen = await page.evaluate("({ snapshot: window.__falesc.snapshot(), housing: window.__falesc.app.charter.services.services.find(s => s.programId === 'housing')?.capacity })");
    log(JSON.stringify({ chosen: { policy: chosen.snapshot.commons.policy, housing: chosen.housing, spareBeds: chosen.snapshot.spareBeds } }));
    assert.equal(chosen.snapshot.commons.policy, 'open_beds');
    assert.equal(chosen.housing, 6, 'Open Beds adds two beds to the existing Welcome House');
    assert.equal(chosen.snapshot.spareBeds, before.snapshot.spareBeds + 2);
    assert.ok(await page.text('[data-testid=commons-modal]').then((text) => text.includes('Open Beds')));
    await screenshot('commons-assembly-chosen.png');
    await page.click('[data-testid=commons-close]');
    await page.waitFor("window.__falesc.app.commonsModal.isOpen === false");
    const hud = await page.evaluate("document.querySelector('[data-role=commons-name]').textContent");
    assert.ok(hud.includes('Open Beds'));

    const built = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const cell = window.__falesc.findFreeCell('housing');
        if (!cell) return { ok: false };
        const result = app.charter.build({ programId: 'housing', sectorId: cell.sectorId, u: cell.u, v: cell.v, name: 'Open House' });
        app.syncViews();
        return { ok: result.ok, capacity: app.charter.services.services.at(-1)?.capacity };
    })()`);
    assert.equal(built.ok, true);
    assert.equal(built.capacity, 6, 'new houses also inherit the assembly policy');

    await page.evaluate("window.__falesc.app.saveGame()");
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    const restored = await page.evaluate("window.__falesc.snapshot()");
    assert.equal(restored.commons.policy, 'open_beds');
    assert.equal(restored.services.find((service) => service.programId === 'housing')?.capacity, 6);
    await page.pause(400);
}
