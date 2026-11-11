/**
 * Milestones are a read-only checklist of charter firsts. They grant nothing and
 * are available from the pause menu.
 */
export default async function ({ page, assert, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2'); localStorage.setItem('falesc.milestones.v1', JSON.stringify(['full_house']))");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'first-light')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");
    const built = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const cell = window.__falesc.findFreeCell('canteen');
        const result = app.charter.build({ programId: 'canteen', sectorId: cell.sectorId, u: cell.u, v: cell.v, name: 'Milestone Canteen' });
        app.syncViews();
        return { ok: result.ok, milestones: app.charter.milestones() };
    })()`);
    assert.equal(built.ok, true);
    assert.ok(built.milestones.find((entry) => entry.id === 'first_build').done);
    assert.equal(built.milestones.find((entry) => entry.id === 'full_house').done, false);

    await page.click('[data-testid=hud-menu]');
    await page.click('[data-testid=open-milestones]');
    await page.waitFor("window.__falesc.app.milestones.isOpen === true");
    const text = await page.text('[data-testid=milestones]');
    assert.ok(text.includes('Firsts and foundations'));
    assert.ok(text.includes('Raise a service'));
    assert.ok(text.includes('House twelve Tidelanders'));
    assert.ok(text.includes('earned'));
    const done = await page.evaluate("document.querySelectorAll('.milestones__list li.is-done').length");
    assert.ok(done >= 1);
    assert.ok(await page.visible('.milestones__list li.is-earned'));
    await page.pause(300);
    await screenshot('milestones.png');
    await page.click('[data-testid=milestones-done]');
    await page.waitFor("window.__falesc.app.milestones.isOpen === false");
    await page.pause(300);
}
