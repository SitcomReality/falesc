/**
 * Full-loop victory scenario: follow a sensible build order until the Aurora
 * Beacon activates, driving the real HUD and build dialog.
 */
export default async function ({ page, assert, screenshot, log }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v1')");
    await page.reload();
    await page.click('[data-testid=menu-start]');
    await page.waitFor("document.querySelector('[data-testid=lobby-screen]') !== null");
    await page.evaluate("(() => { const i = document.querySelector('[data-testid=lobby-seed]'); i.value='12345'; i.dispatchEvent(new Event('change',{bubbles:true})); return true; })()");
    await page.click('[data-testid=lobby-start]');
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING' && window.__falesc.snapshot().sectors > 0");

    const history = [];

    for (let safety = 0; safety < 20; safety++) {
        const snap = await page.evaluate("window.__falesc.snapshot()");
        if (snap.state === 'END') break;
        history.push({ day: snap.turn, lumen: snap.lumen, income: snap.income, blueprints: snap.buildingBlueprints });

        const choice = await page.evaluate(`(() => {
            const app = window.__falesc.app;
            const s = window.__falesc.snapshot();
            const b = app.buildingManager.buildings;
            const count = (id) => b.filter((x) => x.blueprintId === id).length;
            const lanterns = count('lantern_house');
            const beaconCost = Math.max(6, 12 - lanterns * 3);
            const hasBeacon = count('aurora_beacon') > 0;
            const options = [];
            if (!hasBeacon && s.lumen >= beaconCost && (count('prism_rig') + count('tide_garden')) >= 4) options.push('aurora_beacon');
            if (count('prism_rig') < 4) options.push('prism_rig');
            if (count('tide_garden') < 2) options.push('tide_garden');
            if (lanterns < 2) options.push('lantern_house');
            options.push('aurora_beacon', 'tide_garden', 'prism_rig', 'lantern_house');
            for (const id of options) {
                if (app.selectBlueprint(id)) return id;
            }
            return null;
        })()`);

        if (choice) {
            await page.evaluate("(() => { const c = window.__falesc.findFreeCell(); window.__falesc.app.onWorldTap(c.x,c.y); return c; })()");
            await page.click('[data-testid=build-submit]');
            await page.pause(120);
        }

        await page.click('[data-testid=end-turn]');
        await page.waitFor("['PLAYING','END'].includes(window.__falesc.snapshot().state)", 12000);
        await page.waitFor("window.__falesc.snapshot().state !== 'INTERSTITIAL'", 12000);
    }

    const final = await page.evaluate("window.__falesc.snapshot()");
    log(JSON.stringify({ result: final.endResult, day: final.turn, buildings: final.buildingBlueprints, history }));
    assert.equal(final.state, 'END');
    assert.equal(final.endResult.outcome, 'victory');
    assert.ok(await page.visible('[data-testid=end-screen]'));
    assert.equal(await page.text('[data-testid=end-screen] [data-role=title]'), 'The light holds.');
    await screenshot('victory.png');
}
