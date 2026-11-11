/**
 * Deterministic day: same seed, same actions and same day number must produce
 * the same report, resident needs and choice lines across reloads.
 */
export default async function ({ page, assert, log }) {
    async function run(seed) {
        await page.evaluate("localStorage.removeItem('falesc.save.v2')");
        await page.reload();
        await page.evaluate(`window.__falesc.startCharter(${seed}, 'medium')`);
        await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
        await page.evaluate("window.__falesc.app.bulletinModal.hide()");
        await page.evaluate(`(() => {
            const app = window.__falesc.app;
            app.selectProgram('canteen');
            const cell = window.__falesc.findFreeCell('canteen');
            app.onWorldTap(cell.x, cell.y);
            app.finalizeBuild('Deterministic Canteen');
            app.buildModal.hide(false);
            return true;
        })()`);
        for (let day = 1; day <= 2; day++) {
            await page.evaluate("window.__falesc.openDay()");
            await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
            await page.evaluate("window.__falesc.skipDay()");
            await page.waitFor("window.__falesc.snapshot().state === 'REPORT'");
            await page.evaluate("window.__falesc.beginNextDay()");
            await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
            await page.evaluate("window.__falesc.app.bulletinModal.hide()");
        }
        return page.evaluate(`(() => {
            const s = window.__falesc.snapshot();
            return {
                day: s.day,
                report: s.report,
                residents: s.residents,
                services: s.services.map((service) => ({ programId: service.programId, visits: service.visits, hearts: service.hearts })),
                quotes: s.report?.quotes
            };
        })()`);
    }

    const first = await run(777123);
    const second = await run(777123);
    const a = JSON.stringify(first);
    const b = JSON.stringify(second);
    log(`compared ${first.residents.length} residents and a ${first.report?.visits ?? 0}-visit report`);
    if (a !== b) {
        let index = 0;
        while (index < a.length && a[index] === b[index]) index++;
        log(`first difference at ${index}: ...${a.slice(Math.max(0, index - 100), index + 140)}... vs ...${b.slice(Math.max(0, index - 100), index + 140)}...`);
    }
    assert.equal(a, b, 'same seed + actions + day must produce the same result');
}
