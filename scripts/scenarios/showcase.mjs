/**
 * Visual showcase: place one of each First Light service on the home shard,
 * mark them open, and capture the illustrated island and HUD for review.
 */
export default async function ({ page, screenshot, log }) {
    await page.evaluate("localStorage.removeItem('falesc.save.v2')");
    await page.reload();
    await page.evaluate("window.__falesc.startCharter(12345, 'medium')");
    await page.waitFor("window.__falesc.snapshot().state === 'PLAYING'");
    await page.evaluate("window.__falesc.app.bulletinModal.hide()");

    const placed = await page.evaluate(`(() => {
        const app = window.__falesc.app;
        app.charter.lumen = 200;
        const ids = ['canteen', 'tea_house', 'garden_dome', 'housing'];
        const placed = [];
        for (const id of ids) {
            app.charter.works = 1;
            app.selectProgram(id);
            const cell = window.__falesc.findFreeCell(id);
            if (!cell) { placed.push({ id, error: 'no cell' }); continue; }
            app.onWorldTap(cell.x, cell.y);
            const result = app.finalizeBuild(id.replaceAll('_', ' '));
            app.buildModal.hide(false);
            placed.push({ id, result, cell });
        }
        for (const service of app.charter.services.services) {
            service.state = 'ACTIVE';
            service.daysRemaining = 0;
            service.refreshGraphics();
        }
        app.charter.works = 2;
        app.charter.lumen = 42;
        app.crowd.sync();
        app.syncViews();
        return { placed, services: app.charter.services.services.map((service) => service.programId) };
    })()`);
    log(JSON.stringify(placed));
    await page.pause(500);
    await screenshot('showcase.png');

    await page.evaluate("window.__falesc.openDay()");
    await page.waitFor("window.__falesc.snapshot().state === 'DAY'");
    await page.pause(1500);
    await screenshot('showcase-day.png');
}
