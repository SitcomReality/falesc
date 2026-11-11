/**
 * Full First Light charter: plan services, open fourteen days, and reach the
 * twelve-resident / flourishing-62 goal. This is the end-to-end loop, not a
 * unit test.
 */
export default async function ({ page, assert, screenshot, log }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    const history = [];
    for (let guard = 0; guard < 20; guard++) {
        const state = await page.evaluate("window.__falesc.snapshot().state");
        if (state === 'END') break;
        if (state === 'REPORT') {
            await page.click('[data-testid=report-continue]');
            await page.waitFor("['PLAYING','END'].includes(window.__falesc.snapshot().state)");
            if (await page.evaluate("window.__falesc.snapshot().state") === 'END') break;
        }
        await page.evaluate("(() => { const app = window.__falesc.app; if (app.bulletinModal.isOpen) app.bulletinModal.hide(); return true; })()");

        const plan = await page.evaluate(`(() => {
            const app = window.__falesc.app;
            const built = [];
            const count = (programId) => app.charter.services.services.filter((service) => service.programId === programId).length;
            const wanted = () => {
                if (count('canteen') < 1) return 'canteen';
                if (count('housing') < 3) return 'housing';
                if (count('garden_dome') < 1) return 'garden_dome';
                if (count('tea_house') < 1) return 'tea_house';
                if (count('housing') < 4) return 'housing';
                if (count('tea_house') < 2) return 'tea_house';
                return null;
            };
            for (let attempt = 0; attempt < 2; attempt++) {
                if (app.charter.works <= 0) break;
                const programId = wanted();
                if (!programId) break;
                if (!app.charter.canBuild(programId).ok) break;
                app.selectProgram(programId);
                const cell = window.__falesc.findFreeCell(programId);
                if (!cell) break;
                app.onWorldTap(cell.x, cell.y);
                const result = app.finalizeBuild(programId);
                app.buildModal.hide(false);
                if (!result.ok) break;
                built.push(programId);
            }
            return {
                built,
                snapshot: window.__falesc.snapshot()
            };
        })()`);
        history.push({ day: plan.snapshot.day, built: plan.built, lumen: plan.snapshot.lumen, population: plan.snapshot.population, flourishing: plan.snapshot.flourishing });

        await page.evaluate("window.__falesc.openDay()");
        await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
        await page.evaluate("window.__falesc.skipDay()");
        await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
        const report = await page.evaluate("window.__falesc.snapshot().report");
        history[history.length - 1].report = report;
        if (report?.outcome) break;
        await page.click('[data-testid=report-continue]');
        await page.waitFor("['PLAYING','END'].includes(window.__falesc.snapshot().state)");
        if (await page.evaluate("window.__falesc.snapshot().state") === 'END') break;
    }

    if (await page.evaluate("window.__falesc.snapshot().state") === 'REPORT') {
        await page.click('[data-testid=report-continue]');
        await page.waitFor("window.__falesc.snapshot().state === 'END'");
    }

    const final = await page.evaluate("window.__falesc.snapshot()");
    log(JSON.stringify({ history, final: { day: final.day, state: final.state, population: final.population, flourishing: final.flourishing, devotion: final.devotion, ending: final.ending } }));
    assert.equal(final.state, 'END', 'the charter should end after the day limit or a result');
    assert.equal(final.ending?.outcome, 'victory', 'the First Light run should reach twelve residents and flourishing');
    assert.ok(await page.visible('[data-testid=end-screen]'));
    assert.ok((await page.text('[data-testid=end-screen] [data-role=title]')).length > 0);
    const record = await page.text('[data-testid=end-screen]');
    assert.ok(record.includes('Peak residents'));
    assert.ok(record.includes('Total visits'));
    await screenshot('victory.png');
}
