/** Inspect and dismantle a structure, with a half-cost refund. */
export default async function ({ page, assert, screenshot, log }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v1')");
    await page.reload();
    await page.click('[data-testid=menu-start]');
    await page.waitFor("document.querySelector('[data-testid=lobby-screen]') !== null");
    await page.evaluate("(() => { const i=document.querySelector('[data-testid=lobby-seed]'); i.value='12345'; i.dispatchEvent(new Event('change',{bubbles:true})); return true; })()");
    await page.click('[data-testid=lobby-start]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");

    const cell = await page.evaluate("window.__falesc.findFreeCell()");
    await page.evaluate(`(() => { window.__falesc.app.onWorldTap(${cell.x}, ${cell.y}); return true; })()`);
    await page.click('[data-testid=build-submit]');
    await page.pause(150);

    const afterBuild = await page.evaluate("window.__falesc.snapshot()");
    assert.equal(afterBuild.buildings, 1);
    assert.equal(afterBuild.lumen, 5);

    await page.evaluate(`(() => { window.__falesc.app.onWorldTap(${cell.x}, ${cell.y}); return true; })()`);
    assert.ok(await page.visible('[data-testid=structure-modal]'), 'clicking an occupied plot should inspect the structure');
    await screenshot('demolition-dialog.png');
    await page.click('[data-testid=structure-demolish]');
    await page.pause(200);

    const afterDemolish = await page.evaluate("window.__falesc.snapshot()");
    log(JSON.stringify({ lumenBefore: afterBuild.lumen, lumenAfter: afterDemolish.lumen, buildings: afterDemolish.buildings }));
    assert.equal(afterDemolish.buildings, 0);
    assert.equal(afterDemolish.lumen, 6, 'demolition should refund half the 3-lumen cost');

    // The plot is free again in the model; the build action is still spent.
    const free = await page.evaluate(`(() => {
        const g = window.__falesc.app;
        return !g.buildingManager.isCellOccupied(${cell.sectorId}, ${cell.u}, ${cell.v});
    })()`);
    assert.equal(free, true, 'the demolished plot should be free again');
}
