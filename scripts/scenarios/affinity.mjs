/**
 * Crystal affinity regression: a harvest structure built near a crystal earns
 * +1 lumen per tide, the dialog announces it, and the bonus survives a reload.
 */
export default async function ({ page, assert, screenshot, log }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v1')");
    await page.reload();
    await page.click('[data-testid=menu-start]');
    await page.waitFor("document.querySelector('[data-testid=lobby-screen]') !== null");
    await page.evaluate("(() => { const i=document.querySelector('[data-testid=lobby-seed]'); i.value='12345'; i.dispatchEvent(new Event('change',{bubbles:true})); return true; })()");
    await page.click('[data-testid=lobby-start]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");

    const target = await page.evaluate(`(() => {
        const g = window.__falesc.app;
        const crystals = g.minerals.filter((m) => m.type === 'CRYSTAL');
        for (const sector of g.map.sectors) {
            for (let v = 0; v < sector.gridSize; v++) {
                for (let u = 0; u < sector.gridSize; u++) {
                    if (g.buildingManager.isCellOccupied(sector.id, u, v)) continue;
                    const pos = sector._project(u + 0.5, v + 0.5);
                    const near = crystals.find((c) => Math.hypot(c.x - pos.x, c.y - pos.y) <= 460);
                    if (near) {
                        g.stateManager.lumen = 99;
                        g.stateManager.actionsRemaining = 1;
                        g.selectBlueprint('prism_rig');
                        g.onWorldTap(pos.x, pos.y);
                        return { sectorId: sector.id, u, v, pos, distance: Math.hypot(near.x - pos.x, near.y - pos.y) };
                    }
                }
            }
        }
        return null;
    })()`);
    log(JSON.stringify(target));
    assert.ok(target, 'expected at least one free plot within 460px of a crystal');
    assert.ok(await page.visible('[data-testid=build-modal]'));
    const modalText = await page.text('[data-testid=build-modal]');
    assert.ok(modalText.includes('Crystal +1'), 'build dialog should announce crystal affinity');
    await page.click('[data-testid=build-submit]');
    await page.pause(200);

    const built = await page.evaluate(`(() => {
        const g = window.__falesc.app;
        const b = g.buildingManager.buildings[0];
        const pendingIncome = window.__falesc.snapshot().income;
        b.state = 'ACTIVE';
        b.container.alpha = 1;
        b.updateGraphics();
        g.stateManager.activeScreen.updateTurnDisplay(true);
        return { income: b.income, bonus: b.bonusIncome, pendingIncome, activeIncome: window.__falesc.snapshot().income };
    })()`);
    log(JSON.stringify(built));
    assert.equal(built.bonus, 1);
    assert.equal(built.income, 3);
    assert.equal(built.pendingIncome, 0, 'a pending structure should not produce income yet');
    assert.equal(built.activeIncome, 3);

    // The affinity is model data and must survive a save/continue cycle.
    await page.evaluate("window.__falesc.app.saveGame()");
    await page.reload();
    await page.waitFor("window.__falesc.snapshot().state === 'MENU'");
    await page.click('[data-testid=menu-continue]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    const restored = await page.evaluate(`(() => {
        const b = window.__falesc.app.buildingManager.buildings[0];
        return b ? { income: b.income, bonus: b.bonusIncome } : null;
    })()`);
    log(JSON.stringify(restored));
    assert.equal(restored.bonus, 1);
    assert.equal(restored.income, 3);
    await screenshot('affinity.png');
}
