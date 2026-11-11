/**
 * The shared capital budget lets every chapter's gifts pay for a commons work
 * before the player's own lumen is touched.
 */
export default async function ({ page, assert, log, screenshot }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium', 'contest')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    const before = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        app.charter.player.lumen = 30;
        app.gameScreen.updateHud(true);
        app.showCommons();
        return { lumen: app.charter.player.lumen };
    })()`);
    await page.click('[data-testid=commons-capital-10]');
    await page.waitFor("window.__falesc.app.charter.commons.capital >= 10");
    const funded = await page.evaluate("({ capital: window.__falesc.app.charter.commons.capital, lumen: window.__falesc.app.charter.player.lumen })");
    log(JSON.stringify({ funded }));
    assert.equal(funded.capital, 10);
    assert.equal(funded.lumen, before.lumen - 10);
    await screenshot('commons-capital-offer.png');
    await page.click('[data-testid=commons-close-x]');

    const built = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        const charter = app.charter;
        const sector = charter.commonsSector;
        for (let v = 0; v < sector.gridSize; v++) {
            for (let u = 0; u < sector.gridSize; u++) {
                if (!charter.services.canPlace('canteen', sector.id, u, v).ok) continue;
                const result = charter.build({ programId: 'canteen', sectorId: sector.id, u, v, name: 'Capital Kitchen' });
                if (!result.ok) return { ok: false, reason: result.reason };
                return { ok: true, id: result.service.id, cost: result.cost, funded: result.funded, capital: charter.commons.capital, playerLumen: charter.player.lumen };
            }
        }
        return { ok: false, reason: 'no free commons cell' };
    })()`);
    log(JSON.stringify({ built }));
    assert.equal(built.ok, true, built.reason);
    assert.equal(built.cost, 4);
    assert.equal(built.funded, 4);
    assert.equal(built.capital, 6);
    assert.equal(built.playerLumen, before.lumen - 10);

    await page.evaluate("window.__falesc.app.saveGame()");
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    const restored = await page.evaluate("({ capital: window.__falesc.app.charter.commons.capital, service: window.__falesc.app.charter.commonsManager.services.some((service) => service.chapterId === 'commons' && service.name === 'Capital Kitchen') })");
    assert.equal(restored.capital, 6);
    assert.equal(restored.service, true);
    await page.pause(400);
}
